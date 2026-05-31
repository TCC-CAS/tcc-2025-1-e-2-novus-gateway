# Mercado Pago — Assinaturas Recorrentes

**Data:** 2026-05-30  
**Escopo:** Backend + Frontend — integração completa da API de Assinaturas do MP (`/preapproval`)

---

## Contexto

O VarzeaPro já possui integração com Checkout Pro (pagamento único via `Preference`). Essa integração **não** tem renovação automática — o usuário paga uma vez e o plano fica ativo por 30 dias sem nova cobrança.

Este spec substitui a lógica real do checkout por `PreApproval` (API de Assinaturas do MP), que gerencia cobrança mensal automática, retentativas de cobrança após falha, e ciclo de vida completo da assinatura.

O modo `PAYMENT_MODE=mock` não é alterado — continua ativando o plano diretamente.

---

## Decisão de arquitetura

**PreApproval sem plano associado, status `pending`**

- Backend cria `POST /preapproval` com `status: "pending"` → MP retorna `init_point`
- Usuário clica no link → página hospedada do MP para inserir cartão
- UX idêntica ao Checkout Pro atual (redirecionamento externo → página de sucesso com polling)
- Não requer coleta de dados de cartão no frontend
- MP gerencia renovação mensal, retentativas (até 4x em 10 dias), cancelamento automático após 3 falhas

Alternativas descartadas:
- `preapproval_plan` associado: exigiria card tokenization no frontend (complexidade desnecessária)
- Manter Checkout Pro + cron: não é recorrente real

---

## Ciclo de vida da assinatura

```
[checkout] → PreApproval criada (pending)
    → usuário insere cartão no MP
    → webhook: subscription_preapproval (authorized) → plano ativado no DB

[todo mês]
    → MP cobra automaticamente
    → webhook: payment (approved) → extende currentPeriodEnd + 30d
    → webhook: payment (rejected, após retentativas) → status: "past_due"
    → [3 falhas consecutivas] → MP cancela preapproval → webhook: subscription_preapproval (cancelled)

[usuário pausa]
    → MP: PUT /preapproval/{id} status: "paused"
    → DB: cancelAtPeriodEnd: true, status mantém "active"
    → acesso continua até currentPeriodEnd
    → cron diário: se currentPeriodEnd < now AND cancelAtPeriodEnd → cancela no MP + rebaixa plano

[usuário reativa (apenas de paused)]
    → MP: PUT /preapproval/{id} status: "authorized"
    → DB: cancelAtPeriodEnd: false

[usuário cancela definitivamente]
    → MP: PUT /preapproval/{id} status: "cancelled"
    → DB: status: "canceled"
    → sem botão "Reativar" — só "Assinar novamente" → novo checkout
```

---

## Mudanças no backend

### 1. DB schema — nova coluna

**Arquivo:** `apps/api/src/db/schema/subscriptions.ts`

Adicionar:
```typescript
mercadopagoPreapprovalId: varchar("mercadopago_preapproval_id", { length: 255 }),
```

Nova migration Drizzle correspondente.

---

### 2. POST /subscription/checkout (modificar lógica real)

**Arquivo:** `apps/api/src/routes/subscription.ts`

Substituir bloco `// MercadoPago mode` (linhas ~337–386):

```typescript
// Substitui: new Preference(client).create(...)
// Por:
import { PreApproval } from "mercadopago"

const result = await new PreApproval(client).create({
  body: {
    reason: `VarzeaPro ${planConfig.name}`,
    payer_email: email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: unitPrice,
      currency_id: "BRL",
    },
    back_url: successUrl,
    external_reference: JSON.stringify({ userId, planId }),
    notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || "",
    status: "pending",
  },
})

return ok({
  initPoint: result.init_point,
  preferenceId: result.id,  // na verdade é o preapproval_id
})
```

Salvar `result.id` como `preferenceId` no retorno mantém o contrato de response idêntico.

---

### 3. POST /subscription/pause (novo endpoint)

Substitui semanticamente o `POST /cancel` atual para o caso "cancel at period end":

```
POST /api/subscription/pause
```

- Busca `mercadopagoPreapprovalId` do sub do usuário
- Se encontrado e `PAYMENT_MODE !== "mock"`: chama `PUT /preapproval/{id}` com `status: "paused"`
- Seta `cancelAtPeriodEnd: true` no DB
- Retorna: `{ success: true, currentPeriodEnd }`

---

### 4. POST /subscription/cancel (existente — modificar semântica)

Passa a ser **cancelamento permanente e imediato**:

- Chama `PUT /preapproval/{id}` com `status: "cancelled"` no MP
- Seta `status: "canceled"` no DB imediatamente
- NÃO seta `cancelAtPeriodEnd` — o plano é rebaixado na hora
- Retorna: `{ success: true }`

---

### 5. POST /subscription/reactivate (modificar)

- Verifica `status !== "canceled"` — se cancelado, retorna 400 `SUBSCRIPTION_PERMANENTLY_CANCELED`
- Chama `PUT /preapproval/{id}` com `status: "authorized"` no MP
- Seta `cancelAtPeriodEnd: false` no DB
- Retorna: `{ success: true }`

---

### 6. Webhook handler — novos eventos

**Arquivo:** `apps/api/src/routes/webhooks/mercadopago.ts`

Adicionar tópico `subscription_preapproval`:

```typescript
// Detectar tópico
const topic = body.type as string | undefined  // "subscription_preapproval" | "payment"
const action = body.action as string | undefined
const preapprovalId = (body.data as any)?.id

if (topic === "subscription_preapproval" && preapprovalId) {
  const preapproval = await new PreApproval(client).get({ id: preapprovalId })
  const externalRef = JSON.parse(preapproval.external_reference || "{}")
  const { userId, planId } = externalRef

  if (preapproval.status === "authorized") {
    // Ativar plano — mesma lógica de hoje
    await activateSubscription(db, { userId, planId, preapprovalId })
  } else if (preapproval.status === "cancelled") {
    // Rebaixar plano para free
    await deactivateSubscription(db, { userId })
  }
}
```

Para `payment` (cobranças recorrentes):
- `status: "approved"` → extende `currentPeriodEnd + 30d`
- `status: "rejected"` → não faz nada imediato (MP retenta automaticamente)
- Após 3 falhas, MP cancela a preapproval e dispara `subscription_preapproval (cancelled)`

Extrair lógica de ativação/desativação em funções helpers dentro do arquivo para evitar duplicação.

---

### 7. Cron de expiração

**Arquivo novo:** `apps/api/src/jobs/expire-subscriptions.ts`

Job que roda diariamente (via setInterval no startup ou integração com node-cron):

```typescript
// Seleciona subs com cancelAtPeriodEnd = true AND currentPeriodEnd < now
// Para cada uma:
//   1. Se mercadopagoPreapprovalId e PAYMENT_MODE !== "mock":
//      PUT /preapproval/{id} status: "cancelled"
//   2. UPDATE subscriptions SET planId: "free", status: "canceled"
//   3. UPDATE users SET planId: "free"
```

---

## Mudanças no frontend

### 1. Página de planos (`planos.tsx`) — UI de gerenciamento

**Seção de assinatura ativa — novos botões:**

Modal "Gerenciar assinatura" com duas opções:

**Opção 1 — Pausar** (destaque, texto primário):
```
Pausar assinatura
Mantenha o acesso até [data]. Pode reativar a qualquer momento.
```

**Opção 2 — Cancelar definitivamente** (texto vermelho, sem destaque, link pequeno):
```
Cancelar definitivamente
```

**Confirmação de cancelamento** — segundo modal:
```
Você perderá o acesso ao final do período e não poderá reativar 
esta assinatura. Para usar novamente, precisará assinar do zero.

[Confirmar cancelamento]  [Voltar]
```

### 2. Estados de assinatura no card do plano atual

| Estado DB | UI |
|-----------|-----|
| `status: "active"`, `cancelAtPeriodEnd: false` | Botão "Gerenciar" → modal pause/cancel |
| `status: "active"`, `cancelAtPeriodEnd: true` | Badge "Pausa em [data]" + botão "Reativar" |
| `status: "canceled"` | Badge "Encerrada" + botão "Assinar novamente" → checkout |
| `status: "past_due"` | Badge "Pagamento pendente" + mensagem MP está tentando novamente |

### 3. Contrato de response — novos campos

Adicionar ao `UsageSchema` em `shared/contracts/subscription.ts`:
```typescript
mercadopagoPreapprovalId: z.string().nullable().optional(),
```

Não é necessário para funcionalidade — apenas para debug/admin. Pode ser omitido se não quiser expor.

---

## Variáveis de ambiente

Sem novas variáveis. As existentes já cobrem tudo:
```
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_URL=
MERCADOPAGO_WEBHOOK_SECRET=
PAYMENT_MODE=mock|real
```

---

## Contrato de API — sem breaking changes

`POST /checkout` → mesmo request/response shape  
`POST /cancel` → mesmos campos (semântica muda para permanente)  
`POST /pause` → novo endpoint, mesmo shape de response do cancel atual  
`POST /reactivate` → mesmo shape, novo erro `SUBSCRIPTION_PERMANENTLY_CANCELED`  
`GET /usage` → sem mudanças obrigatórias

---

## Testes

- Mock mode (`PAYMENT_MODE=mock`) não muda — testes existentes passam
- Webhook handler: testes unitários para cada tópico/status combination
- Pause/reactivate: mock da chamada MP API

---

## Self-review

**Placeholders:** nenhum  
**Consistência:** fluxo pause→reactivate usa preapproval_id presente no DB — coluna nova é pré-requisito para tudo  
**Scope:** foca apenas em substituir checkout + ciclo de vida; não afeta chat, busca, perfil  
**Ambiguidade resolvida:**
- Cancelamento = imediato no MP + DB, sem período de graça
- Pausa = MP pausa + DB mantém acesso até `currentPeriodEnd`  
- "Cancelar" no endpoint existente muda de semântica — frontend precisa chamar `/pause` para o fluxo antigo e `/cancel` para o novo fluxo permanente
