# Track 1 Phase 1C — MercadoPago Sandbox Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate MercadoPago sandbox checkout flow so users can "pay" for plan upgrades through MP's test environment, with webhook confirmation.

**Architecture:** Backend creates a MP Preference (order) → returns checkout URL → frontend redirects → user pays in MP sandbox → MP sends IPN webhook → backend confirms payment and activates subscription.

**Tech Stack:** MercadoPago SDK (`mercadopago`), Fastify, Zod

**Prerequisites:** Track 1 Phase 1A complete. MercadoPago sandbox account created at https://www.mercadopago.com.br/developers/

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `shared/contracts/payment.ts` | Create | Zod schemas for checkout/webhook |
| `shared/contracts/index.ts` | Modify | Re-export payment contracts |
| `apps/api/src/routes/webhooks/mercadopago.ts` | Create | Webhook handler |
| `apps/api/src/routes/subscription.ts` | Modify | Add checkout endpoint |
| `apps/api/src/app.ts` | Modify | Register webhook route |
| `apps/web/app/lib/api-client.ts` | Modify | Add checkout API method |
| `apps/web/app/routes/planos.tsx` | Modify | Connect to checkout flow |
| `apps/web/app/routes/pagamento-sucesso.tsx` | Create | Success redirect page |
| `apps/api/package.json` | Modify | Add mercadopago dependency |

---

## Task 1: Install MercadoPago SDK and create payment contracts

**Files:**
- Modify: `apps/api/package.json`
- Create: `shared/contracts/payment.ts`
- Modify: `shared/contracts/index.ts`

- [ ] **Step 1: Install MercadoPago SDK**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && pnpm add mercadopago`

- [ ] **Step 2: Create payment contracts**

```typescript
import { z } from "zod";

export const CheckoutRequestSchema = z.object({
  planId: z.enum(["craque", "titular", "campeao"]),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const CheckoutResponseSchema = z.object({
  initPoint: z.string().url(),
  preferenceId: z.string(),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

export const WebhookPayloadSchema = z.object({
  type: z.string().optional(),
  action: z.string().optional(),
  data: z.object({
    id: z.string().optional(),
  }).optional(),
  live_mode: z.boolean().optional(),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
```

- [ ] **Step 3: Export from index.ts**

Add `export * from "./payment.js";` to `shared/contracts/index.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json shared/contracts/payment.ts shared/contracts/index.ts
git commit -m "feat: add MercadoPago SDK and payment contracts"
```

---

## Task 2: Add checkout endpoint to subscription route

**Files:**
- Modify: `apps/api/src/routes/subscription.ts`

- [ ] **Step 1: Add environment variables**

Add to `.env.example` and `.env`:

```
MERCADOPAGO_ACCESS_TOKEN=your-sandbox-token
MERCADOPAGO_WEBHOOK_URL=https://api.yourdomain.com/api/webhooks/mercadopago
```

- [ ] **Step 2: Add checkout endpoint**

Add a `POST /checkout` endpoint to `apps/api/src/routes/subscription.ts`. Import MercadoPago at the top:

```typescript
import MercadoPago, { Preference } from "mercadopago"
import { CheckoutRequestSchema } from "../../../../shared/contracts/payment.js"
```

Inside the route handler, add before the closing `}`:

```typescript
  // POST /checkout — create MercadoPago preference and return checkout URL
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/checkout",
    {
      preHandler: [requireSession],
      schema: { body: CheckoutRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"
      const { planId } = request.body

      // Validate role-plan compatibility
      const playerPlans = ["craque"]
      const teamPlans = ["titular", "campeao"]
      if (role === "player" && !playerPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Jogadores só podem assinar o plano CRAQUE" },
        })
      }
      if (role === "team" && !teamPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Times só podem assinar TITULAR ou CAMPEÃO" },
        })
      }

      const planConfig = PLAN_CONFIGS[planId as keyof typeof PLAN_CONFIGS]
      if (!planConfig) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Plano inválido" },
        })
      }

      // Create MercadoPago preference
      const mp = new MercadoPago({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "" })
      const preference = new Preference(mp)

      const result = await preference.create({
        body: {
          items: [{
            id: planId,
            title: `VárzeaPro ${planConfig.name}`,
            description: planConfig.description,
            quantity: 1,
            unit_price: planConfig.price,
            currency_id: "BRL",
          }],
          payer: { email: request.session!.user.email },
          back_urls: {
            success: `${process.env.CORS_ORIGIN || "http://localhost:5173"}/pagamento-sucesso`,
            failure: `${process.env.CORS_ORIGIN || "http://localhost:5173"}/planos`,
            pending: `${process.env.CORS_ORIGIN || "http://localhost:5173"}/planos`,
          },
          notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,
          external_reference: JSON.stringify({ userId, planId }),
          metadata: { userId, planId },
        },
      })

      const initPoint = result.sandbox_init_point || result.init_point || ""

      return ok({ initPoint, preferenceId: result.id })
    }
  )
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/subscription.ts
git commit -m "feat: add MercadoPago checkout endpoint"
```

---

## Task 3: Create webhook handler

**Files:**
- Create: `apps/api/src/routes/webhooks/mercadopago.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Create webhook directory and file**

```typescript
import type { FastifyPluginAsync } from "fastify"
import { eq } from "drizzle-orm"
import { subscriptions } from "../../db/schema/subscriptions.js"
import { users } from "../../db/schema/users.js"
import { ok } from "../../lib/response.js"
import { WebhookPayloadSchema } from "../../../../../shared/contracts/payment.js"

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /mercadopago — IPN webhook from MercadoPago
  fastify.post("/mercadopago", async (request, reply) => {
    const body = request.body as Record<string, unknown>

    // MP sends different notification types
    const type = body.type as string
    const action = body.action as string

    // We only care about payment notifications
    if (type === "payment" || action === "payment.created" || action === "payment.updated") {
      const paymentId = (body.data as Record<string, string>)?.id

      if (paymentId) {
        try {
          // In sandbox, fetch payment details from MP API
          // For now, parse the external_reference to get userId and planId
          // Production would fetch from MP API: GET /v1/payments/{paymentId}
          const externalRef = body.external_reference as string | undefined
          if (externalRef) {
            const { userId, planId } = JSON.parse(externalRef)

            // Activate subscription
            const now = new Date()
            const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

            await fastify.db.transaction(async (tx) => {
              await tx
                .insert(subscriptions)
                .values({
                  id: `mp_${paymentId}`,
                  userId,
                  planId,
                  status: "active",
                  currentPeriodStart: now,
                  currentPeriodEnd: periodEnd,
                  cancelAtPeriodEnd: false,
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
                    updatedAt: now,
                  },
                })

              await tx
                .update(users)
                .set({ planId, updatedAt: now })
                .where(eq(users.id, userId))
            })
          }
        } catch (err) {
          fastify.log.error({ err }, "Webhook processing failed")
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return ok({ received: true })
  })
}

export default webhookRoutes
```

- [ ] **Step 2: Register webhook route in app.ts**

Add after the gallery route registration:

```typescript
  await fastify.register(import("./routes/webhooks/mercadopago.js"), { prefix: "/api/webhooks" })
```

- [ ] **Step 3: Commit**

```bash
mkdir -p apps/api/src/routes/webhooks
git add apps/api/src/routes/webhooks/mercadopago.ts apps/api/src/app.ts
git commit -m "feat: add MercadoPago webhook handler for payment confirmation"
```

---

## Task 4: Update frontend — API client and planos page

**Files:**
- Modify: `apps/web/app/lib/api-client.ts`
- Modify: `apps/web/app/routes/planos.tsx`
- Create: `apps/web/app/routes/pagamento-sucesso.tsx`

- [ ] **Step 1: Add checkout method to subscriptionApi**

In `apps/web/app/lib/api-client.ts`, add to the `subscriptionApi` object:

```typescript
  checkout: (body: { planId: string }) =>
    request<import("~shared/contracts").CheckoutResponse>(
      "/subscription/checkout",
      { method: "POST", body: JSON.stringify(body) }
    ),
```

- [ ] **Step 2: Update planos page to redirect to MP checkout**

In `apps/web/app/routes/planos.tsx`, connect the "Assinar" buttons to call `subscriptionApi.checkout()` and redirect to the returned `initPoint` URL.

- [ ] **Step 3: Create success page**

Create a simple success page at `apps/web/app/routes/pagamento-sucesso.tsx` that shows a confirmation message and links back to the home page.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/lib/api-client.ts apps/web/app/routes/planos.tsx apps/web/app/routes/pagamento-sucesso.tsx
git commit -m "feat: connect planos page to MercadoPago checkout flow"
```
