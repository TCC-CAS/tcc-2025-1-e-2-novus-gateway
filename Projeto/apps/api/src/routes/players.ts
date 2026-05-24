import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { players } from "../db/schema/index.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
import type { PlanId } from "../../../../shared/contracts/subscription.js"
import { UpsertPlayerProfileRequestSchema } from "../../../../shared/contracts/players.js"

const playersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /me — authenticated player only
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    { preHandler: [requireRole("player")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.userId, userId),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }
      return ok({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )

  // PUT /me — upsert player profile
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/me",
    {
      preHandler: [requireRole("player")],
      schema: { body: UpsertPlayerProfileRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const fields = request.body as z.infer<typeof UpsertPlayerProfileRequestSchema>
      const [result] = await fastify.db
        .insert(players)
        .values({
          id: nanoid(),
          userId,
          ...fields,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: players.userId,
          set: { ...fields, updatedAt: new Date() },
        })
        .returning()
      return ok({
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      })
    }
  )

  // GET /:id — any authenticated user (career/stats gated by plan)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const viewerUserId = request.session!.user.id
      const viewerRole = request.session!.user.role as "player" | "team" | "admin"

      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.id, request.params.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }

      // Own profile: always full data
      if (profile.userId === viewerUserId) {
        return ok({
          ...profile,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        })
      }

      // Get player's subscription to know what they've unlocked to show
      const playerSub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, profile.userId),
      })
      const playerPlanId = (playerSub?.planId ?? "free") as PlanId
      const playerCanShowCareer = ["craque", "fenomeno"].includes(playerPlanId)
      const playerCanShowStats = playerPlanId === "fenomeno"

      // Get viewer's subscription to know what they can see
      let viewerCanSeeCareer = true
      let viewerCanSeeStats = true
      if (viewerRole === "team") {
        const viewerSub = await fastify.db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, viewerUserId),
        })
        const viewerPlanId = (viewerSub?.planId ?? "free") as PlanId
        const viewerLimits = getPlanLimits(viewerPlanId, "team")
        viewerCanSeeCareer = viewerLimits.playerCareerAccess
        viewerCanSeeStats = viewerLimits.playerStatsAccess
      }

      return ok({
        ...profile,
        careerHistory: playerCanShowCareer && viewerCanSeeCareer ? profile.careerHistory : [],
        detailedStats: playerCanShowStats && viewerCanSeeStats ? profile.detailedStats : null,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )
}

export default playersRoutes
