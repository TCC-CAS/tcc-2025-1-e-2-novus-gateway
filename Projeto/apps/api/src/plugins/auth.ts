import fp from "fastify-plugin"
import { createAuth } from "../lib/auth.js"
import type { Auth } from "../lib/auth.js"
import type { FastifyPluginAsync } from "fastify"

// Augment FastifyInstance so fastify.auth is typed
declare module "fastify" {
  interface FastifyInstance {
    auth: Auth
  }
}

/**
 * Converts a Fastify request into a web fetch Request and pipes
 * the web Response back to Fastify reply — compatible with inject().
 */
async function handleAuthRequest(
  request: import("fastify").FastifyRequest,
  reply: import("fastify").FastifyReply
) {
  const auth = request.server.auth
  const url = `${request.protocol}://${request.hostname}${request.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v)
      } else {
        headers.set(key, value)
      }
    }
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? JSON.stringify(request.body)
      : undefined

  const webRequest = new Request(url, {
    method: request.method,
    headers,
    body,
  })

  const response = await auth.handler(webRequest)

  reply.status(response.status)
  response.headers.forEach((value, key) => {
    reply.header(key, value)
  })
  const responseBody = await response.text()
  // Strip token from JSON responses — token must only live in the HttpOnly cookie (AUTH-02)
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(responseBody)
      if ("token" in json) delete json.token
      return reply.send(JSON.stringify(json))
    } catch {
      // not valid JSON — send as-is
    }
  }
  return reply.send(responseBody)
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Create Better Auth using the shared database connection
  const auth = createAuth(fastify.db)
  fastify.decorate("auth", auth)

  // Rate-limited explicit routes for sign-in and sign-up (AUTH-01, AUTH-02)
  const rateLimitConfig = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
        hook: "preHandler" as const,
        keyGenerator: (request: import("fastify").FastifyRequest) => {
          const body = request.body as Record<string, unknown> | undefined
          const email = body?.email
          return typeof email === "string" ? `auth:${email}` : `auth:ip:${request.ip}`
        },
      },
    },
  }

  fastify.post("/api/auth/sign-in/email", rateLimitConfig, handleAuthRequest)
  fastify.post("/api/auth/sign-up/email", rateLimitConfig, handleAuthRequest)

  // Catch-all for remaining Better Auth routes (password reset, session, etc.)
  fastify.all("/api/auth/*", handleAuthRequest)
}

export default fp(authPlugin, {
  name: "auth",
  dependencies: ["env", "rate-limit", "db"],
})
