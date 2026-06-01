import type { FastifyPluginAsync } from "fastify"

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (_req, reply) => {
    return reply.send({ status: "ok" })
  })
}

export default healthRoutes
