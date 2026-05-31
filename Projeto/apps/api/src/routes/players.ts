import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq, desc, or, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { fromNodeHeaders } from "better-auth/node"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { players, users, teams, connections } from "../db/schema/index.js"
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

  // GET /:id — public (no auth required); career/stats gated by plan when authenticated
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const session = await fastify.auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      })
      const viewerUserId = session?.user.id
      const viewerRole = (session?.user as { role?: string } | undefined)?.role as "player" | "team" | "admin" | undefined

      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.id, request.params.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }

      // Own profile: always full data
      if (viewerUserId && profile.userId === viewerUserId) {
        return ok({
          ...profile,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        })
      }

      // Unauthenticated: return basic profile only (no career/stats/phone)
      if (!viewerUserId) {
        const playerSub = await fastify.db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, profile.userId),
        })
        const playerPlanId = (playerSub?.planId ?? "free") as PlanId
        const cardTier = playerPlanId === "craque" ? "gold"
          : playerPlanId === "fenomeno" ? "legendary"
          : "none"

        return ok({
          ...profile,
          phone: null,
          careerHistory: [],
          detailedStats: null,
          cardTier,
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
      const cardTier = playerPlanId === "craque" ? "gold"
        : playerPlanId === "fenomeno" ? "legendary"
        : "none"

      // Record profile view (fire-and-forget — don't block response)
      // Only record when team views another player's profile
      if (viewerRole === "team") {
        fastify.db.insert(profileViews).values({
          viewerId: viewerUserId,
          playerUserId: profile.userId,
          viewedAt: new Date(),
        }).catch(() => { /* non-critical */ })
      }

      // Gate phone: only expose if viewer has an accepted connection with this player
      const acceptedConn = await fastify.db.query.connections.findFirst({
        where: or(
          and(
            eq(connections.requesterId, viewerUserId),
            eq(connections.receiverId, profile.userId),
            eq(connections.status, "accepted")
          ),
          and(
            eq(connections.requesterId, profile.userId),
            eq(connections.receiverId, viewerUserId),
            eq(connections.status, "accepted")
          )
        ),
      })
      const exposedPhone: string | null = acceptedConn ? (profile.phone ?? null) : null

      return ok({
        ...profile,
        phone: exposedPhone,
        cardTier,
        careerHistory: profile.careerHistory ?? [],
        detailedStats: profile.detailedStats ?? null,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )
}

export default playersRoutes
