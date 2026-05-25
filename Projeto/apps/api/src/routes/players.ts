import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq, desc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { players, users, teams } from "../db/schema/index.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { profileViews } from "../db/schema/profile-views.js"
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

  // GET /me/views — who viewed this player's profile (craque/fenomeno only)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/me/views",
    { preHandler: [requireRole("player")] },
    async (request, reply) => {
      const userId = request.session!.user.id

      // Gate: only craque/fenomeno can see profile views
      const sub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      })
      const planId = (sub?.planId ?? "free") as PlanId
      const limits = getPlanLimits(planId, "player")
      if (!limits.profileViews) {
        return reply.status(403).send({
          error: {
            code: "PLAN_REQUIRED",
            message: "Visualizações de perfil estão disponíveis nos planos CRAQUE e FENÔMENO.",
          },
        })
      }

      // Return last 50 views with viewer info (team name + logo)
      const rows = await fastify.db
        .select({
          id: profileViews.id,
          viewedAt: profileViews.viewedAt,
          viewerUserId: profileViews.viewerId,
          viewerName: users.name,
          teamLogoUrl: teams.logoUrl,
          teamRegion: teams.region,
          teamCity: teams.city,
          teamLevel: teams.level,
        })
        .from(profileViews)
        .innerJoin(users, eq(users.id, profileViews.viewerId))
        .leftJoin(teams, eq(teams.userId, profileViews.viewerId))
        .where(eq(profileViews.playerUserId, userId))
        .orderBy(desc(profileViews.viewedAt))
        .limit(50)

      return ok(
        rows.map((r) => ({
          id: String(r.id),
          viewedAt: r.viewedAt.toISOString(),
          viewer: {
            userId: r.viewerUserId,
            name: r.viewerName,
            logoUrl: r.teamLogoUrl ?? null,
            region: r.teamRegion ?? null,
            city: r.teamCity ?? null,
            level: r.teamLevel ?? null,
          },
        }))
      )
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
      // Default false: only teams with profissional plan can see career/stats
      let viewerCanSeeCareer = false
      let viewerCanSeeStats = false
      if (viewerRole === "team") {
        const viewerSub = await fastify.db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, viewerUserId),
        })
        const viewerPlanId = (viewerSub?.planId ?? "free") as PlanId
        const viewerLimits = getPlanLimits(viewerPlanId, "team")
        viewerCanSeeCareer = viewerLimits.playerCareerAccess
        viewerCanSeeStats = viewerLimits.playerStatsAccess
      }

      // Record profile view (fire-and-forget — don't block response)
      // Only record when team views another player's profile
      if (viewerRole === "team") {
        fastify.db.insert(profileViews).values({
          viewerId: viewerUserId,
          playerUserId: profile.userId,
          viewedAt: new Date(),
        }).catch(() => { /* non-critical */ })
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
