import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq, and, or } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { teams, players, teamMembers, users, connections } from "../db/schema/index.js"
import { UpsertTeamProfileRequestSchema } from "../../../../shared/contracts/teams.js"

const teamsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /me — authenticated team only
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const profile = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }

      const user = await fastify.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { planId: true },
      })

      const cardTier = (user?.planId === "fenomeno" ? "legendary"
        : user?.planId === "craque" || user?.planId === "profissional" ? "gold"
        : "none") as "none" | "gold" | "legendary"

      return ok({
        ...profile,
        cardTier,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )

  // PUT /me — upsert team profile
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/me",
    {
      preHandler: [requireRole("team")],
      schema: { body: UpsertTeamProfileRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const fields = request.body as z.infer<typeof UpsertTeamProfileRequestSchema>
      const [result] = await fastify.db
        .insert(teams)
        .values({
          id: nanoid(),
          userId,
          ...fields,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: teams.userId,
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

  // GET /:id — public (no auth required); whatsapp gated by accepted connection
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const viewerUserId = request.session?.user.id

      const profile = await fastify.db.query.teams.findFirst({
        where: eq(teams.id, request.params.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }

      const teamUser = await fastify.db.query.users.findFirst({
        where: eq(users.id, profile.userId),
        columns: { planId: true },
      })

      const cardTier = (teamUser?.planId === "fenomeno" ? "legendary"
        : teamUser?.planId === "craque" || teamUser?.planId === "profissional" ? "gold"
        : "none") as "none" | "gold" | "legendary"

      const isOwn = viewerUserId === profile.userId

      let exposedWhatsapp: string | null = null
      if (isOwn) {
        exposedWhatsapp = profile.whatsapp ?? null
      } else if (viewerUserId) {
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
        exposedWhatsapp = acceptedConn ? (profile.whatsapp ?? null) : null
      }

      return ok({
        ...profile,
        whatsapp: exposedWhatsapp,
        cardTier,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )
  // GET /:id/roster — public list of players on this team's roster
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id/roster",
    {},
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.id, id),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Time não encontrado" } })
      }

      const members = await fastify.db
        .select({
          id: players.id,
          name: players.name,
          photoUrl: players.photoUrl,
          positions: players.positions,
          region: players.region,
        })
        .from(teamMembers)
        .innerJoin(players, eq(teamMembers.playerId, players.id))
        .where(eq(teamMembers.teamId, id))
        .orderBy(teamMembers.addedAt)

      return ok({ members })
    }
  )

  // POST /me/roster — add a player to the team's roster
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/me/roster",
    {
      preHandler: [requireRole("team")],
      schema: {
        body: z.object({ playerId: z.string().min(1) }),
      },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { playerId } = request.body as { playerId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const player = await fastify.db.query.players.findFirst({
        where: eq(players.id, playerId),
        columns: { id: true },
      })
      if (!player) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Jogador não encontrado" } })
      }

      const inserted = await fastify.db
        .insert(teamMembers)
        .values({ id: nanoid(), teamId: team.id, playerId })
        .onConflictDoNothing()
        .returning()

      if (inserted.length === 0) {
        return reply.status(409).send({ error: { code: "CONFLICT", message: "Jogador já está no elenco" } })
      }

      return reply.status(201).send(ok({ playerId, teamId: team.id }))
    }
  )

  // DELETE /me/roster/:playerId — remove a player from the team's roster
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/me/roster/:playerId",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { playerId } = request.params as { playerId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      await fastify.db
        .delete(teamMembers)
        .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.playerId, playerId)))

      return reply.status(204).send()
    }
  )
}

export default teamsRoutes
