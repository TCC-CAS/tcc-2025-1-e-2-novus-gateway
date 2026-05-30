import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { eq, and, desc, count } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"
import { requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { matches, teams, matchInvites, players } from "../db/schema/index.js"
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

function serializeInvite(inv: typeof matchInvites.$inferSelect & {
  player: { name: string; photoUrl: string | null }
}) {
  return {
    id: inv.id,
    matchId: inv.matchId,
    playerId: inv.playerId,
    playerName: inv.player.name,
    playerPhotoUrl: inv.player.photoUrl,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
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

      const emptyToNull = (v: string | undefined) => (v === "" || v == null ? null : v)
      const now = new Date()
      const [inserted] = await fastify.db
        .insert(matches)
        .values({
          id: nanoid(),
          teamId: team.id,
          opponentName: emptyToNull(body.opponentName),
          matchDate: body.matchDate,
          matchTime: emptyToNull(body.matchTime),
          address: emptyToNull(body.address),
          venueName: emptyToNull(body.venueName),
          neighborhood: emptyToNull(body.neighborhood),
          city: emptyToNull(body.city),
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

  // GET /teams/me/matches — team lists own matches (paginated, filterable by status)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams/me/matches",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { status, page = "1", pageSize = "20" } = request.query as {
        status?: string
        page?: string
        pageSize?: string
      }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Time não encontrado" } })
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const size = Math.min(50, Math.max(1, parseInt(pageSize, 10)))

      const conditions: ReturnType<typeof eq>[] = [eq(matches.teamId, team.id)]
      if (status) conditions.push(eq(matches.status, status as any))

      const [rows, [countRow]] = await Promise.all([
        fastify.db.select().from(matches)
          .where(and(...conditions))
          .orderBy(desc(matches.matchDate))
          .limit(size)
          .offset((pageNum - 1) * size),
        fastify.db.select({ total: count() }).from(matches).where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows.map(serializeMatch),
        meta: { page: pageNum, pageSize: size, total, totalPages: Math.ceil(total / size) },
      })
    }
  )

  // GET /teams/me/matches/:matchId/invites — list invites for a match
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams/me/matches/:matchId/invites",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { matchId } = request.params as { matchId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Time não encontrado" } })
      }

      const match = await fastify.db.query.matches.findFirst({
        where: and(eq(matches.id, matchId), eq(matches.teamId, team.id)),
      })
      if (!match) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Partida não encontrada" } })
      }

      const inviteRows = await fastify.db
        .select({
          id: matchInvites.id,
          matchId: matchInvites.matchId,
          playerId: matchInvites.playerId,
          status: matchInvites.status,
          createdAt: matchInvites.createdAt,
          updatedAt: matchInvites.updatedAt,
          playerName: players.name,
          playerPhotoUrl: players.photoUrl,
        })
        .from(matchInvites)
        .innerJoin(players, eq(matchInvites.playerId, players.id))
        .where(eq(matchInvites.matchId, matchId))
        .orderBy(desc(matchInvites.createdAt))

      return reply.send(ok({
        ...serializeMatch(match),
        invites: inviteRows.map((inv) => ({
          id: inv.id,
          matchId: inv.matchId,
          playerId: inv.playerId,
          playerName: inv.playerName,
          playerPhotoUrl: inv.playerPhotoUrl,
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
        })),
      }))
    }
  )

  // POST /teams/me/matches/:matchId/invites — invite a player
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/teams/me/matches/:matchId/invites",
    {
      preHandler: [requireRole("team")],
      schema: { body: z.object({ playerId: z.string() }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { matchId } = request.params as { matchId: string }
      const { playerId } = request.body

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Time não encontrado" } })
      }

      const match = await fastify.db.query.matches.findFirst({
        where: and(eq(matches.id, matchId), eq(matches.teamId, team.id)),
      })
      if (!match) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Partida não encontrada" } })
      }

      const player = await fastify.db.query.players.findFirst({
        where: eq(players.id, playerId),
        columns: { id: true, name: true, photoUrl: true },
      })
      if (!player) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Jogador não encontrado" } })
      }

      const existing = await fastify.db.query.matchInvites.findFirst({
        where: and(eq(matchInvites.matchId, matchId), eq(matchInvites.playerId, playerId)),
      })
      if (existing) {
        return reply.status(409).send({ error: { code: "CONFLICT", message: "Jogador já convidado" } })
      }

      const now = new Date()
      const [invite] = await fastify.db
        .insert(matchInvites)
        .values({ id: nanoid(), matchId, playerId, status: "pending", createdAt: now, updatedAt: now })
        .returning()

      return reply.status(201).send(ok({
        id: invite.id,
        matchId: invite.matchId,
        playerId: invite.playerId,
        playerName: player.name,
        playerPhotoUrl: player.photoUrl,
        status: invite.status,
        createdAt: invite.createdAt.toISOString(),
      }))
    }
  )

  // DELETE /teams/me/matches/:matchId/invites/:inviteId — cancel an invite
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/teams/me/matches/:matchId/invites/:inviteId",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { matchId, inviteId } = request.params as { matchId: string; inviteId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Time não encontrado" } })
      }

      const match = await fastify.db.query.matches.findFirst({
        where: and(eq(matches.id, matchId), eq(matches.teamId, team.id)),
        columns: { id: true },
      })
      if (!match) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Partida não encontrada" } })
      }

      const deleted = await fastify.db
        .delete(matchInvites)
        .where(and(eq(matchInvites.id, inviteId), eq(matchInvites.matchId, matchId)))
        .returning({ id: matchInvites.id })

      if (deleted.length === 0) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Convite não encontrado" } })
      }

      return reply.status(204).send()
    }
  )

  // GET /players/me/invites — player lists own invites
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/players/me/invites",
    { preHandler: [requireRole("player")] },
    async (request, reply) => {
      const userId = request.session!.user.id

      const player = await fastify.db.query.players.findFirst({
        where: eq(players.userId, userId),
        columns: { id: true },
      })
      if (!player) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de jogador não encontrado" } })
      }

      const rows = await fastify.db
        .select({
          id: matchInvites.id,
          matchId: matchInvites.matchId,
          status: matchInvites.status,
          createdAt: matchInvites.createdAt,
          matchDate: matches.matchDate,
          matchTime: matches.matchTime,
          venueName: matches.venueName,
          address: matches.address,
          city: matches.city,
          opponentName: matches.opponentName,
          teamId: teams.id,
          teamName: teams.name,
          teamLogoUrl: teams.logoUrl,
        })
        .from(matchInvites)
        .innerJoin(matches, eq(matchInvites.matchId, matches.id))
        .innerJoin(teams, eq(matches.teamId, teams.id))
        .where(eq(matchInvites.playerId, player.id))
        .orderBy(desc(matchInvites.createdAt))

      return reply.send({
        data: rows.map((r) => ({
          id: r.id,
          matchId: r.matchId,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          match: {
            teamId: r.teamId,
            teamName: r.teamName,
            teamLogoUrl: r.teamLogoUrl,
            opponentName: r.opponentName,
            matchDate: r.matchDate,
            matchTime: r.matchTime,
            venueName: r.venueName,
            address: r.address,
            city: r.city,
          },
        })),
      })
    }
  )

  // PATCH /players/me/invites/:inviteId — accept or decline an invite
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    "/players/me/invites/:inviteId",
    {
      preHandler: [requireRole("player")],
      schema: { body: z.object({ status: z.enum(["accepted", "declined"]) }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { inviteId } = request.params as { inviteId: string }
      const { status } = request.body

      const player = await fastify.db.query.players.findFirst({
        where: eq(players.userId, userId),
        columns: { id: true },
      })
      if (!player) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de jogador não encontrado" } })
      }

      const invite = await fastify.db.query.matchInvites.findFirst({
        where: and(eq(matchInvites.id, inviteId), eq(matchInvites.playerId, player.id)),
      })
      if (!invite) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Convite não encontrado" } })
      }

      if (invite.status !== "pending") {
        return reply.status(400).send({ error: { code: "BAD_REQUEST", message: "Convite já foi respondido" } })
      }

      const [updated] = await fastify.db
        .update(matchInvites)
        .set({ status, updatedAt: new Date() })
        .where(eq(matchInvites.id, inviteId))
        .returning()

      const matchRow = await fastify.db
        .select({
          matchDate: matches.matchDate,
          matchTime: matches.matchTime,
          venueName: matches.venueName,
          address: matches.address,
          city: matches.city,
          opponentName: matches.opponentName,
          teamId: teams.id,
          teamName: teams.name,
          teamLogoUrl: teams.logoUrl,
        })
        .from(matches)
        .innerJoin(teams, eq(matches.teamId, teams.id))
        .where(eq(matches.id, invite.matchId))
        .then((r) => r[0])

      return reply.send(ok({
        id: updated.id,
        matchId: updated.matchId,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        match: matchRow ? {
          teamId: matchRow.teamId,
          teamName: matchRow.teamName,
          teamLogoUrl: matchRow.teamLogoUrl,
          opponentName: matchRow.opponentName,
          matchDate: matchRow.matchDate,
          matchTime: matchRow.matchTime,
          venueName: matchRow.venueName,
          address: matchRow.address,
          city: matchRow.city,
        } : null,
      }))
    }
  )
}

export default matchesRoutes
