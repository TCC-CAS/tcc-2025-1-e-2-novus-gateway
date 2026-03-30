import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { teams } from "../db/schema/index.js"
import { UpsertTeamProfileRequestSchema } from "../../../../apps/web/shared/contracts/teams.js"

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
      return ok({
        ...profile,
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
      const fields = request.body
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

  // GET /:id — any authenticated user
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const profile = await fastify.db.query.teams.findFirst({
        where: eq(teams.id, request.params.id),
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

export default teamsRoutes
