import Fastify from "fastify"
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod"
import { registerErrorHandler } from "./lib/errors.js"
import { requireSession, requireRole } from "./hooks/require-auth.js"

export async function buildApp() {
  const isDev = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test"
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== "test"
      ? {
          level: "info",
          transport: isDev
            ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
            : undefined,
        }
      : false,
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
  await fastify.register(import("./plugins/socket-io.js"))

  // Multipart support for file uploads
  await fastify.register(import("@fastify/multipart"), {
    limits: { fileSize: 5 * 1024 * 1024 },
  })

  registerErrorHandler(fastify)

  // Cache-Control headers — short cache for profile data, no-store for authenticated
  fastify.addHook("onSend", async (_request, reply) => {
    const route = reply.request.routeOptions.url ?? ""
    // Public profile data — cache briefly
    if (route.startsWith("/api/players") || route.startsWith("/api/teams") || route.startsWith("/api/search")) {
      reply.header("Cache-Control", "private, max-age=30")
    } else {
      reply.header("Cache-Control", "no-store")
    }
  })

  await fastify.register(import("./routes/health.js"), { prefix: "/health" })
  await fastify.register(import("./routes/players.js"), { prefix: "/api/players" })
  await fastify.register(import("./routes/teams.js"), { prefix: "/api/teams" })
  await fastify.register(import("./routes/search.js"), { prefix: "/api/search" })
  await fastify.register(import("./routes/subscription.js"), { prefix: "/api/subscription" })
  await fastify.register(import("./routes/conversations.js"), { prefix: "/api" })
  await fastify.register(import("./routes/reports.js"), { prefix: "/api" })
  await fastify.register(import("./routes/favorites.js"), { prefix: "/api" })
  await fastify.register(import("./routes/upload.js"), { prefix: "/api" })
  await fastify.register(import("./routes/gallery.js"), { prefix: "/api/gallery" })
  await fastify.register(import("./routes/webhooks/mercadopago.js"), { prefix: "/api/webhooks" })
  await fastify.register(import("./routes/admin.js"), { prefix: "/api/admin" })

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
