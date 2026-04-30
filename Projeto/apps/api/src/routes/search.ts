import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { and, eq, ne, ilike, desc, sql, count } from "drizzle-orm"
import { requireRole } from "../hooks/require-auth.js"
import { list } from "../lib/response.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { SearchPlayersQuerySchema, SearchTeamsQuerySchema } from "../../../../apps/web/shared/contracts/search.js"
import { getPlanLimits } from "../../../../apps/web/shared/contracts/subscription.js"

const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /players — authenticated team users search for players
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/players",
    {
      preHandler: [requireRole("team")],
      schema: { querystring: SearchPlayersQuerySchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role
      const { page = 1, pageSize = 10, skills, availability, minAge, maxAge } = request.query

      // Plan limit resolution
      const sub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      })
      const planId = sub?.planId ?? "free"
      const limits = getPlanLimits(planId, role as "player" | "team")
      const effectivePageSize = Math.min(
        Math.min(pageSize ?? 10, 50), // D-07: hard cap 50
        limits.searchResults           // D-11: plan cap (free team = 10)
      )

      const filters: ReturnType<typeof sql>[] = []

      // D-10: self-exclusion
      filters.push(ne(players.userId, userId) as unknown as ReturnType<typeof sql>)

      // Exclude hidden profiles (removed by moderation)
      filters.push(sql`${players.hidden} = false` as unknown as ReturnType<typeof sql>)

      // Skills filter (D-03, OR/ANY logic): comma-separated
      if (skills) {
        const skillArray = skills.split(",").map((s) => s.trim()).filter(Boolean)
        if (skillArray.length > 0) {
          filters.push(sql`${players.skills} && ARRAY[${sql.join(skillArray.map((s) => sql`${s}`), sql`, `)}]::text[]` as unknown as ReturnType<typeof sql>)
        }
      }

      // Availability filter (D-04): case-insensitive exact match
      if (availability) {
        filters.push(ilike(players.availability, availability) as unknown as ReturnType<typeof sql>)
      }

      // Age filters (D-05): birthDate is stored as text, cast to date
      if (minAge !== undefined) {
        filters.push(
          sql`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${players.birthDate}::date)) >= ${minAge}` as unknown as ReturnType<typeof sql>
        )
      }
      if (maxAge !== undefined) {
        filters.push(
          sql`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${players.birthDate}::date)) <= ${maxAge}` as unknown as ReturnType<typeof sql>
        )
      }

      const whereClause = filters.length > 0 ? and(...(filters as Parameters<typeof and>)) : undefined

      const [{ value: total }] = await fastify.db
        .select({ value: count() })
        .from(players)
        .where(whereClause)

      const rows = await fastify.db
        .select()
        .from(players)
        .where(whereClause)
        .orderBy(desc(players.updatedAt))
        .limit(effectivePageSize)
        .offset((page - 1) * effectivePageSize)

      const data = rows.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))

      return list(data, page, effectivePageSize, total)
    }
  )

  // GET /teams — authenticated player users search for teams
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams",
    {
      preHandler: [requireRole("player")],
      schema: { querystring: SearchTeamsQuerySchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role
      const { page = 1, pageSize = 10, level, region, openPosition } = request.query

      // Plan limit resolution
      const sub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      })
      const planId = sub?.planId ?? "free"
      const limits = getPlanLimits(planId, role as "player" | "team")
      const effectivePageSize = Math.min(
        Math.min(pageSize ?? 10, 50), // D-07: hard cap 50
        limits.searchResults           // D-11: plan cap
      )

      const filters: ReturnType<typeof sql>[] = []

      // D-10: self-exclusion
      filters.push(ne(teams.userId, userId) as unknown as ReturnType<typeof sql>)

      // Exclude hidden profiles (removed by moderation)
      filters.push(sql`${teams.hidden} = false` as unknown as ReturnType<typeof sql>)

      // Level filter: enum — exact match
      if (level) {
        filters.push(eq(teams.level, level) as unknown as ReturnType<typeof sql>)
      }

      // Region filter (D-04): case-insensitive exact match
      if (region) {
        filters.push(ilike(teams.region, region) as unknown as ReturnType<typeof sql>)
      }

      // openPosition filter (D-03, ANY logic): single string, check array containment
      if (openPosition) {
        filters.push(
          sql`${teams.openPositions} @> ARRAY[${openPosition}]::text[]` as unknown as ReturnType<typeof sql>
        )
      }

      const whereClause = filters.length > 0 ? and(...(filters as Parameters<typeof and>)) : undefined

      const [{ value: total }] = await fastify.db
        .select({ value: count() })
        .from(teams)
        .where(whereClause)

      const rows = await fastify.db
        .select()
        .from(teams)
        .where(whereClause)
        .orderBy(
          sql`CASE ${teams.level} WHEN 'semi-profissional' THEN 1 WHEN 'outro' THEN 2 WHEN 'recreativo' THEN 3 WHEN 'amador' THEN 4 END`,
          desc(teams.updatedAt)
        )
        .limit(effectivePageSize)
        .offset((page - 1) * effectivePageSize)

      const data = rows.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))

      return list(data, page, effectivePageSize, total)
    }
  )
}

export default searchRoutes
