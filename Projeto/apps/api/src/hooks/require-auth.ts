import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../lib/auth.js"
import { eq } from "drizzle-orm"
import { users } from "../db/schema/users.js"

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

  // Check ban status per D-02: banned users get 403 on every authenticated request
  const fastify = request.server as FastifyInstance & { db: any }
  const result = await fastify.db
    .select({ banned: users.banned })
    .from(users)
    .where(eq(users.id, session.user.id))
  if (result[0]?.banned === true) {
    return reply.status(403).send({
      error: { code: "ACCOUNT_BANNED", message: "Your account has been banned" },
    })
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply)
    if (reply.sent) return
    const role = request.session?.user.role
    if (!role || !roles.includes(role)) {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      })
    }
  }
}
