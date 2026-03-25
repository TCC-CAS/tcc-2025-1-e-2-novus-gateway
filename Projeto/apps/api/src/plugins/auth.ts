import fp from "fastify-plugin"
import { auth } from "../lib/auth.js"
import type { FastifyPluginAsync } from "fastify"

/**
 * Converts a Fastify request into a web fetch Request and pipes
 * the web Response back to Fastify reply — compatible with inject().
 * Replaces the previous reply.hijack() + toNodeHandler() pattern which
 * bypassed Fastify's response lifecycle and hung during inject().
 */
async function handleAuthRequest(
  request: import("fastify").FastifyRequest,
  reply: import("fastify").FastifyReply
) {
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
  return reply.send(responseBody)
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("auth", auth)

  // Rate-limited explicit routes for sign-in and sign-up (AUTH-01, AUTH-02)
  const rateLimitConfig = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
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
  dependencies: ["env", "rate-limit"],
})
