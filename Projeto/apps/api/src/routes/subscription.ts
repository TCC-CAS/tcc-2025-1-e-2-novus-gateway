import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq, or, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { MercadoPagoConfig, Preference } from "mercadopago"
import { requireSession } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { users } from "../db/schema/users.js"
import { conversations } from "../db/schema/conversations.js"
import { favorites } from "../db/schema/favorites.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import {
  PlanIdSchema,
  getPlanLimits,
  PLAN_CONFIGS,
} from "../../../../shared/contracts/subscription.js"
import type { PlanId } from "../../../../shared/contracts/subscription.js"
import { CheckoutRequestSchema } from "../../../../shared/contracts/payment.js"

const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /usage — authenticated users get plan + usage info (D-15, D-16, D-17)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/usage",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"

      // D-15: Auto-create free subscription if missing (upsert — idempotent)
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const [sub] = await fastify.db
        .insert(subscriptions)
        .values({
          id: nanoid(),
          userId,
          planId: "free",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: { updatedAt: now }, // Keep existing planId — only touch updatedAt on conflict
        })
        .returning()

      // D-13: Per-request DB lookup (already have sub from upsert)
      const limits = getPlanLimits(sub.planId, role)

      // Count actual conversations for this user
      const [convRow] = await fastify.db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(
          or(
            eq(conversations.participantA, userId),
            eq(conversations.participantB, userId)
          )
        )
      const conversationsUsed = convRow?.count ?? 0

      // Count open positions for team profiles
      let openPositionsUsed = 0
      if (role === "team") {
        const [teamRow] = await fastify.db
          .select({ positions: teams.openPositions })
          .from(teams)
          .where(eq(teams.userId, userId))
          .limit(1)
        openPositionsUsed = teamRow?.positions?.length ?? 0
      }

      // Count actual favorites
      const [favRow] = await fastify.db
        .select({ count: sql<number>`count(*)::int` })
        .from(favorites)
        .where(eq(favorites.userId, userId))
      const favoritesUsed = favRow?.count ?? 0

      return ok({
        planId: sub.planId,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        conversationsUsed,
        conversationsLimit: limits.conversations,
        searchResultsLimit: limits.searchResults,
        openPositionsUsed,
        openPositionsLimit: limits.openPositions,
        favoritesUsed,
        favoritesLimit: limits.favorites,
        periodResetAt: sub.currentPeriodEnd.toISOString(),
      })
    }
  )

  // POST /upgrade — authenticated users upgrade their plan (D-18, D-19, D-20)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/upgrade",
    {
      preHandler: [requireSession],
      schema: { body: z.object({ planId: PlanIdSchema }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"
      const { planId } = request.body

      // D-18: Role-plan compatibility validation
      const playerPlans = ["free", "craque"]
      const teamPlans = ["free", "titular", "campeao"]
      if (role === "player" && !playerPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Players can only upgrade to craque" },
        })
      }
      if (role === "team" && !teamPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Teams can only upgrade to titular or campeao" },
        })
      }

      // D-19: Upsert subscription and update users.planId in a transaction
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const result = await fastify.db.transaction(async (tx) => {
        const [sub] = await tx
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
          .returning()

        await tx
          .update(users)
          .set({ planId, updatedAt: now })
          .where(eq(users.id, userId))

        return sub
      })

      // D-20: Response shape
      return ok({
        success: !!result,
        planId: result?.planId ?? planId,
        message: result ? `Plano alterado para ${planId}` : "Falha ao alterar plano",
      })
    }
  )

  // POST /cancel — cancel subscription at period end (D-21)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/cancel",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id

      const [sub] = await fastify.db
        .select({
          planId: subscriptions.planId,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
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
          error: { code: "ALREADY_CANCELED", message: "Assinatura já está cancelada" },
        })
      }

      const now = new Date()
      await fastify.db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: now })
        .where(eq(subscriptions.userId, userId))

      return ok({
        success: true,
        message: "Assinatura será cancelada ao final do período",
        planId: sub.planId,
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      })
    }
  )

  // POST /checkout — create MercadoPago preference and return checkout URL
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/checkout",
    {
      preHandler: [requireSession],
      schema: { body: CheckoutRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const email = request.session!.user.email
      const role = request.session!.user.role as "player" | "team"
      const { planId } = request.body as { planId: PlanId }

      // Checkout is only for paid plans
      if (planId === "free") {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Checkout não disponível para o plano gratuito" },
        })
      }

      // Role-plan compatibility
      const playerPlans = ["free", "craque"]
      const teamPlans = ["free", "titular", "campeao"]
      if (role === "player" && !playerPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Jogadores só podem assinar o plano Craque" },
        })
      }
      if (role === "team" && !teamPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Times só podem assinar os planos Titular ou Campeão" },
        })
      }

      const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173"
      const paymentMode = process.env.PAYMENT_MODE || "mock"

      // Mock mode: activate plan directly, redirect to success page
      if (paymentMode === "mock") {
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

        return ok({
          initPoint: `${frontendUrl}/pagamento-sucesso`,
          preferenceId: `mock_${nanoid()}`,
        })
      }

      // MercadoPago mode
      const planConfig = PLAN_CONFIGS[planId as keyof typeof PLAN_CONFIGS]
      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
      })
      const preference = new Preference(client)

      try {
        const result = await preference.create({
          body: {
            items: [
              {
                id: planId,
                title: `VarzeaPro ${planConfig.name}`,
                quantity: 1,
                unit_price: planConfig.price,
                currency_id: "BRL",
              },
            ],
            payer: { email },
            back_urls: {
              success: `${frontendUrl}/planos?status=success`,
              failure: `${frontendUrl}/planos?status=failure`,
              pending: `${frontendUrl}/planos?status=pending`,
            },
            auto_return: "approved",
            notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,
            external_reference: JSON.stringify({ userId, planId }),
          },
        })

        return ok({
          initPoint: result.sandbox_init_point ?? result.init_point,
          preferenceId: result.id,
        })
      } catch (error) {
        request.log.error({ error }, "MercadoPago preference creation failed")
        return reply.status(502).send({
          error: { code: "PAYMENT_PROVIDER_ERROR", message: "Falha ao criar preferência de pagamento" },
        })
      }
    }
  )
}

export default subscriptionRoutes
