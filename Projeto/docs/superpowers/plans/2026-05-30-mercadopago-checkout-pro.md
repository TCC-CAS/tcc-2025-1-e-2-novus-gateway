# Mercado Pago Checkout Pro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a integração do Checkout Pro para que o plano só seja ativado via webhook (após pagamento real), não diretamente pela página de sucesso.

**Architecture:** O backend cria a preference com `notification_url`, o MP chama o webhook quando o pagamento é aprovado, o webhook ativa o plano no banco. A página de sucesso apenas exibe o status e faz poll na API `/subscription/usage` até detectar que o plano foi ativado — sem chamar `upgrade` diretamente.

**Tech Stack:** Fastify + Drizzle (backend), React Router v7 + TanStack Query implícito via `subscriptionApi` (frontend), `mercadopago` SDK v2.

---

## Problemas identificados

| # | Arquivo | Bug |
|---|---------|-----|
| 1 | `pagamento-sucesso.tsx` | Chama `subscriptionApi.upgrade()` diretamente — qualquer usuário pode navegar para `/pagamento-sucesso?planId=fenomeno` e ganhar o plano sem pagar |
| 2 | `subscription.ts` (POST /checkout) | Não envia `notification_url` na preferência — MP nunca chamará o webhook |
| 3 | `.env` | `MERCADOPAGO_WEBHOOK_SECRET` vazio — assinatura não é verificada |

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/api/src/routes/subscription.ts` | Modify | Adicionar `notification_url` na criação da preferência |
| `apps/web/app/routes/pagamento-sucesso.tsx` | Modify | Remover `upgrade` direto; polling em `/subscription/usage` até plano ativar |
| `.env` / `.env.example` | Modify | Documentar `MERCADOPAGO_WEBHOOK_SECRET` |

---

## Task 1: Adicionar `notification_url` na criação da preferência

**Files:**
- Modify: `apps/api/src/routes/subscription.ts` (linha ~314, dentro do `preference.create`)

- [ ] **Step 1: Adicionar `notification_url` ao body da preferência**

No arquivo `apps/api/src/routes/subscription.ts`, dentro do bloco `preference.create({ body: { ... } })` (linha ~314), adicionar `notification_url` logo após `external_reference`:

```typescript
external_reference: JSON.stringify({ userId, planId }),
notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || "",
```

O resultado final do `body` deve ser:

```typescript
body: {
  items: [
    {
      id: planId,
      title: `VarzeaPro ${planConfig.name}`,
      quantity: 1,
      unit_price: unitPrice,
      currency_id: "BRL",
    },
  ],
  payer: { email },
  back_urls: {
    success: successUrl,
    failure: failureUrl,
    pending: pendingUrl,
  },
  ...(successUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
  external_reference: JSON.stringify({ userId, planId }),
  notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || "",
},
```

- [ ] **Step 2: Verificar que `MERCADOPAGO_WEBHOOK_URL` está no `.env.example`**

Confirmar que `apps/api/.env.example` contém:
```
MERCADOPAGO_WEBHOOK_URL=https://api.yourdomain.com/api/webhooks/mercadopago
```

Já existe. Nenhuma mudança necessária.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/subscription.ts
git commit -m "fix: add notification_url to MercadoPago preference creation"
```

---

## Task 2: Corrigir `pagamento-sucesso.tsx` — remover ativação direta de plano

**Files:**
- Modify: `apps/web/app/routes/pagamento-sucesso.tsx`

**Contexto:** MP redireciona de volta com `?collection_id=<payment_id>&collection_status=approved&payment_id=<id>&status=approved&external_reference=<json>&payment_type=credit_card&merchant_order_id=<id>&preference_id=<id>&site_id=MLB&processing_mode=aggregator&merchant_account_id=null`.

A página deve:
1. Ler `status` dos query params para saber se o pagamento foi submetido
2. Fazer poll em `subscriptionApi.getUsage()` até detectar que o plano mudou (ou timeout de 30s)
3. Nunca chamar `subscriptionApi.upgrade()` — isso é trabalho do webhook

- [ ] **Step 1: Reescrever `pagamento-sucesso.tsx`**

Substituir o conteúdo inteiro do arquivo por:

```tsx
import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Button } from "~/components/ui/button"
import { CheckCircle, Clock, ArrowLeft, Loader2, XCircle } from "lucide-react"
import { subscriptionApi } from "~/lib/api-client"

export function meta() {
  return [
    { title: "Pagamento - VarzeaPro" },
  ]
}

type ActivationState = "polling" | "activated" | "timeout" | "error"

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<ActivationState>("polling")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)
  const MAX_ATTEMPTS = 10 // 10 × 3s = 30s

  const mpStatus = searchParams.get("status") // "approved" | "pending" | "failure" | null
  const isPending = mpStatus === "pending"
  const isFailure = mpStatus === "failure"

  useEffect(() => {
    // If MP redirected with failure or no planId context, skip polling
    if (isFailure) {
      setState("error")
      return
    }

    intervalRef.current = setInterval(async () => {
      attemptsRef.current += 1
      try {
        const usage = await subscriptionApi.getUsage()
        if (usage.planId !== "free") {
          setState("activated")
          clearInterval(intervalRef.current!)
          return
        }
      } catch {
        // network error — keep trying
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState("timeout")
        clearInterval(intervalRef.current!)
      }
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isFailure])

  if (isFailure) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-lg border-4 border-destructive bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-destructive)]">
          <XCircle className="mx-auto size-16 text-destructive" />
          <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
            PAGAMENTO RECUSADO
          </h1>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Seu pagamento não foi aprovado. Tente novamente com outro cartão ou método de pagamento.
          </p>
          <Button
            asChild
            className="mt-8 h-14 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to="/planos">
              <ArrowLeft className="size-5" />
              TENTAR NOVAMENTE
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (state === "polling") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-lg border-4 border-primary bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <Loader2 className="mx-auto size-16 text-primary animate-spin" />
          <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
            {isPending ? "PAGAMENTO EM ANÁLISE" : "CONFIRMANDO PAGAMENTO..."}
          </h1>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            {isPending
              ? "Seu pagamento está sendo processado. Assim que confirmado, seu plano será ativado automaticamente."
              : "Verificando a confirmação do pagamento. Isso pode levar alguns segundos."}
          </p>
        </div>
      </div>
    )
  }

  if (state === "activated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-lg border-4 border-primary bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <CheckCircle className="mx-auto size-16 text-primary" />
          <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
            PLANO ATIVADO!
          </h1>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Seu pagamento foi confirmado e o plano está ativo. Aproveite todas as funcionalidades do VarzeaPro.
          </p>
          <Button
            asChild
            className="mt-8 h-14 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to="/">
              <ArrowLeft className="size-5" />
              VOLTAR AO INÍCIO
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // timeout — webhook may be delayed
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg border-4 border-amber-500 bg-background p-12 text-center shadow-[8px_8px_0px_0px_theme(colors.amber.500)]">
        <Clock className="mx-auto size-16 text-amber-500" />
        <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
          AGUARDANDO CONFIRMAÇÃO
        </h1>
        <p className="mt-4 text-lg font-medium text-muted-foreground">
          O pagamento foi recebido mas a ativação está demorando mais que o normal.
          Seu plano será ativado em breve — verifique a página de planos em alguns minutos.
        </p>
        <Button
          asChild
          className="mt-8 h-14 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
        >
          <Link to="/planos">
            <ArrowLeft className="size-5" />
            VER MEUS PLANOS
          </Link>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/routes/pagamento-sucesso.tsx
git commit -m "fix: remove direct plan upgrade from success page — activation via webhook only"
```

---

## Task 3: Registrar webhook no painel do Mercado Pago (via MCP)

**Files:** Nenhum arquivo — configuração no painel MP via MCP tool.

- [ ] **Step 1: Configurar webhook via MCP tool**

Usar `mcp__mercadopago__save_webhook` com a URL do webhook e os eventos `payment`.

**Para ambiente de teste local:** usar ngrok para expor o servidor:
```bash
ngrok http 3000
# Copiar a URL https://xxxx.ngrok.io
# Usar: https://xxxx.ngrok.io/api/webhooks/mercadopago
```

- [ ] **Step 2: Obter o `MERCADOPAGO_WEBHOOK_SECRET` do painel MP**

Após registrar o webhook, o MP gera uma "Chave secreta" (signing secret).
Adicionar ao `.env`:
```
MERCADOPAGO_WEBHOOK_SECRET=<secret-do-painel-mp>
```

Atualizar `.env.example` com comentário claro:
```
# Obtenha em: Painel MP > Integrações > Webhooks > [webhook cadastrado] > Chave secreta
MERCADOPAGO_WEBHOOK_SECRET=
```

- [ ] **Step 3: Testar webhook com evento simulado**

```bash
# Simular pagamento aprovado via MP Sandbox (usar conta de teste comprador)
# Verificar logs do servidor: deve aparecer "Subscription activated via webhook"
```

---

## Task 4: Validar qualidade da integração (MCP quality check)

- [ ] **Step 1: Rodar quality checklist via MCP**

Usar `mcp__mercadopago__quality_checklist` para verificar os requisitos de qualidade da integração.

- [ ] **Step 2: Rodar quality evaluation via MCP**

Usar `mcp__mercadopago__quality_evaluation` para obter score de qualidade.

- [ ] **Step 3: Commit final**

```bash
git add apps/api/.env.example
git commit -m "docs: clarify MERCADOPAGO_WEBHOOK_SECRET setup in .env.example"
```

---

## Self-Review

**Spec coverage:**
- ✅ `notification_url` adicionada à preferência (Task 1)
- ✅ Ativação direta removida da página de sucesso (Task 2)
- ✅ Poll correto em `/subscription/usage` (Task 2)
- ✅ Webhook registration via MCP (Task 3)
- ✅ Quality check (Task 4)

**Placeholder scan:** Sem TBDs. Código completo em cada step.

**Type consistency:** `subscriptionApi.getUsage()` retorna `Usage` com `planId: string` — comparação `usage.planId !== "free"` é válida conforme contrato em `shared/contracts/subscription.ts`.
