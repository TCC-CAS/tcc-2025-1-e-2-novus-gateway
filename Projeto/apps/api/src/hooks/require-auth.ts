import type { FastifyRequest, FastifyReply } from "fastify"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../lib/auth.js"

export async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  })
  if (!session) {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    })
  }
  request.session = session
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply)
    if (reply.sent) return
    const role = request.session?.user?.role
    if (!role || !roles.includes(role)) {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      })
    }
  }
}
