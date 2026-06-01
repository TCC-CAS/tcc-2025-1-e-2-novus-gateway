import fp from "fastify-plugin"
import cors from "@fastify/cors"
import type { FastifyPluginAsync } from "fastify"

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: fastify.config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
}

export default fp(corsPlugin, { name: "cors", dependencies: ["env"] })
