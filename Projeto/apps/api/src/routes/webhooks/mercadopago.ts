import type { FastifyPluginAsync } from "fastify"
import { createHmac, timingSafeEqual } from "crypto"
import { eq } from "drizzle-orm"
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "../../db/schema/index.js"
import { subscriptions } from "../../db/schema/subscriptions.js"
import { users } from "../../db/schema/users.js"
import { ok } from "../../lib/response.js"
import { nanoid } from "nanoid"
import type { PlanId } from "../../../../../shared/contracts/subscription.js"

type Db = NodePgDatabase<typeof schema>

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

async function activateSubscription(
  db: Db,
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

async function deactivateSubscription(db: Db, { userId }: { userId: string }): Promise<void> {
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

        let parsedPreapproval: { userId: string; planId: PlanId }
        try {
          parsedPreapproval = JSON.parse(externalRef) as { userId: string; planId: PlanId }
        } catch {
          request.log.error({ preapprovalId: resourceId }, "Malformed external_reference JSON — skipping")
          return ok({ received: true })
        }
        const { userId, planId } = parsedPreapproval

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

      let parsed: { userId: string; planId: PlanId }
      try {
        parsed = JSON.parse(externalRef) as { userId: string; planId: PlanId }
      } catch {
        request.log.error({ paymentId }, "Malformed external_reference JSON — skipping")
        return ok({ received: true })
      }
      const { userId, planId } = parsed

      const [existingSub] = await fastify.db
        .select({ status: subscriptions.status, planId: subscriptions.planId })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1)

      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      if (existingSub?.status === "active" && existingSub.planId === planId) {
        await fastify.db.transaction(async (tx: any) => {
          await tx
            .update(subscriptions)
            .set({ currentPeriodStart: now, currentPeriodEnd: periodEnd, updatedAt: now })
            .where(eq(subscriptions.userId, userId))
        })
        request.log.info({ paymentId, userId, planId }, "Subscription period extended via payment webhook")
      } else if (!existingSub) {
        await activateSubscription(fastify.db, { userId, planId })
        request.log.info({ paymentId, userId, planId }, "Subscription activated via payment webhook (fallback)")
      } else {
        request.log.warn({ paymentId, userId, existingPlanId: existingSub.planId, planId }, "Payment planId mismatch or non-active sub — skipping")
      }
    } catch (err) {
      fastify.log.error({ err, paymentId }, "Payment webhook processing failed")
    }

    return ok({ received: true })
  })
}

export default webhookRoutes
