import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { and, eq, ne, ilike, desc, sql, count } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { requireRole, requireSession } from "../hooks/require-auth.js"
import { list } from "../lib/response.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { SearchPlayersQuerySchema, SearchTeamsQuerySchema } from "../../../../shared/contracts/search.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
import type { PlanId } from "../../../../shared/contracts/subscription.js"
import { buildProximityScore, getRegionsInSameMacro } from "../lib/geo.js"

const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /players — any authenticated user can search players
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/players",
    {
      preHandler: [requireSession],
      schema: { querystring: SearchPlayersQuerySchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role
      const { page = 1, pageSize = 10, name, position, skills, region, availability, level, sex, minAge, maxAge } = request.query as z.infer<typeof SearchPlayersQuerySchema>

      // Plan limit resolution
      const sub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      })
      const planId = sub?.planId ?? "free"

      // Fetch viewer (team) location for proximity ranking
      const viewerTeam = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
      })
      const viewerRegion = viewerTeam?.region ?? null
      const viewerCity   = viewerTeam?.city   ?? null
      const sameRegions  = getRegionsInSameMacro(viewerRegion)
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

      // Name filter: case-insensitive partial match
      if (name) {
        filters.push(ilike(players.name, `%${name}%`) as unknown as ReturnType<typeof sql>)
      }

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

      // Sex filter: binary customer-facing filter includes trans identities and rather_not_say in matching groups
      if (sex === "male") {
        filters.push(sql`${players.sex} IN ('male', 'rather_not_say')` as unknown as ReturnType<typeof sql>)
      } else if (sex === "female") {
        filters.push(sql`${players.sex} IN ('female', 'rather_not_say')` as unknown as ReturnType<typeof sql>)
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

      // Build proximity score expression — 100/50/20/0 based on region match
      const proximityExpr = buildProximityScore(
        players.region, players.city,
        viewerRegion, viewerCity, sameRegions
      )

      // Premium tier boost: fenomeno=300, craque=200, free=0
      // Paid users always surface before free users within the same proximity band
      const tierBoost = sql<number>`CASE COALESCE(${subscriptions.planId}, 'free')
        WHEN 'fenomeno' THEN 300
        WHEN 'craque'   THEN 200
        ELSE 0
      END`

      const rows = await fastify.db
        .select({ player: players, planId: subscriptions.planId })
        .from(players)
        .leftJoin(subscriptions, eq(subscriptions.userId, players.userId))
        .where(whereClause)
        .orderBy(
          sql`(${tierBoost}) DESC`,
          ...(proximityExpr ? [sql`(${proximityExpr}) DESC` as ReturnType<typeof sql>] : []),
          desc(players.updatedAt)
        )
        .limit(effectivePageSize)
        .offset((page - 1) * effectivePageSize)

      const data = rows.map(({ player: p, planId }) => {
        const playerPlanId = (planId ?? "free") as PlanId
        return {
          ...p,
          cardTier: (playerPlanId === "fenomeno" ? "legendary" : playerPlanId === "craque" ? "gold" : "none") as "none" | "gold" | "legendary",
          careerHistory: p.careerHistory ?? [],
          detailedStats: p.detailedStats ?? null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }
      })

      return list(data, page, effectivePageSize, total)
    }
  )

  // GET /teams — any authenticated user can search teams
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams",
    {
      preHandler: [requireSession],
      schema: { querystring: SearchTeamsQuerySchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role
      const { page = 1, pageSize = 10, name, level, lineupSex, region, openPosition } = request.query as z.infer<typeof SearchTeamsQuerySchema>

      // Plan limit resolution
      const sub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      })
      const planId = sub?.planId ?? "free"
      const limits = getPlanLimits(planId, role as "player" | "team")

      // Fetch viewer (player) location for proximity ranking
      const viewerPlayer = await fastify.db.query.players.findFirst({
        where: eq(players.userId, userId),
      })
      const viewerRegion = viewerPlayer?.region ?? null
      const viewerCity   = viewerPlayer?.city   ?? null
      const sameRegions  = getRegionsInSameMacro(viewerRegion)
      const effectivePageSize = Math.min(
        Math.min(pageSize ?? 10, 50), // D-07: hard cap 50
        limits.searchResults           // D-11: plan cap
      )

      const filters: ReturnType<typeof sql>[] = []

      // D-10: self-exclusion
      filters.push(ne(teams.userId, userId) as unknown as ReturnType<typeof sql>)

      // Exclude hidden profiles (removed by moderation)
      filters.push(sql`${teams.hidden} = false` as unknown as ReturnType<typeof sql>)

      // Name filter: case-insensitive partial match
      if (name) {
        filters.push(ilike(teams.name, `%${name}%`) as unknown as ReturnType<typeof sql>)
      }

      // Level filter: enum — exact match
      if (level) {
        filters.push(eq(teams.level, level) as unknown as ReturnType<typeof sql>)
      }

      if (lineupSex) {
        filters.push(eq(teams.lineupSex, lineupSex) as unknown as ReturnType<typeof sql>)
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

      // Build proximity score expression
      const proximityExpr = buildProximityScore(
        teams.region, teams.city,
        viewerRegion, viewerCity, sameRegions
      )

      // Level weight: semi-profissional ranks higher as it signals serious commitment
      const levelWeight = sql<number>`CASE ${teams.level}
        WHEN 'semi-profissional' THEN 3
        WHEN 'recreativo'        THEN 2
        WHEN 'amador'            THEN 1
        ELSE                          0
      END`

      // Premium tier boost for teams: profissional=300, free=0
      const teamTierBoost = sql<number>`CASE COALESCE(${subscriptions.planId}, 'free')
        WHEN 'profissional' THEN 300
        ELSE 0
      END`

      const rows = await fastify.db
        .select({ team: teams, planId: subscriptions.planId })
        .from(teams)
        .leftJoin(subscriptions, eq(subscriptions.userId, teams.userId))
        .where(whereClause)
        .orderBy(
          sql`(${teamTierBoost}) DESC`,
          ...(proximityExpr ? [sql`(${proximityExpr}) DESC` as ReturnType<typeof sql>] : []),
          sql`(${levelWeight}) DESC`,
          desc(teams.updatedAt)
        )
        .limit(effectivePageSize)
        .offset((page - 1) * effectivePageSize)

      const data = rows.map(({ team: t, planId }) => ({
        ...t,
        cardTier: (planId === "profissional" ? "gold" : "none") as "none" | "gold" | "legendary",
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))

      return list(data, page, effectivePageSize, total)
    }
  )
  // GET /community-players — any authenticated user, no plan gating, 20/page max
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/community-players",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const { position, region, level, sex, page = "1" } = request.query as {
        position?: string
        region?: string
        level?: string
        sex?: "male" | "female"
        page?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const pageSize = 20
      const offset = (pageNum - 1) * pageSize

      const userId = request.session!.user.id

      const selfPlayer = await fastify.db.query.players.findFirst({
        where: eq(players.userId, userId),
        columns: { id: true },
      })

      const conditions: SQL[] = [eq(players.hidden, false)]

      if (selfPlayer) {
        conditions.push(ne(players.id, selfPlayer.id))
      }
      if (position) {
        conditions.push(
          sql`${players.positions} @> ARRAY[${position}]::text[]` as unknown as SQL
        )
      }
      if (region) {
        conditions.push(ilike(players.region, `%${region}%`))
      }
      if (level) {
        conditions.push(eq(players.level, level))
      }
      if (sex === "male") {
        conditions.push(sql`${players.sex} IN ('male', 'rather_not_say')` as unknown as SQL)
      } else if (sex === "female") {
        conditions.push(sql`${players.sex} IN ('female', 'rather_not_say')` as unknown as SQL)
      }

      const [rows, [countRow]] = await Promise.all([
        fastify.db
          .select({
            id: players.id,
            name: players.name,
            sex: players.sex,
            photoUrl: players.photoUrl,
            positions: players.positions,
            level: players.level,
            region: players.region,
            city: players.city,
          })
          .from(players)
          .where(and(...conditions))
          .orderBy(desc(players.createdAt))
          .limit(pageSize)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(players)
          .where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows,
        meta: {
          page: pageNum,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      })
    }
  )
}

export default searchRoutes
