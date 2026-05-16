import type { FastifyPluginAsync } from "fastify"
import { eq } from "drizzle-orm"
import { subscriptions } from "../../db/schema/subscriptions.js"
import { users } from "../../db/schema/users.js"
import { ok } from "../../lib/response.js"

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /mercadopago — IPN webhook from MercadoPago
  fastify.post("/mercadopago", async (request, reply) => {
    const body = request.body as Record<string, unknown>

    const type = body.type as string
    const action = body.action as string

    if (type === "payment" || action === "payment.created" || action === "payment.updated") {
      const data = body.data as Record<string, string> | undefined
      const paymentId = data?.id

      if (paymentId) {
        try {
          const externalRef = body.external_reference as string | undefined
          if (externalRef) {
            const { userId, planId } = JSON.parse(externalRef)

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

    return ok({ received: true })
  })
}

export default webhookRoutes
