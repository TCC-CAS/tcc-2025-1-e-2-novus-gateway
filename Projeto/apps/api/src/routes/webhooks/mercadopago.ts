import type { FastifyPluginAsync } from "fastify"
import { createHmac, timingSafeEqual } from "crypto"
import { eq } from "drizzle-orm"
import { MercadoPagoConfig, Payment } from "mercadopago"
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
  // MP signature manifest: id:<paymentId>;request-id:<xRequestId>;ts:<ts>;
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  } catch {
    return false
  }
}

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/mercadopago", async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const type = body.type as string | undefined
    const action = body.action as string | undefined
    const data = body.data as Record<string, string> | undefined
    const paymentId = data?.id

    const isPaymentEvent =
      type === "payment" ||
      action === "payment.created" ||
      action === "payment.updated"

    if (!isPaymentEvent || !paymentId) {
      return ok({ received: true })
    }

    // Verify signature when secret is configured
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (webhookSecret) {
      const xSignature = request.headers["x-signature"] as string | undefined
      const xRequestId = request.headers["x-request-id"] as string | undefined

      if (!xSignature || !xRequestId) {
        return reply.status(400).send({ error: { code: "MISSING_SIGNATURE", message: "Missing webhook signature" } })
      }

      // Parse ts and v1 from "ts=<ts>,v1=<hash>"
      const parts = Object.fromEntries(
        xSignature.split(",").map((p) => p.split("=") as [string, string])
      )
      const ts = parts["ts"]
      const v1 = parts["v1"]

      if (!ts || !v1 || !verifySignature(webhookSecret, paymentId, xRequestId, ts, v1)) {
        request.log.warn({ paymentId }, "Webhook signature verification failed")
        return reply.status(401).send({ error: { code: "INVALID_SIGNATURE", message: "Webhook signature mismatch" } })
      }

      // Reject events older than 5 minutes (replay attack protection)
      const age = Date.now() / 1000 - parseInt(ts, 10)
      if (age > 300) {
        return reply.status(400).send({ error: { code: "STALE_EVENT", message: "Webhook event too old" } })
      }
    }

    // Fetch payment from MP API — never trust payload alone
    try {
      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
      })
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

      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      await fastify.db.transaction(async (tx) => {
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

      request.log.info({ paymentId, userId, planId }, "Subscription activated via webhook")
    } catch (err) {
      fastify.log.error({ err, paymentId }, "Webhook processing failed")
      // Return 200 so MP doesn't retry indefinitely for non-retriable errors
    }

    return ok({ received: true })
  })
}

export default webhookRoutes
