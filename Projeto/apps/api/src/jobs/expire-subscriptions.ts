import { lt, eq, and } from "drizzle-orm"
import { MercadoPagoConfig, PreApproval } from "mercadopago"
import { subscriptions } from "../db/schema/subscriptions.js"
import { users } from "../db/schema/users.js"

export async function expireSubscriptions(db: any, log: { info: Function; error: Function }): Promise<void> {
  const now = new Date()
  const paymentMode = process.env.PAYMENT_MODE || "mock"

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
      if (client && sub.mercadopagoPreapprovalId) {
        await new PreApproval(client).update({
          id: sub.mercadopagoPreapprovalId,
          body: { status: "cancelled" } as any,
        })
      }

      await db.transaction(async (tx: any) => {
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

export function startExpireSubscriptionsCron(db: any, log: { info: Function; error: Function }): ReturnType<typeof setInterval> {
  const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

  // Run once on startup after 30s delay (avoid blocking boot)
  setTimeout(
    () => expireSubscriptions(db, log).catch((err: unknown) => log.error({ err }, "Initial expire run failed")),
    30_000
  )

  // Then every 24 hours
  return setInterval(
    () => expireSubscriptions(db, log).catch((err: unknown) => log.error({ err }, "Expire cron failed")),
    INTERVAL_MS
  )
}
