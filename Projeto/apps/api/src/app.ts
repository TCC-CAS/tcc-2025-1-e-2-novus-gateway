import Fastify from "fastify"
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod"
import { registerErrorHandler } from "./lib/errors.js"
import { requireSession, requireRole } from "./hooks/require-auth.js"

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== "test",
  }).withTypeProvider<ZodTypeProvider>()

  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Order matters: env first, then plugins, then routes
  await fastify.register(import("./config/env.js"))
  await fastify.register(import("./plugins/db.js"))
  await fastify.register(import("./plugins/cors.js"))
  await fastify.register(import("@fastify/sensible"))
  await fastify.register(import("./plugins/rate-limit.js"))
  await fastify.register(import("./plugins/auth.js"))

  registerErrorHandler(fastify)

  await fastify.register(import("./routes/health.js"), { prefix: "/health" })
  await fastify.register(import("./routes/players.js"), { prefix: "/api/players" })
  await fastify.register(import("./routes/teams.js"), { prefix: "/api/teams" })
  await fastify.register(import("./routes/search.js"), { prefix: "/api/search" })
  await fastify.register(import("./routes/subscription.js"), { prefix: "/api/subscription" })

  // Protected test route for AUTH-04 verification (401 without session, 403 with wrong role)
  fastify.get("/api/me", { preHandler: [requireSession] }, async (request, reply) => {
    return { data: request.session!.user }
  })

  // Admin-only test route for RBAC verification
  fastify.get("/api/admin/test", { preHandler: [requireRole("admin")] }, async (request, reply) => {
    return { data: { message: "admin access granted" } }
  })

  return fastify
}
