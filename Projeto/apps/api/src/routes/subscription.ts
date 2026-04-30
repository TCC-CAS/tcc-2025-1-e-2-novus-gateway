import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq, or, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { conversations } from "../db/schema/conversations.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import {
  PlanIdSchema,
  getPlanLimits,
} from "../../../../apps/web/shared/contracts/subscription.js"

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

      // Count favorites (placeholder until favorites feature is built)
      const favoritesUsed = 0

      return ok({
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

      // D-19: Upsert — create row if not exists, update planId in-place (no history)
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const [result] = await fastify.db
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
            updatedAt: now,
          },
        })
        .returning()

      // D-20: Response shape
      return ok({
        success: !!result,
        planId: result?.planId ?? planId,
        message: result ? `Upgraded to ${planId}` : "Upgrade failed",
      })
    }
  )
}

export default subscriptionRoutes
