import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { nanoid } from "nanoid"
import { requireSession } from "../hooks/require-auth.js"
import { moderationReports } from "../db/schema/moderation-reports.js"
import {
  CreateReportRequestSchema,
} from "../../../../apps/web/shared/contracts/moderation.js"

const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /reports — create a report (any authenticated user)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/reports",
    {
      preHandler: [requireSession],
      schema: { body: CreateReportRequestSchema },
    },
    async (request, reply) => {
      const { reportedEntityType, reportedEntityId, reason, description } = request.body
      const reporterId = request.session!.user.id

      const id = nanoid()

      await fastify.db.insert(moderationReports).values({
        id,
        reporterId,
        reportedEntityType,
        reportedEntityId,
        reason,
        description: description ?? null,
      })

      return reply.status(201).send({ data: { id } })
    }
  )
}

export default reportRoutes
