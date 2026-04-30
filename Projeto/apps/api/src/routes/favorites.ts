import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { and, eq, sql, desc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { AppError } from "../lib/errors.js"
import { favorites } from "../db/schema/favorites.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { users } from "../db/schema/users.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import { getPlanLimits } from "../../../../apps/web/shared/contracts/subscription.js"

const favoriteRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /favorites — favorite a user (player or team owner)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/favorites",
    {
      preHandler: [requireSession],
      schema: {
        body: z.object({ targetUserId: z.string() }),
      },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as "player" | "team"
      const { targetUserId } = request.body

      if (userId === targetUserId) {
        throw new AppError(400, "INVALID_TARGET", "Cannot favorite yourself")
      }

      // Check plan limits
      const [sub] = await fastify.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1)

      const limits = getPlanLimits(sub?.planId ?? "free", role)

      // Count current favorites
      const [countRow] = await fastify.db
        .select({ count: sql<number>`count(*)::int` })
        .from(favorites)
        .where(eq(favorites.userId, userId))

      if ((countRow?.count ?? 0) >= limits.favorites) {
        throw new AppError(403, "FAVORITE_LIMIT_REACHED", "Favorite limit reached for your plan")
      }

      // Check if already favorited
      const [existing] = await fastify.db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.targetUserId, targetUserId)))

      if (existing) {
        return reply.code(200).send(ok({ id: existing.id, favorited: true }))
      }

      const [fav] = await fastify.db
        .insert(favorites)
        .values({
          id: nanoid(),
          userId,
          targetUserId,
          createdAt: new Date(),
        })
        .returning()

      return reply.code(201).send(ok({ id: fav.id, favorited: true }))
    }
  )

  // DELETE /favorites/:targetUserId — unfavorite
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/favorites/:targetUserId",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ targetUserId: z.string() }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { targetUserId } = request.params

      await fastify.db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.targetUserId, targetUserId)))

      return reply.code(200).send(ok({ favorited: false }))
    }
  )

  // GET /favorites — list user's favorites
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/favorites",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id

      const rows = await fastify.db
        .select({
          id: favorites.id,
          targetUserId: favorites.targetUserId,
          createdAt: favorites.createdAt,
          targetName: users.name,
          targetRole: users.role,
        })
        .from(favorites)
        .innerJoin(users, eq(favorites.targetUserId, users.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt))

      // Enrich with profile data
      const data = await Promise.all(
        rows.map(async (row) => {
          let avatarUrl: string | null = null
          let profileId: string | null = null

          if (row.targetRole === "player") {
            const [player] = await fastify.db
              .select({ photoUrl: players.photoUrl, id: players.id })
              .from(players)
              .where(eq(players.userId, row.targetUserId))
              .limit(1)
            avatarUrl = player?.photoUrl ?? null
            profileId = player?.id ?? null
          } else if (row.targetRole === "team") {
            const [team] = await fastify.db
              .select({ logoUrl: teams.logoUrl, id: teams.id })
              .from(teams)
              .where(eq(teams.userId, row.targetUserId))
              .limit(1)
            avatarUrl = team?.logoUrl ?? null
            profileId = team?.id ?? null
          }

          return {
            id: row.id,
            targetUser: {
              id: row.targetUserId,
              name: row.targetName,
              role: row.targetRole,
              avatarUrl,
              profileId,
            },
            createdAt: row.createdAt.toISOString(),
          }
        })
      )

      return ok(data)
    }
  )
}

export default favoriteRoutes
