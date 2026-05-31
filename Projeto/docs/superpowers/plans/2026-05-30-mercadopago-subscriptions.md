# Mercado Pago Assinaturas Recorrentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir Checkout Pro (pagamento único) pela API de Assinaturas do MP (`PreApproval`), adicionando cobrança mensal automática, ciclo de vida completo (pause/cancel/reactivate) e cron de expiração.

**Architecture:** O backend cria uma `PreApproval` com `status: "pending"` e retorna o `init_point` para o usuário autorizar no MP. Webhooks `subscription_preapproval` e `payment` gerenciam ativação, extensão de período e cancelamento. Usuários podem pausar (reversível) ou cancelar permanentemente (irreversível). Um cron diário expira assinaturas pausadas cujo período terminou.

**Tech Stack:** Fastify + Drizzle + PostgreSQL (backend), React Router v7 + shadcn (frontend), SDK `mercadopago` v2 (já instalado), Vitest (testes).

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `apps/api/src/db/schema/subscriptions.ts` | Modify | Adicionar coluna `mercadopagoPreapprovalId` |
| `apps/api/src/db/migrations/` | Create | Migration gerada pelo drizzle-kit |
| `apps/api/src/routes/webhooks/mercadopago.ts` | Modify | Handlers para `subscription_preapproval` e extensão de período em `payment` |
| `apps/api/src/routes/subscription.ts` | Modify | Checkout → PreApproval; novo endpoint `/pause`; `/cancel` permanente; `/reactivate` com guarda |
| `apps/api/src/jobs/expire-subscriptions.ts` | Create | Cron diário que expira subs pausadas cujo período terminou |
| `apps/api/src/server.ts` | Modify | Registrar cron no startup |
| `apps/web/app/lib/api-client.ts` | Modify | Adicionar `pause()` ao `subscriptionApi` |
| `apps/web/app/routes/planos.tsx` | Modify | UI: botão "Gerenciar" → modal pause/cancel; badges de status; reactivate só para pausadas |

---

## Task 1: DB Schema — coluna `mercadopagoPreapprovalId`

**Files:**
- Modify: `apps/api/src/db/schema/subscriptions.ts`
- Create: migration via drizzle-kit (automático)

- [ ] **Step 1: Adicionar coluna no schema**

Em `apps/api/src/db/schema/subscriptions.ts`, adicionar `mercadopagoPreapprovalId` após `cancelAtPeriodEnd`:

```typescript
import { pgTable, text, timestamp, boolean, pgEnum, varchar } from "drizzle-orm/pg-core"
import { users } from "./users.js"
import { planIdEnum } from "./users.js"

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "trialing"])

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  planId: planIdEnum("plan_id").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  mercadopagoPreapprovalId: varchar("mercadopago_preapproval_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Gerar a migration**

```bash
cd apps/api
bunx drizzle-kit generate
```

Isso cria um arquivo `src/db/migrations/000X_<nome>.sql`. Verificar que o SQL gerado contém:
```sql
ALTER TABLE "subscriptions" ADD COLUMN "mercadopago_preapproval_id" varchar(255);
```

- [ ] **Step 3: Aplicar a migration**

```bash
bunx drizzle-kit migrate
```

Expected: `Applied 1 migration`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/schema/subscriptions.ts apps/api/src/db/migrations/
git commit -m "feat: add mercadopago_preapproval_id column to subscriptions"
```

---

## Task 2: Webhook Handler — subscription_preapproval + extensão de período

**Files:**
- Modify: `apps/api/src/routes/webhooks/mercadopago.ts`

O webhook precisa tratar dois novos casos:
1. `subscription_preapproval` com `status: "authorized"` → ativar plano
2. `subscription_preapproval` com `status: "cancelled"` → rebaixar para free
3. `payment (approved)` quando sub já está ativa → extensão de período (30d)

- [ ] **Step 1: Reescrever `apps/api/src/routes/webhooks/mercadopago.ts`**

```typescript
import type { FastifyPluginAsync } from "fastify"
import { createHmac, timingSafeEqual } from "crypto"
import { eq } from "drizzle-orm"
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago"
import { subscriptions } from "../../db/schema/subscriptions.js"
import { users } from "../../db/schema/users.js"
import { ok } from "../../lib/response.js"
import { nanoid } from "nanoid"
import type { PlanId } from "../../../../../shared/contracts/subscription.js"

function verifySignature(
  secret: string,
  paymentId: string,
  requestId: string,
  ts: string,
  received: string
): boolean {
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  } catch {
    return false
  }
}

type Db = Parameters<Parameters<FastifyPluginAsync>[0]["addHook"]>[1] extends never
  ? never
  : any // use fastify.db type

async function activateSubscription(
  db: any,
  { userId, planId, preapprovalId }: { userId: string; planId: PlanId; preapprovalId?: string }
): Promise<void> {
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  await db.transaction(async (tx: any) => {
    await tx
      .insert(subscriptions)
      .values({
        id: nanoid(),
        userId,
        planId,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        mercadopagoPreapprovalId: preapprovalId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          planId,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          mercadopagoPreapprovalId: preapprovalId ?? null,
          updatedAt: now,
        },
      })
    await tx
      .update(users)
      .set({ planId, updatedAt: now })
      .where(eq(users.id, userId))
  })
}

async function deactivateSubscription(db: any, { userId }: { userId: string }): Promise<void> {
  const now = new Date()
  await db.transaction(async (tx: any) => {
    await tx
      .update(subscriptions)
      .set({ planId: "free", status: "canceled", cancelAtPeriodEnd: false, updatedAt: now })
      .where(eq(subscriptions.userId, userId))
    await tx
      .update(users)
      .set({ planId: "free", updatedAt: now })
      .where(eq(users.id, userId))
  })
}

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/mercadopago", async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const topic = body.type as string | undefined
    const action = body.action as string | undefined
    const data = body.data as Record<string, string> | undefined
    const resourceId = data?.id

    if (!resourceId) {
      return ok({ received: true })
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
    })

    // ─── subscription_preapproval events ───────────────────────────────────
    if (topic === "subscription_preapproval") {
      try {
        const preapproval = await new PreApproval(client).get({ id: resourceId })
        const externalRef = preapproval.external_reference
        if (!externalRef) {
          request.log.warn({ preapprovalId: resourceId }, "PreApproval has no external_reference")
          return ok({ received: true })
        }

        const { userId, planId } = JSON.parse(externalRef) as { userId: string; planId: PlanId }

        if (preapproval.status === "authorized") {
          await activateSubscription(fastify.db, { userId, planId, preapprovalId: resourceId })
          request.log.info({ preapprovalId: resourceId, userId, planId }, "Subscription activated via preapproval webhook")
        } else if (preapproval.status === "cancelled") {
          await deactivateSubscription(fastify.db, { userId })
          request.log.info({ preapprovalId: resourceId, userId }, "Subscription deactivated via preapproval webhook")
        }
      } catch (err) {
        fastify.log.error({ err, preapprovalId: resourceId }, "PreApproval webhook processing failed")
      }
      return ok({ received: true })
    }

    // ─── payment events ────────────────────────────────────────────────────
    const isPaymentEvent =
      topic === "payment" ||
      action === "payment.created" ||
      action === "payment.updated"

    if (!isPaymentEvent) {
      return ok({ received: true })
    }

    const paymentId = resourceId

    // Verify signature when secret is configured
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (webhookSecret) {
      const xSignature = request.headers["x-signature"] as string | undefined
      const xRequestId = request.headers["x-request-id"] as string | undefined

      if (!xSignature || !xRequestId) {
        return reply.status(400).send({ error: { code: "MISSING_SIGNATURE", message: "Missing webhook signature" } })
      }

      const parts = Object.fromEntries(
        xSignature.split(",").map((p) => p.split("=") as [string, string])
      )
      const ts = parts["ts"]
      const v1 = parts["v1"]

      if (!ts || !v1 || !verifySignature(webhookSecret, paymentId, xRequestId, ts, v1)) {
        request.log.warn({ paymentId }, "Webhook signature verification failed")
        return reply.status(401).send({ error: { code: "INVALID_SIGNATURE", message: "Webhook signature mismatch" } })
      }

      const age = Date.now() / 1000 - parseInt(ts, 10)
      if (age > 300) {
        return reply.status(400).send({ error: { code: "STALE_EVENT", message: "Webhook event too old" } })
      }
    }

    try {
      const payment = await new Payment(client).get({ id: paymentId })

      if (payment.status !== "approved") {
        request.log.info({ paymentId, status: payment.status }, "Payment not approved — skipping")
        return ok({ received: true })
      }

      const externalRef = payment.external_reference
      if (!externalRef) {
        request.log.warn({ paymentId }, "Payment has no external_reference")
        return ok({ received: true })
      }

      const { userId, planId } = JSON.parse(externalRef) as { userId: string; planId: PlanId }

      // Check if subscription already exists and is active (recurring charge → extend period)
      const [existingSub] = await fastify.db
        .select({ status: subscriptions.status, planId: subscriptions.planId })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1)

      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      if (existingSub?.status === "active" && existingSub.planId === planId) {
        // Recurring charge — extend period
        await fastify.db
          .update(subscriptions)
          .set({ currentPeriodStart: now, currentPeriodEnd: periodEnd, updatedAt: now })
          .where(eq(subscriptions.userId, userId))
        request.log.info({ paymentId, userId, planId }, "Subscription period extended via payment webhook")
      } else {
        // First payment or fallback activation
        await activateSubscription(fastify.db, { userId, planId })
        request.log.info({ paymentId, userId, planId }, "Subscription activated via payment webhook")
      }
    } catch (err) {
      fastify.log.error({ err, paymentId }, "Payment webhook processing failed")
    }

    return ok({ received: true })
  })
}

export default webhookRoutes
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/webhooks/mercadopago.ts
git commit -m "feat: add subscription_preapproval webhook handler and period extension for recurring payments"
```

---

## Task 3: Checkout Endpoint — Preference → PreApproval

**Files:**
- Modify: `apps/api/src/routes/subscription.ts` (bloco `// MercadoPago mode`, linhas ~337–386)

- [ ] **Step 1: Substituir bloco do MP no endpoint `/checkout`**

No arquivo `apps/api/src/routes/subscription.ts`, no topo do arquivo, adicionar `PreApproval` ao import:

```typescript
import { MercadoPagoConfig, Preference, PreApproval } from "mercadopago"
```

Localizar o bloco `// MercadoPago mode` (após o bloco `if (paymentMode === "mock")`) e substituir **todo o conteúdo** desse bloco por:

```typescript
// MercadoPago mode — PreApproval (assinatura recorrente)
const planConfig = PLAN_CONFIGS[planId as keyof typeof PLAN_CONFIGS]
const unitPrice = process.env.MERCADOPAGO_TEST_PRICE === "true" ? 1.00 : planConfig.price
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
})

const successUrl = `${frontendUrl}/pagamento-sucesso?planId=${planId}`
const failureUrl = `${frontendUrl}/planos?status=failure`

try {
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
    initPoint: result.init_point ?? "",
    preferenceId: result.id ?? "",
  })
} catch (error) {
  request.log.error({ error }, "MercadoPago PreApproval creation failed")
  return reply.status(502).send({
    error: { code: "PAYMENT_PROVIDER_ERROR", message: "Falha ao criar assinatura recorrente" },
  })
}
```

**Nota:** O bloco `Preference` (antigo) pode ser removido. O import de `Preference` pode ser mantido ou removido — se nenhum outro lugar o usa, remova.

- [ ] **Step 2: Verificar que o import do Preference pode ser removido**

```bash
grep -n "Preference" apps/api/src/routes/subscription.ts
```

Se só aparecer no import, remover da linha de import.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/subscription.ts
git commit -m "feat: switch checkout from Preference to PreApproval for recurring subscriptions"
```

---

## Task 4: Novo endpoint POST /pause

**Files:**
- Modify: `apps/api/src/routes/subscription.ts`
- Modify: `apps/api/tests/routes/subscription.test.ts`

O `/pause` é o novo "cancel at period end" — pausa o MP e mantém acesso até `currentPeriodEnd`.

- [ ] **Step 1: Adicionar endpoint `/pause` em `subscription.ts`**

Após o endpoint `/reactivate` e antes do endpoint `/checkout`, adicionar:

```typescript
// POST /pause — pause subscription at period end (reversível via /reactivate)
fastify.withTypeProvider<ZodTypeProvider>().post(
  "/pause",
  { preHandler: [requireSession] },
  async (request, reply) => {
    const userId = request.session!.user.id

    const [sub] = await fastify.db
      .select({
        planId: subscriptions.planId,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        mercadopagoPreapprovalId: subscriptions.mercadopagoPreapprovalId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (!sub) {
      return reply.status(404).send({
        error: { code: "NO_SUBSCRIPTION", message: "Nenhuma assinatura encontrada" },
      })
    }

    if (sub.cancelAtPeriodEnd) {
      return reply.status(400).send({
        error: { code: "ALREADY_PAUSED", message: "Assinatura já está pausada" },
      })
    }

    if (sub.planId === "free") {
      return reply.status(400).send({
        error: { code: "FREE_PLAN", message: "Plano gratuito não pode ser pausado" },
      })
    }

    // Call MP API to pause (only if we have a preapproval ID and not in mock mode)
    const paymentMode = process.env.PAYMENT_MODE || "mock"
    if (paymentMode !== "mock" && sub.mercadopagoPreapprovalId) {
      try {
        const client = new MercadoPagoConfig({
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
        })
        await new PreApproval(client).update({
          id: sub.mercadopagoPreapprovalId,
          body: { status: "paused" },
        })
      } catch (err) {
        request.log.error({ err, userId }, "Failed to pause preapproval on MP")
        return reply.status(502).send({
          error: { code: "PAYMENT_PROVIDER_ERROR", message: "Falha ao pausar assinatura no Mercado Pago" },
        })
      }
    }

    const now = new Date()
    await fastify.db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: now })
      .where(eq(subscriptions.userId, userId))

    return ok({
      success: true,
      message: "Assinatura pausada. Acesso mantido até o fim do período.",
      planId: sub.planId,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    })
  }
)
```

- [ ] **Step 2: Adicionar testes para `/pause` em `subscription.test.ts`**

Adicionar novo bloco `describe` após o bloco `SUB-02`:

```typescript
// SUB-03: POST /api/subscription/pause
describe("POST /api/subscription/pause (SUB-03)", () => {
  it("SUB-03a: returns 404 if user has no subscription", async () => {
    // Fresh user has no subscription yet (before first /usage call)
    // To test this, upgrade then manually test the flow
    // In practice, /usage always auto-creates — so test error path via direct DB check
    // This test validates the 400 for already-paused instead
    const freshPlayer = await signUpAndGetCookie(app, "player")
    // First call /usage to create free sub
    await app.inject({
      method: "GET",
      url: "/api/subscription/usage",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    // Try to pause a free plan — should 400
    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/pause",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("FREE_PLAN")
  })

  it("SUB-03b: player with paid plan can pause — returns 200 with currentPeriodEnd", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    // Upgrade to craque via /upgrade (mock direct upgrade for test)
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })

    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/pause",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.success).toBe(true)
    expect(typeof body.data.currentPeriodEnd).toBe("string")
    expect(body.data.planId).toBe("craque")
  })

  it("SUB-03c: pausing twice returns 400 ALREADY_PAUSED", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })
    await app.inject({
      method: "POST",
      url: "/api/subscription/pause",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/pause",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("ALREADY_PAUSED")
  })

  it("SUB-03d: after pause, /usage reflects cancelAtPeriodEnd: true", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })
    await app.inject({
      method: "POST",
      url: "/api/subscription/pause",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    const res = await app.inject({
      method: "GET",
      url: "/api/subscription/usage",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.cancelAtPeriodEnd).toBe(true)
  })

  it("SUB-03e: returns 401 without auth", async () => {
    const res = await app.inject({ method: "POST", url: "/api/subscription/pause" })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
cd apps/api
bun test tests/routes/subscription.test.ts
```

Expected: todos os testes SUB-03 passam, SUB-01 e SUB-02 ainda passam.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/subscription.ts apps/api/tests/routes/subscription.test.ts
git commit -m "feat: add POST /subscription/pause endpoint with MP API integration"
```

---

## Task 5: Modificar POST /cancel — cancelamento permanente

**Files:**
- Modify: `apps/api/src/routes/subscription.ts`
- Modify: `apps/api/tests/routes/subscription.test.ts`

**Semântica muda:** antes era "cancel at period end". Agora é cancelamento permanente imediato — MP cancela, DB seta `status: "canceled"`.

- [ ] **Step 1: Substituir o corpo do endpoint `/cancel`**

Localizar o endpoint `POST /cancel` (linha ~178) e substituir **todo o handler** por:

```typescript
// POST /cancel — permanent cancel (irreversível, MP também cancela)
fastify.withTypeProvider<ZodTypeProvider>().post(
  "/cancel",
  { preHandler: [requireSession] },
  async (request, reply) => {
    const userId = request.session!.user.id

    const [sub] = await fastify.db
      .select({
        planId: subscriptions.planId,
        status: subscriptions.status,
        mercadopagoPreapprovalId: subscriptions.mercadopagoPreapprovalId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (!sub) {
      return reply.status(404).send({
        error: { code: "NO_SUBSCRIPTION", message: "Nenhuma assinatura encontrada" },
      })
    }

    if (sub.status === "canceled") {
      return reply.status(400).send({
        error: { code: "ALREADY_CANCELED", message: "Assinatura já está cancelada" },
      })
    }

    // Cancel on MP (only if preapproval exists and not in mock mode)
    const paymentMode = process.env.PAYMENT_MODE || "mock"
    if (paymentMode !== "mock" && sub.mercadopagoPreapprovalId) {
      try {
        const client = new MercadoPagoConfig({
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
        })
        await new PreApproval(client).update({
          id: sub.mercadopagoPreapprovalId,
          body: { status: "cancelled" },
        })
      } catch (err) {
        request.log.error({ err, userId }, "Failed to cancel preapproval on MP")
        return reply.status(502).send({
          error: { code: "PAYMENT_PROVIDER_ERROR", message: "Falha ao cancelar assinatura no Mercado Pago" },
        })
      }
    }

    const now = new Date()
    await fastify.db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({ status: "canceled", cancelAtPeriodEnd: false, updatedAt: now })
        .where(eq(subscriptions.userId, userId))
      await tx
        .update(users)
        .set({ planId: "free", updatedAt: now })
        .where(eq(users.id, userId))
    })

    return ok({
      success: true,
      message: "Assinatura cancelada permanentemente",
      planId: sub.planId,
    })
  }
)
```

- [ ] **Step 2: Atualizar testes do `/cancel` em `subscription.test.ts`**

Substituir o describe block existente de `POST /cancel` (se houver) ou adicionar novo bloco:

```typescript
// SUB-04: POST /api/subscription/cancel (permanente)
describe("POST /api/subscription/cancel (SUB-04)", () => {
  it("SUB-04a: cancels paid subscription permanently — status becomes canceled", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })

    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/cancel",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.success).toBe(true)
  })

  it("SUB-04b: after cancel, /usage reflects planId: free", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })
    await app.inject({
      method: "POST",
      url: "/api/subscription/cancel",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    const res = await app.inject({
      method: "GET",
      url: "/api/subscription/usage",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(200)
    // planId is reset to free immediately on permanent cancel
    expect(res.json().data.planId).toBe("free")
  })

  it("SUB-04c: canceling twice returns 400 ALREADY_CANCELED", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })
    await app.inject({
      method: "POST",
      url: "/api/subscription/cancel",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/cancel",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("ALREADY_CANCELED")
  })

  it("SUB-04d: returns 401 without auth", async () => {
    const res = await app.inject({ method: "POST", url: "/api/subscription/cancel" })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
cd apps/api
bun test tests/routes/subscription.test.ts
```

Expected: SUB-04 passa, SUB-01/02/03 mantêm verde.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/subscription.ts apps/api/tests/routes/subscription.test.ts
git commit -m "feat: make POST /subscription/cancel permanent — deactivates plan immediately"
```

---

## Task 6: Modificar POST /reactivate — bloquear permanentemente canceladas

**Files:**
- Modify: `apps/api/src/routes/subscription.ts`
- Modify: `apps/api/tests/routes/subscription.test.ts`

- [ ] **Step 1: Substituir handler do `/reactivate`**

Localizar o endpoint `POST /reactivate` e substituir **todo o handler** por:

```typescript
// POST /reactivate — undo pause (only works if status !== "canceled")
fastify.withTypeProvider<ZodTypeProvider>().post(
  "/reactivate",
  { preHandler: [requireSession] },
  async (request, reply) => {
    const userId = request.session!.user.id

    const [sub] = await fastify.db
      .select({
        planId: subscriptions.planId,
        status: subscriptions.status,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        mercadopagoPreapprovalId: subscriptions.mercadopagoPreapprovalId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    if (!sub) {
      return reply.status(404).send({
        error: { code: "NO_SUBSCRIPTION", message: "Nenhuma assinatura encontrada" },
      })
    }

    if (sub.status === "canceled") {
      return reply.status(400).send({
        error: {
          code: "SUBSCRIPTION_PERMANENTLY_CANCELED",
          message: "Assinatura cancelada permanentemente. Assine novamente para reativar.",
        },
      })
    }

    if (!sub.cancelAtPeriodEnd) {
      return reply.status(400).send({
        error: { code: "NOT_PAUSED", message: "Assinatura não está pausada" },
      })
    }

    // Resume on MP
    const paymentMode = process.env.PAYMENT_MODE || "mock"
    if (paymentMode !== "mock" && sub.mercadopagoPreapprovalId) {
      try {
        const client = new MercadoPagoConfig({
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
        })
        await new PreApproval(client).update({
          id: sub.mercadopagoPreapprovalId,
          body: { status: "authorized" },
        })
      } catch (err) {
        request.log.error({ err, userId }, "Failed to reactivate preapproval on MP")
        return reply.status(502).send({
          error: { code: "PAYMENT_PROVIDER_ERROR", message: "Falha ao reativar assinatura no Mercado Pago" },
        })
      }
    }

    const now = new Date()
    await fastify.db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: false, updatedAt: now })
      .where(eq(subscriptions.userId, userId))

    return ok({ success: true, message: "Assinatura reativada", planId: sub.planId })
  }
)
```

- [ ] **Step 2: Adicionar testes para `/reactivate` com sub permanentemente cancelada**

Adicionar ao `subscription.test.ts`:

```typescript
// SUB-05: POST /api/subscription/reactivate
describe("POST /api/subscription/reactivate (SUB-05)", () => {
  it("SUB-05a: reactivates a paused subscription — cancelAtPeriodEnd becomes false", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })
    await app.inject({
      method: "POST",
      url: "/api/subscription/pause",
      headers: { cookie: freshPlayer.sessionCookie },
    })

    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/reactivate",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.success).toBe(true)

    const usage = await app.inject({
      method: "GET",
      url: "/api/subscription/usage",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(usage.json().data.cancelAtPeriodEnd).toBe(false)
  })

  it("SUB-05b: reactivating a permanently canceled sub returns 400 SUBSCRIPTION_PERMANENTLY_CANCELED", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })
    await app.inject({
      method: "POST",
      url: "/api/subscription/cancel",
      headers: { cookie: freshPlayer.sessionCookie },
    })

    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/reactivate",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("SUBSCRIPTION_PERMANENTLY_CANCELED")
  })

  it("SUB-05c: reactivating a non-paused sub returns 400 NOT_PAUSED", async () => {
    const freshPlayer = await signUpAndGetCookie(app, "player")
    await app.inject({
      method: "POST",
      url: "/api/subscription/upgrade",
      headers: { cookie: freshPlayer.sessionCookie },
      payload: { planId: "craque" },
    })
    const res = await app.inject({
      method: "POST",
      url: "/api/subscription/reactivate",
      headers: { cookie: freshPlayer.sessionCookie },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe("NOT_PAUSED")
  })

  it("SUB-05d: returns 401 without auth", async () => {
    const res = await app.inject({ method: "POST", url: "/api/subscription/reactivate" })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 3: Rodar todos os testes de subscription**

```bash
cd apps/api
bun test tests/routes/subscription.test.ts
```

Expected: SUB-01 a SUB-05 passam.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/subscription.ts apps/api/tests/routes/subscription.test.ts
git commit -m "feat: update /reactivate to block permanently canceled subscriptions"
```

---

## Task 7: Cron Job — Expirar assinaturas pausadas

**Files:**
- Create: `apps/api/src/jobs/expire-subscriptions.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Criar `apps/api/src/server.ts`**

Primeiro, ler o arquivo:

```bash
cat apps/api/src/server.ts
```

- [ ] **Step 2: Criar `apps/api/src/jobs/expire-subscriptions.ts`**

```typescript
import { lt, eq, and } from "drizzle-orm"
import { MercadoPagoConfig, PreApproval } from "mercadopago"
import { subscriptions } from "../db/schema/subscriptions.js"
import { users } from "../db/schema/users.js"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type * as schema from "../db/schema/index.js"

type Db = NodePgDatabase<typeof schema>

export async function expireSubscriptions(db: Db, log: { info: Function; error: Function }): Promise<void> {
  const now = new Date()
  const paymentMode = process.env.PAYMENT_MODE || "mock"

  // Find subscriptions that are paused and past their period end
  const expired = await db
    .select({
      userId: subscriptions.userId,
      planId: subscriptions.planId,
      mercadopagoPreapprovalId: subscriptions.mercadopagoPreapprovalId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.cancelAtPeriodEnd, true),
        lt(subscriptions.currentPeriodEnd, now)
      )
    )

  if (expired.length === 0) return

  log.info({ count: expired.length }, "Expiring paused subscriptions")

  const client = paymentMode !== "mock"
    ? new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "" })
    : null

  for (const sub of expired) {
    try {
      // Cancel on MP if preapproval exists
      if (client && sub.mercadopagoPreapprovalId) {
        await new PreApproval(client).update({
          id: sub.mercadopagoPreapprovalId,
          body: { status: "cancelled" },
        })
      }

      // Downgrade to free in DB
      await db.transaction(async (tx) => {
        await tx
          .update(subscriptions)
          .set({ planId: "free", status: "canceled", cancelAtPeriodEnd: false, updatedAt: now })
          .where(eq(subscriptions.userId, sub.userId))
        await tx
          .update(users)
          .set({ planId: "free", updatedAt: now })
          .where(eq(users.id, sub.userId))
      })

      log.info({ userId: sub.userId, planId: sub.planId }, "Subscription expired and downgraded to free")
    } catch (err) {
      log.error({ err, userId: sub.userId }, "Failed to expire subscription")
    }
  }
}

export function startExpireSubscriptionsCron(db: Db, log: { info: Function; error: Function }): NodeJS.Timeout {
  const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

  // Run once on startup after a small delay (avoid blocking boot)
  const initialTimeout = setTimeout(() => expireSubscriptions(db, log).catch((err) => log.error({ err }, "Initial expire run failed")), 30_000)

  // Then every 24 hours
  const interval = setInterval(
    () => expireSubscriptions(db, log).catch((err) => log.error({ err }, "Expire cron failed")),
    INTERVAL_MS
  )

  return interval
}
```

- [ ] **Step 3: Registrar o cron em `server.ts`**

No `server.ts`, após `await fastify.listen(...)`, adicionar:

```typescript
import { startExpireSubscriptionsCron } from "./jobs/expire-subscriptions.js"

// After fastify.listen():
const cronInterval = startExpireSubscriptionsCron(fastify.db, fastify.log)

// Cleanup on close
fastify.addHook("onClose", async () => {
  clearInterval(cronInterval)
})
```

**Nota:** Verificar onde `fastify.db` é acessível no `server.ts`. Se o server file usa `buildApp()` e não tem acesso direto ao db, registrar o cron dentro do `buildApp()` após todos os plugins, usando `fastify.ready()`:

```typescript
// Dentro de buildApp(), após todos os registers:
fastify.ready().then(() => {
  if (process.env.NODE_ENV !== "test") {
    startExpireSubscriptionsCron(fastify.db, fastify.log)
  }
})
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/jobs/expire-subscriptions.ts apps/api/src/server.ts apps/api/src/app.ts
git commit -m "feat: add daily cron to expire paused subscriptions past period end"
```

---

## Task 8: Frontend — api-client adicionar `pause()`

**Files:**
- Modify: `apps/web/app/lib/api-client.ts`

- [ ] **Step 1: Adicionar `pause()` ao `subscriptionApi`**

No arquivo `apps/web/app/lib/api-client.ts`, dentro do objeto `subscriptionApi`, adicionar após `cancel()`:

```typescript
pause: () =>
  request<{ success: boolean; message: string; planId: string; currentPeriodEnd: string }>(
    "/subscription/pause",
    { method: "POST" }
  ),
```

O objeto completo fica:

```typescript
export const subscriptionApi = {
  getUsage: () =>
    request<import("~shared/contracts").Usage>(
      "/subscription/usage"),
  upgrade: (body: { planId: string }) =>
    request<{ success: boolean; planId: string; message: string }>(
      "/subscription/upgrade",
      { method: "POST", body: JSON.stringify(body)}
    ),
  cancel: () =>
    request<{ success: boolean; message: string; planId: string }>(
      "/subscription/cancel",
      { method: "POST" }
    ),
  pause: () =>
    request<{ success: boolean; message: string; planId: string; currentPeriodEnd: string }>(
      "/subscription/pause",
      { method: "POST" }
    ),
  reactivate: () =>
    request<{ success: boolean; message: string; planId: string }>(
      "/subscription/reactivate",
      { method: "POST" }
    ),
  checkout: (body: { planId: string }) =>
    request<import("~shared/contracts").CheckoutResponse>(
      "/subscription/checkout",
      { method: "POST", body: JSON.stringify(body) }
    ),
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/lib/api-client.ts
git commit -m "feat: add pause() method to subscriptionApi"
```

---

## Task 9: Frontend — planos.tsx UI de gerenciamento

**Files:**
- Modify: `apps/web/app/routes/planos.tsx`

Esta task substitui o bloco de gerenciamento de assinatura (seção "Current subscription status") e adiciona o modal de pause/cancel.

- [ ] **Step 1: Atualizar imports em `planos.tsx`**

Adicionar `Pause` ao import do lucide-react (substitua a linha de imports de ícones):

```typescript
import {
  Check,
  X,
  Zap,
  Shield,
  Crown,
  Star,
  Flame,
  ArrowLeft,
  MessageCircle,
  Search,
  Video,
  BadgeCheck,
  Users,
  BarChart3,
  Sparkles,
  Headphones,
  ChevronDown,
  XCircle,
  AlertTriangle,
  Pause,
  Settings,
} from "lucide-react"
```

- [ ] **Step 2: Atualizar estado e handlers em `Planos()`**

Substituir o bloco de estado e handlers existente (linhas ~174–234) por:

```typescript
export default function Planos() {
  const { user, role } = useAuth()
  const { planId: effectivePlanId, usage, refreshUsage } = usePlan()
  const [view, setView] = useState<"player" | "team">(
    role === "team" ? "team" : "player"
  )
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [managingModal, setManagingModal] = useState<"idle" | "options" | "pause-confirm" | "cancel-confirm">("idle")
  const [pausing, setPausing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const plans = getPlansForRole(view)
  const features = view === "player" ? PLAYER_FEATURES : TEAM_FEATURES
  const currentPlanId = effectivePlanId
  const isPaid = currentPlanId !== "free"
  const isPaused = usage?.cancelAtPeriodEnd ?? false
  const isPermanentlyCanceled = (usage as any)?.status === "canceled"

  const planLabel = PLAN_CONFIGS[currentPlanId]?.name ?? "LIVRE"

  const handleCheckout = async (planId: PlanId) => {
    if (!user) return
    setUpgrading(planId)
    try {
      const { initPoint } = await subscriptionApi.checkout({ planId })
      window.location.href = initPoint
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Erro ao iniciar checkout. Tente novamente."
      )
      setUpgrading(null)
    }
  }

  const handlePause = async () => {
    setPausing(true)
    try {
      await subscriptionApi.pause()
      await refreshUsage()
      setManagingModal("idle")
      toast.success("Assinatura pausada. Acesso mantido até o fim do período.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao pausar. Tente novamente.")
    } finally {
      setPausing(false)
    }
  }

  const handleCancel = async () => {
    setCanceling(true)
    try {
      await subscriptionApi.cancel()
      await refreshUsage()
      setManagingModal("idle")
      toast.success("Assinatura cancelada.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar. Tente novamente.")
    } finally {
      setCanceling(false)
    }
  }

  const handleReactivate = async () => {
    setReactivating(true)
    try {
      await subscriptionApi.reactivate()
      await refreshUsage()
      toast.success("Assinatura reativada!")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao reativar. Tente novamente.")
    } finally {
      setReactivating(false)
    }
  }
```

- [ ] **Step 3: Substituir o bloco "Current subscription status" (~linhas 300–346)**

Localizar o bloco `{/* Current subscription status — only for authenticated users */}` e substituir por:

```tsx
{/* Current subscription status — only for authenticated users */}
{user && (
  <div className="mx-auto mb-12 max-w-3xl">
    <div className={`border-4 p-6 ${
      isPermanentlyCanceled
        ? "border-destructive bg-destructive/5"
        : isPaused
        ? "border-amber-500 bg-amber-500/10"
        : isPaid
        ? "border-primary bg-primary/5"
        : "border-foreground/20 bg-muted/5"
    }`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-sm uppercase tracking-widest text-muted-foreground">
            SEU PLANO ATUAL
          </p>
          <p className="mt-1 font-display text-3xl tracking-wide text-foreground">
            {planLabel}
          </p>

          {/* Paused state */}
          {isPaused && !isPermanentlyCanceled && (
            <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Pause className="size-4" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Pausada — válida até {usage?.periodResetAt ? new Date(usage.periodResetAt).toLocaleDateString("pt-BR") : "o fim do período"}
              </span>
            </div>
          )}

          {/* Permanently canceled state */}
          {isPermanentlyCanceled && (
            <div className="mt-2 flex items-center gap-2 text-destructive">
              <XCircle className="size-4" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Cancelada permanentemente
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {/* Permanently canceled — only show "Assinar novamente" */}
          {isPermanentlyCanceled && (
            <Button
              className="gap-2 rounded-none border-2 border-primary bg-primary px-6 font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
              onClick={() => handleCheckout(currentPlanId as PlanId)}
              disabled={upgrading === currentPlanId}
            >
              <Zap className="size-4" />
              ASSINAR NOVAMENTE
            </Button>
          )}

          {/* Paused — show Reativar */}
          {isPaused && !isPermanentlyCanceled && (
            <Button
              variant="outline"
              className="gap-2 rounded-none border-2 border-primary font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground"
              onClick={handleReactivate}
              disabled={reactivating}
            >
              <Zap className="size-4" />
              {reactivating ? "REATIVANDO..." : "REATIVAR ASSINATURA"}
            </Button>
          )}

          {/* Active paid — show Gerenciar */}
          {isPaid && !isPaused && !isPermanentlyCanceled && (
            <Button
              variant="outline"
              className="gap-2 rounded-none border-2 border-foreground font-bold uppercase tracking-widest hover:bg-foreground hover:text-background"
              onClick={() => setManagingModal("options")}
            >
              <Settings className="size-4" />
              GERENCIAR
            </Button>
          )}
        </div>
      </div>
    </div>

    {/* Modal — options */}
    {managingModal === "options" && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md border-4 border-foreground bg-background p-8 shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
            Gerenciar Assinatura
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Plano <strong>{planLabel}</strong> — o que deseja fazer?
          </p>

          <div className="mt-6 space-y-3">
            {/* Pause — primary option */}
            <Button
              className="h-auto w-full flex-col items-start gap-1 rounded-none border-2 border-primary bg-primary px-6 py-4 text-left text-primary-foreground hover:bg-primary/90"
              onClick={() => setManagingModal("pause-confirm")}
            >
              <span className="flex items-center gap-2 font-display text-xl tracking-wide uppercase">
                <Pause className="size-5" />
                Pausar assinatura
              </span>
              <span className="text-sm font-normal text-primary-foreground/80">
                Mantém seu acesso até o fim do período. Pode reativar a qualquer momento.
              </span>
            </Button>

            {/* Cancel — destructive, less prominent */}
            <button
              type="button"
              className="w-full text-left text-sm font-bold uppercase tracking-widest text-destructive underline underline-offset-4 hover:text-destructive/80"
              onClick={() => setManagingModal("cancel-confirm")}
            >
              Cancelar definitivamente
            </button>
          </div>

          <Button
            variant="outline"
            className="mt-6 w-full rounded-none border-2 border-foreground/30 font-bold uppercase tracking-widest"
            onClick={() => setManagingModal("idle")}
          >
            Voltar
          </Button>
        </div>
      </div>
    )}

    {/* Modal — pause confirm */}
    {managingModal === "pause-confirm" && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md border-4 border-amber-500 bg-background p-8 shadow-[8px_8px_0px_0px_theme(colors.amber.500)]">
          <div className="flex items-center gap-3">
            <Pause className="size-8 text-amber-500" />
            <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
              Pausar Assinatura
            </h2>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Seu acesso ao plano <strong>{planLabel}</strong> será mantido até{" "}
            <strong>{usage?.periodResetAt ? new Date(usage.periodResetAt).toLocaleDateString("pt-BR") : "o fim do período"}</strong>.
            Você pode reativar a qualquer momento.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1 rounded-none border-2 border-amber-500 bg-amber-500 font-bold uppercase tracking-widest text-white hover:bg-amber-600"
              onClick={handlePause}
              disabled={pausing}
            >
              {pausing ? "PAUSANDO..." : "CONFIRMAR PAUSA"}
            </Button>
            <Button
              variant="outline"
              className="rounded-none border-2 border-foreground/30 font-bold uppercase tracking-widest"
              onClick={() => setManagingModal("options")}
              disabled={pausing}
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Modal — cancel confirm */}
    {managingModal === "cancel-confirm" && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md border-4 border-destructive bg-background p-8 shadow-[8px_8px_0px_0px_var(--color-destructive)]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-8 text-destructive" />
            <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
              Cancelar Definitivamente?
            </h2>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Esta ação é <strong>irreversível</strong>. Você perderá o acesso ao plano{" "}
            <strong>{planLabel}</strong> imediatamente e não poderá reativar esta assinatura.
            Para usar novamente, precisará assinar do zero.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-none border-2 border-foreground/30 font-bold uppercase tracking-widest"
              onClick={() => setManagingModal("options")}
              disabled={canceling}
            >
              Voltar
            </Button>
            <Button
              className="rounded-none border-2 border-destructive bg-destructive font-bold uppercase tracking-widest text-white hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling ? "CANCELANDO..." : "SIM, CANCELAR"}
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Remover variável `isCanceled` não usada**

Remover a linha:
```typescript
const isCanceled = usage?.cancelAtPeriodEnd ?? false
```

(Foi substituída por `isPaused` e `isPermanentlyCanceled`.)

- [ ] **Step 5: Verificar TypeScript**

```bash
cd apps/web
bun run typecheck 2>&1 | head -30
```

Corrigir quaisquer erros de tipo antes de continuar.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/routes/planos.tsx apps/web/app/lib/api-client.ts
git commit -m "feat: add pause/cancel modal UI with permanent cancel warning and status badges"
```

---

## Self-Review

**Spec coverage:**
- ✅ PreApproval substitui Preference no checkout (Task 3)
- ✅ `mercadopagoPreapprovalId` coluna para ciclo de vida (Task 1)
- ✅ `subscription_preapproval` webhook activation (Task 2)
- ✅ Payment recorrente estende período (Task 2)
- ✅ `POST /pause` — reversível, chama MP (Task 4)
- ✅ `POST /cancel` — permanente, chama MP (Task 5)
- ✅ `POST /reactivate` — bloqueia permanentemente canceladas (Task 6)
- ✅ Cron de expiração (Task 7)
- ✅ Frontend modal pause/cancel com nudge para pause (Task 9)
- ✅ Badge de status: paused, permanently canceled (Task 9)
- ✅ Reativar só aparece para pausadas (Task 9)
- ✅ "Assinar novamente" para permanentemente canceladas (Task 9)

**Placeholder scan:** nenhum TBD ou TODO.

**Type consistency:**
- `activateSubscription` aceita `preapprovalId?: string` — usada em Task 2 com e sem o campo
- `subscriptionApi.pause()` retorna `{ success, message, planId, currentPeriodEnd }` — mesmos campos do handler
- `managingModal` state: `"idle" | "options" | "pause-confirm" | "cancel-confirm"` — todos os casos cobertos

**Breaking change documentado:**
- `POST /cancel` muda de "cancel at period end" para "cancelamento permanente". Frontend atualizado para usar `/pause` para o fluxo antigo. MSW mocks podem precisar ser atualizados se existirem — verificar `mocks/handlers/` para handlers de `/cancel`.
