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
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

const favoriteRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /favorites — follow a user (player or team)
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
      const userName = request.session!.user.name
      const role = request.session!.user.role as "player" | "team"
      const { targetUserId } = request.body

      if (userId === targetUserId) {
        throw new AppError(400, "INVALID_TARGET", "Cannot follow yourself")
      }

      // Use a transaction for atomicity: check limit + insert
      const result = await fastify.db.transaction(async (tx) => {
        // Check plan limits
        const [sub] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1)

        const limits = getPlanLimits(sub?.planId ?? "free", role)

        // Count current favorites (within transaction for consistency)
        const [countRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(favorites)
          .where(eq(favorites.userId, userId))

        if ((countRow?.count ?? 0) >= limits.favorites) {
          throw new AppError(403, "FAVORITE_LIMIT_REACHED", "Favorite limit reached for your plan")
        }

        // Insert — unique_favorite constraint prevents duplicates
        const id = nanoid()
        await tx
          .insert(favorites)
          .values({ id, userId, targetUserId, createdAt: new Date() })

        return id
      }).catch((err) => {
        // Handle unique constraint violation (already following)
        if (err instanceof Error && err.message.includes("unique_favorite")) {
          return null // signal already-following
        }
        if (err instanceof AppError) throw err
        // Check if it's a Postgres unique violation error
        if (typeof err === "object" && err !== null && "code" in err && (err as Record<string, unknown>).code === "23505") {
          return null
        }
        throw err
      })

      if (result === null) {
        // Already following — return 200 with existing state
        const [existing] = await fastify.db
          .select({ id: favorites.id })
          .from(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.targetUserId, targetUserId)))
          .limit(1)

        return reply.code(200).send(ok({ id: existing?.id ?? "", favorited: true }))
      }

      // Emit socket event to the target user
      fastify.io.to(`user:${targetUserId}`).emit("follower_added", {
        followerId: userId,
        followerName: userName,
        followerRole: role,
      })

      return reply.code(201).send(ok({ id: result, favorited: true }))
    }
  )

  // DELETE /favorites/:targetUserId — unfollow
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/favorites/:targetUserId",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ targetUserId: z.string() }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { targetUserId } = request.params

      const result = await fastify.db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.targetUserId, targetUserId)))

      // Emit socket event to the target user
      fastify.io.to(`user:${targetUserId}`).emit("follower_removed", {
        followerId: userId,
      })

      return reply.code(200).send(ok({ favorited: false }))
    }
  )

  // GET /favorites — list user's favorites with pagination
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/favorites",
    {
      preHandler: [requireSession],
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { page, pageSize } = request.query

      // Count total
      const [countRow] = await fastify.db
        .select({ count: sql<number>`count(*)::int` })
        .from(favorites)
        .where(eq(favorites.userId, userId))
      const total = countRow?.count ?? 0
      const totalPages = Math.ceil(total / pageSize)

      // Fetch page with single optimized query using LEFT JOINs
      const rows = await fastify.db
        .select({
          id: favorites.id,
          targetUserId: favorites.targetUserId,
          createdAt: favorites.createdAt,
          targetName: users.name,
          targetRole: users.role,
          playerPhotoUrl: players.photoUrl,
          playerProfileId: players.id,
          teamLogoUrl: teams.logoUrl,
          teamProfileId: teams.id,
        })
        .from(favorites)
        .innerJoin(users, eq(favorites.targetUserId, users.id))
        .leftJoin(players, eq(favorites.targetUserId, players.userId))
        .leftJoin(teams, eq(favorites.targetUserId, teams.userId))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

      const data = rows.map((row) => ({
        id: row.id,
        targetUser: {
          id: row.targetUserId,
          name: row.targetName,
          role: row.targetRole as "player" | "team",
          avatarUrl: row.targetRole === "player" ? row.playerPhotoUrl : row.teamLogoUrl,
          profileId: row.targetRole === "player" ? row.playerProfileId : row.teamProfileId,
        },
        createdAt: row.createdAt.toISOString(),
      }))

      return reply.code(200).send({ data, meta: { page, pageSize, total, totalPages } })
    }
  )
}

export default favoriteRoutes
