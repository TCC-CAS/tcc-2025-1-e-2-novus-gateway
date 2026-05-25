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

/** Maps Better Auth error codes to user-friendly Portuguese messages */
const AUTH_ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  USER_ALREADY_EXISTS:                    { status: 409, message: "Este e-mail já está cadastrado. Tente fazer login." },
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:  { status: 409, message: "Este e-mail já está cadastrado. Use outro e-mail ou faça login." },
  INVALID_EMAIL_OR_PASSWORD:              { status: 401, message: "E-mail ou senha incorretos." },
  INVALID_EMAIL:                          { status: 400, message: "E-mail inválido." },
  INVALID_PASSWORD:                       { status: 400, message: "Senha inválida." },
  USER_NOT_FOUND:                         { status: 404, message: "Usuário não encontrado." },
  INVALID_TOKEN:                          { status: 400, message: "Token inválido ou expirado." },
  SESSION_EXPIRED:                        { status: 401, message: "Sessão expirada. Faça login novamente." },
  UNAUTHORIZED:                           { status: 401, message: "Você precisa estar autenticado para realizar esta ação." },
  FORBIDDEN:                              { status: 403, message: "Você não tem permissão para realizar esta ação." },
  TOO_MANY_ATTEMPTS:                      { status: 429, message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
  UNPROCESSABLE_ENTITY:                   { status: 422, message: "Os dados enviados são inválidos. Verifique e tente novamente." },
  BAD_REQUEST:                            { status: 400, message: "Requisição inválida. Verifique os dados e tente novamente." },
  NOT_FOUND:                              { status: 404, message: "Recurso não encontrado." },
  USER_ALREADY_HAS_PASSWORD:              { status: 400, message: "Esta conta já possui uma senha definida." },
}

/**
 * Converts a Fastify request into a web fetch Request and pipes
 * the web Response back to Fastify reply — compatible with inject().
 * Translates Better Auth error codes to Portuguese user-friendly messages.
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
  // Strip token + translate errors in JSON responses
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(responseBody)
      if ("token" in json) delete json.token

      // Translate Better Auth error codes to Portuguese
      const errorCode: string | undefined = json.code ?? json.error?.code
      if (errorCode && response.status >= 400) {
        const translated = AUTH_ERROR_MESSAGES[errorCode]
        if (translated) {
          reply.status(translated.status)
          return reply.send(JSON.stringify({
            error: { code: errorCode, message: translated.message },
          }))
        }
        // Fallback: wrap in our standard error shape with original message translated
        const fallbackMessage = json.message ?? json.error?.message ?? "Ocorreu um erro. Tente novamente."
        return reply.send(JSON.stringify({
          error: { code: errorCode, message: fallbackMessage },
        }))
      }

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
