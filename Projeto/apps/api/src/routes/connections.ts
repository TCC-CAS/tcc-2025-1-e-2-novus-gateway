import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq, or, and, desc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { connections, players, teams } from "../db/schema/index.js"

const connectionsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /connections — list my connections and pending requests
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/connections",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id

      const rows = await fastify.db
        .select({
          id: connections.id,
          requesterId: connections.requesterId,
          receiverId: connections.receiverId,
          status: connections.status,
          createdAt: connections.createdAt,
        })
        .from(connections)
        .where(
          or(
            eq(connections.requesterId, userId),
            eq(connections.receiverId, userId)
          )
        )
        .orderBy(desc(connections.createdAt))

      const otherUserIds = rows.map((r) =>
        r.requesterId === userId ? r.receiverId : r.requesterId
      )

      let userInfoMap: Record<string, { id: string; profileId: string; name: string; role: string; photoUrl: string | null }> = {}
      if (otherUserIds.length > 0) {
        const uniqueIds = [...new Set(otherUserIds)]

        const playerRows = await fastify.db
          .select({ userId: players.userId, profileId: players.id, name: players.name, photoUrl: players.photoUrl })
          .from(players)
          .where(
            uniqueIds.length === 1
              ? eq(players.userId, uniqueIds[0])
              : or(...uniqueIds.map((id) => eq(players.userId, id)))
          )
        for (const p of playerRows) {
          userInfoMap[p.userId] = { id: p.userId, profileId: p.profileId, name: p.name, role: "player", photoUrl: p.photoUrl }
        }

        const teamRows = await fastify.db
          .select({ userId: teams.userId, profileId: teams.id, name: teams.name, logoUrl: teams.logoUrl })
          .from(teams)
          .where(
            uniqueIds.length === 1
              ? eq(teams.userId, uniqueIds[0])
              : or(...uniqueIds.map((id) => eq(teams.userId, id)))
          )
        for (const t of teamRows) {
          userInfoMap[t.userId] = { id: t.userId, profileId: t.profileId, name: t.name, role: "team", photoUrl: t.logoUrl }
        }
      }

      return ok(rows.map((r) => {
        const otherUserId = r.requesterId === userId ? r.receiverId : r.requesterId
        return {
          id: r.id,
          requesterId: r.requesterId,
          receiverId: r.receiverId,
          status: r.status,
          isRequester: r.requesterId === userId,
          createdAt: r.createdAt.toISOString(),
          otherUser: userInfoMap[otherUserId] ?? { id: otherUserId, profileId: otherUserId, name: "Usuário", role: "unknown", photoUrl: null },
        }
      }))
    }
  )

  // POST /connections — send a connection request
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/connections",
    {
      preHandler: [requireSession],
      schema: { body: z.object({ receiverId: z.string() }) },
    },
    async (request, reply) => {
      const requesterId = request.session!.user.id
      const { receiverId } = request.body

      if (requesterId === receiverId) {
        return reply.status(400).send({ error: { code: "BAD_REQUEST", message: "Você não pode se conectar consigo mesmo" } })
      }

      const existing = await fastify.db.query.connections.findFirst({
        where: or(
          and(eq(connections.requesterId, requesterId), eq(connections.receiverId, receiverId)),
          and(eq(connections.requesterId, receiverId), eq(connections.receiverId, requesterId))
        ),
      })

      if (existing) {
        return reply.status(409).send({ error: { code: "CONFLICT", message: "Solicitação já existe" } })
      }

      const now = new Date()
      const [conn] = await fastify.db
        .insert(connections)
        .values({ id: nanoid(), requesterId, receiverId, status: "pending", createdAt: now, updatedAt: now })
        .returning()

      return reply.status(201).send({ data: { id: conn.id, status: conn.status, createdAt: conn.createdAt.toISOString() } })
    }
  )

  // PATCH /connections/:id — accept or decline
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    "/connections/:id",
    {
      preHandler: [requireSession],
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ status: z.enum(["accepted", "declined"]) }),
      },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { id } = request.params
      const { status } = request.body

      // Only the RECEIVER can accept/decline
      const conn = await fastify.db.query.connections.findFirst({
        where: and(eq(connections.id, id), eq(connections.receiverId, userId)),
      })

      if (!conn) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Solicitação não encontrada" } })
      }

      if (conn.status !== "pending") {
        return reply.status(400).send({ error: { code: "BAD_REQUEST", message: "Solicitação já foi respondida" } })
      }

      const [updated] = await fastify.db
        .update(connections)
        .set({ status, updatedAt: new Date() })
        .where(eq(connections.id, id))
        .returning()

      return ok({ id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() })
    }
  )

  // DELETE /connections/:id — remove or cancel a connection
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/connections/:id",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { id } = request.params

      // Either party can cancel/remove
      const conn = await fastify.db.query.connections.findFirst({
        where: and(
          eq(connections.id, id),
          or(eq(connections.requesterId, userId), eq(connections.receiverId, userId))
        ),
      })

      if (!conn) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Conexão não encontrada" } })
      }

      await fastify.db.delete(connections).where(eq(connections.id, id))

      return reply.status(204).send()
    }
  )

  // GET /connections/status/:userId — check connection status with a specific user
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/connections/status/:userId",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ userId: z.string() }) },
    },
    async (request, reply) => {
      const myUserId = request.session!.user.id
      const { userId } = request.params

      const conn = await fastify.db.query.connections.findFirst({
        where: or(
          and(eq(connections.requesterId, myUserId), eq(connections.receiverId, userId)),
          and(eq(connections.requesterId, userId), eq(connections.receiverId, myUserId))
        ),
      })

      if (!conn) {
        return ok({ connectionId: null, status: null, isRequester: false })
      }

      return ok({
        connectionId: conn.id,
        status: conn.status,
        isRequester: conn.requesterId === myUserId,
      })
    }
  )
}

export default connectionsRoutes
