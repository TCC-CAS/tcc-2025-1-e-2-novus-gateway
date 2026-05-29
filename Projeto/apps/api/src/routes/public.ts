import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { desc, eq, and, count, ilike } from "drizzle-orm"
import { ok } from "../lib/response.js"
import { teams, players, users } from "../db/schema/index.js"

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /showcase — 6 recent teams + 6 recent players for landing page vitrine
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/showcase",
    {},
    async (_request, reply) => {
      const [recentTeams, recentPlayers] = await Promise.all([
        fastify.db
          .select({
            id: teams.id,
            name: teams.name,
            logoUrl: teams.logoUrl,
            level: teams.level,
            region: teams.region,
            city: teams.city,
          })
          .from(teams)
          .where(eq(teams.hidden, false))
          .orderBy(desc(teams.createdAt))
          .limit(6),
        fastify.db
          .select({
            id: players.id,
            name: players.name,
            photoUrl: players.photoUrl,
            positions: players.positions,
            level: players.level,
            region: players.region,
            city: players.city,
            planId: users.planId,
          })
          .from(players)
          .innerJoin(users, eq(players.userId, users.id))
          .where(eq(players.hidden, false))
          .orderBy(desc(players.createdAt))
          .limit(6),
      ])

      return ok({
        teams: recentTeams,
        players: recentPlayers.map(({ planId, ...p }) => ({
          ...p,
          cardTier: (planId === "craque" ? "gold" : planId === "fenomeno" ? "legendary" : "none") as "none" | "gold" | "legendary",
        })),
      })
    }
  )

  // GET /teams — paginated public team listing
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams",
    {},
    async (request, reply) => {
      const { page = "1", pageSize = "12", region } = request.query as {
        page?: string
        pageSize?: string
        region?: string
      }
      const pageNum = Math.max(1, parseInt(page, 10))
      const size = Math.min(50, Math.max(1, parseInt(pageSize, 10)))
      const offset = (pageNum - 1) * size

      const conditions = region
        ? [eq(teams.hidden, false), ilike(teams.region, `%${region}%`)]
        : [eq(teams.hidden, false)]

      const [rows, [countRow]] = await Promise.all([
        fastify.db
          .select({
            id: teams.id,
            name: teams.name,
            logoUrl: teams.logoUrl,
            level: teams.level,
            region: teams.region,
            city: teams.city,
            openPositions: teams.openPositions,
            planId: users.planId,
          })
          .from(teams)
          .innerJoin(users, eq(teams.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(users.planId), desc(teams.createdAt))
          .limit(size)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(teams)
          .innerJoin(users, eq(teams.userId, users.id))
          .where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows.map(({ planId, ...team }) => ({
          ...team,
          cardTier: (planId === "craque" || planId === "profissional" ? "gold"
            : planId === "fenomeno" ? "legendary"
            : "none") as "none" | "gold" | "legendary",
        })),
        meta: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      })
    }
  )
  // GET /players — paginated public player listing
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/players",
    {},
    async (request, reply) => {
      const { page = "1", pageSize = "12", region } = request.query as {
        page?: string
        pageSize?: string
        region?: string
      }
      const pageNum = Math.max(1, parseInt(page, 10))
      const size = Math.min(50, Math.max(1, parseInt(pageSize, 10)))
      const offset = (pageNum - 1) * size

      const conditions = region
        ? [eq(players.hidden, false), ilike(players.region, `%${region}%`)]
        : [eq(players.hidden, false)]

      const [rows, [countRow]] = await Promise.all([
        fastify.db
          .select({
            id: players.id,
            name: players.name,
            photoUrl: players.photoUrl,
            positions: players.positions,
            level: players.level,
            region: players.region,
            city: players.city,
            planId: users.planId,
          })
          .from(players)
          .innerJoin(users, eq(players.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(users.planId), desc(players.createdAt))
          .limit(size)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(players)
          .innerJoin(users, eq(players.userId, users.id))
          .where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows.map(({ planId, ...p }) => ({
          ...p,
          cardTier: (planId === "craque" || planId === "profissional" ? "gold"
            : planId === "fenomeno" ? "legendary"
            : "none") as "none" | "gold" | "legendary",
        })),
        meta: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      })
    }
  )
}

export default publicRoutes
