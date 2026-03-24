import fp from "fastify-plugin"
import { toNodeHandler } from "better-auth/node"
import { auth } from "../lib/auth.js"
import type { FastifyPluginAsync } from "fastify"

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("auth", auth)

  // Rate-limited explicit routes for sign-in and sign-up (AUTH-01, AUTH-02)
  // These are registered BEFORE the catch-all so they match first
  const rateLimitConfig = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
  }

  fastify.post("/api/auth/sign-in/email", rateLimitConfig, async (request, reply) => {
    reply.hijack()
    await toNodeHandler(auth)(request.raw, reply.raw)
  })

  fastify.post("/api/auth/sign-up/email", rateLimitConfig, async (request, reply) => {
    reply.hijack()
    await toNodeHandler(auth)(request.raw, reply.raw)
  })

  // Catch-all for remaining Better Auth routes (password reset, session, etc.)
  fastify.all("/api/auth/*", async (request, reply) => {
    reply.hijack()
    await toNodeHandler(auth)(request.raw, reply.raw)
  })
}

export default fp(authPlugin, {
  name: "auth",
  dependencies: ["env", "rate-limit"],
})
