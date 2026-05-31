import Fastify from "fastify"
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod"
import { registerErrorHandler } from "./lib/errors.js"
import { requireSession, requireRole } from "./hooks/require-auth.js"
import { ImageStorage } from "./lib/images/storage.js"
import { startExpireSubscriptionsCron } from "./jobs/expire-subscriptions.js"

const IMAGE_URL_FIELDS = new Set([
  "photoUrl", "logoUrl", "avatarUrl",
  "thumbnailUrl", "mediumUrl", "originalUrl",
  "playerPhotoUrl", "teamLogoUrl",
])

async function resolveUrlFields(obj: unknown, storage: ImageStorage, depth = 0): Promise<void> {
  if (depth > 6 || !obj || typeof obj !== "object") return
  if (Array.isArray(obj)) {
    await Promise.all(obj.map((item) => resolveUrlFields(item, storage, depth + 1)))
    return
  }
  const record = obj as Record<string, unknown>
  const tasks: Promise<void>[] = []
  for (const key of Object.keys(record)) {
    const value = record[key]
    if (IMAGE_URL_FIELDS.has(key) && typeof value === "string" && value) {
      tasks.push(storage.resolveUrl(value).then((resolved) => { record[key] = resolved }))
    } else if (value && typeof value === "object") {
      tasks.push(resolveUrlFields(value, storage, depth + 1))
    }
  }
  await Promise.all(tasks)
}

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

  // Resolve S3 keys / legacy presigned URLs to fresh signed URLs before every response.
  // getSignedUrl() is CPU-only (no network), so concurrent resolution is cheap.
  const storage = new ImageStorage()
  fastify.addHook("preSerialization", async (_request, _reply, payload) => {
    await resolveUrlFields(payload, storage)
    return payload
  })

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
  await fastify.register(import("./routes/public.js"), { prefix: "/api/public" })
  await fastify.register(import("./routes/subscription.js"), { prefix: "/api/subscription" })
  await fastify.register(import("./routes/conversations.js"), { prefix: "/api" })
  await fastify.register(import("./routes/reports.js"), { prefix: "/api" })
  await fastify.register(import("./routes/favorites.js"), { prefix: "/api" })
  await fastify.register(import("./routes/upload.js"), { prefix: "/api" })
  await fastify.register(import("./routes/gallery.js"), { prefix: "/api/gallery" })
  await fastify.register(import("./routes/webhooks/mercadopago.js"), { prefix: "/api/webhooks" })
  await fastify.register(import("./routes/admin.js"), { prefix: "/api/admin" })
  await fastify.register(import("./routes/matches.js"), { prefix: "/api" })
  await fastify.register(import("./routes/connections.js"), { prefix: "/api" })

  // Protected test route for AUTH-04 verification (401 without session, 403 with wrong role)
  fastify.get("/api/me", { preHandler: [requireSession] }, async (request, reply) => {
    return { data: request.session!.user }
  })

  // Admin-only test route for RBAC verification
  fastify.get("/api/admin/test", { preHandler: [requireRole("admin")] }, async (request, reply) => {
    return { data: { message: "admin access granted" } }
  })

  // Start cron job to expire paused subscriptions (skip in test env)
  if (process.env.NODE_ENV !== "test") {
    fastify.addHook("onReady", async () => {
      const interval = startExpireSubscriptionsCron(fastify.db, fastify.log)
      fastify.addHook("onClose", async () => clearInterval(interval))
    })
  }

  return fastify
}
