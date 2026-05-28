import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { eq, and, desc, count } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { matches, teams } from "../db/schema/index.js"
import {
  CreateMatchRequestSchema,
  UpdateMatchRequestSchema,
} from "../../../../shared/contracts/matches.js"

function serializeMatch(m: typeof matches.$inferSelect) {
  return {
    id: m.id,
    teamId: m.teamId,
    opponentName: m.opponentName,
    matchDate: m.matchDate,
    matchTime: m.matchTime,
    address: m.address,
    venueName: m.venueName,
    neighborhood: m.neighborhood,
    city: m.city,
    result: m.result,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

const matchesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /teams/:id/matches — public, paginated, filterable by status
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams/:id/matches",
    {},
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status, page = "1", pageSize = "10" } = request.query as {
        status?: string
        page?: string
        pageSize?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const size = Math.min(50, Math.max(1, parseInt(pageSize, 10)))
      const offset = (pageNum - 1) * size

      const conditions = [eq(matches.teamId, id)]
      if (status) {
        conditions.push(eq(matches.status, status))
      }

      const [rows, [countRow]] = await Promise.all([
        fastify.db
          .select()
          .from(matches)
          .where(and(...conditions))
          .orderBy(desc(matches.matchDate))
          .limit(size)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(matches)
          .where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows.map(serializeMatch),
        meta: { page: pageNum, pageSize: size, total, totalPages: Math.ceil(total / size) },
      })
    }
  )

  // POST /teams/me/matches — create a match
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/teams/me/matches",
    {
      preHandler: [requireRole("team")],
      schema: { body: CreateMatchRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const body = request.body

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const now = new Date()
      const [inserted] = await fastify.db
        .insert(matches)
        .values({
          id: nanoid(),
          teamId: team.id,
          opponentName: body.opponentName,
          matchDate: body.matchDate,
          matchTime: body.matchTime,
          address: body.address,
          venueName: body.venueName,
          neighborhood: body.neighborhood,
          city: body.city,
          status: "scheduled",
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      return reply.status(201).send(ok(serializeMatch(inserted)))
    }
  )

  // PUT /teams/me/matches/:matchId — update a match (owner only)
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/teams/me/matches/:matchId",
    {
      preHandler: [requireRole("team")],
      schema: { body: UpdateMatchRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { matchId } = request.params as { matchId: string }
      const body = request.body

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const existing = await fastify.db.query.matches.findFirst({
        where: and(eq(matches.id, matchId), eq(matches.teamId, team.id)),
      })
      if (!existing) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Partida não encontrada" } })
      }

      const [updated] = await fastify.db
        .update(matches)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(matches.id, matchId))
        .returning()

      return ok(serializeMatch(updated))
    }
  )

  // DELETE /teams/me/matches/:matchId — soft cancel (status → 'cancelled')
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/teams/me/matches/:matchId",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { matchId } = request.params as { matchId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const existing = await fastify.db.query.matches.findFirst({
        where: and(eq(matches.id, matchId), eq(matches.teamId, team.id)),
      })
      if (!existing) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Partida não encontrada" } })
      }

      await fastify.db
        .update(matches)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(matches.id, matchId))

      return reply.status(204).send()
    }
  )
}

export default matchesRoutes
