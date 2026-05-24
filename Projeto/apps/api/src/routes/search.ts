import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { and, eq, ne, ilike, desc, sql, count, inArray } from "drizzle-orm"
import { requireRole } from "../hooks/require-auth.js"
import { list } from "../lib/response.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { SearchPlayersQuerySchema, SearchTeamsQuerySchema } from "../../../../shared/contracts/search.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
import type { PlanId } from "../../../../shared/contracts/subscription.js"

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
      const { page = 1, pageSize = 10, position, skills, region, availability, level, minAge, maxAge } = request.query as z.infer<typeof SearchPlayersQuerySchema>

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

      // Position filter: array containment — player positions must include the requested position
      if (position) {
        filters.push(
          sql`${players.positions} @> ARRAY[${position}]::text[]` as unknown as ReturnType<typeof sql>
        )
      }

      // Skills filter (D-03, OR/ANY logic): comma-separated
      if (skills) {
        const skillArray = skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        if (skillArray.length > 0) {
          filters.push(sql`${players.skills} && ARRAY[${sql.join(skillArray.map((s: string) => sql`${s}`), sql`, `)}]::text[]` as unknown as ReturnType<typeof sql>)
        }
      }

      // Availability filter (D-04): case-insensitive exact match
      if (availability) {
        filters.push(ilike(players.availability, availability) as unknown as ReturnType<typeof sql>)
      }

      // Region filter: case-insensitive partial match
      if (region) {
        filters.push(ilike(players.region, `%${region}%`) as unknown as ReturnType<typeof sql>)
      }

      // Level filter: exact match
      if (level) {
        filters.push(eq(players.level, level) as unknown as ReturnType<typeof sql>)
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

      // Plan enforcement: determine what the requesting team can see
      const teamLimits = getPlanLimits(planId as PlanId, "team")
      const teamCanSeeCareer = teamLimits.playerCareerAccess
      const teamCanSeeStats = teamLimits.playerStatsAccess

      // Bulk-fetch player subscriptions to avoid N+1
      let playerPlanMap: Record<string, PlanId> = {}
      if (teamCanSeeCareer || teamCanSeeStats) {
        const playerUserIds = rows.map((p) => p.userId)
        if (playerUserIds.length > 0) {
          const playerSubs = await fastify.db
            .select({ userId: subscriptions.userId, planId: subscriptions.planId })
            .from(subscriptions)
            .where(inArray(subscriptions.userId, playerUserIds))
          for (const s of playerSubs) {
            playerPlanMap[s.userId] = s.planId as PlanId
          }
        }
      }

      const data = rows.map((p) => {
        const playerPlanId = playerPlanMap[p.userId] ?? "free"
        const playerCanShowCareer = ["craque", "fenomeno"].includes(playerPlanId)
        const playerCanShowStats = playerPlanId === "fenomeno"
        return {
          ...p,
          careerHistory: playerCanShowCareer && teamCanSeeCareer ? p.careerHistory : [],
          detailedStats: playerCanShowStats && teamCanSeeStats ? p.detailedStats : null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }
      })

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
      const { page = 1, pageSize = 10, level, region, openPosition } = request.query as z.infer<typeof SearchTeamsQuerySchema>

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
