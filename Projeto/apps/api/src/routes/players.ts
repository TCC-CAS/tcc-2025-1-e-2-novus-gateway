import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { players } from "../db/schema/index.js"
import { UpsertPlayerProfileRequestSchema } from "../../../../apps/web/shared/contracts/players.js"

const playersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /me — authenticated player only
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    { preHandler: [requireRole("player")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.userId, userId),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }
      return ok({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )

  // PUT /me — upsert player profile
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/me",
    {
      preHandler: [requireRole("player")],
      schema: { body: UpsertPlayerProfileRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const fields = request.body
      const [result] = await fastify.db
        .insert(players)
        .values({
          id: nanoid(),
          userId,
          ...fields,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: players.userId,
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

  // GET /:id — any authenticated user
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.id, request.params.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }
      return ok({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )
}

export default playersRoutes
