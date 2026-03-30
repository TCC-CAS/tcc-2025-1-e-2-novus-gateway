import type { Session, User } from "better-auth/types"
import type { Auth } from "../lib/auth.js"

declare module "fastify" {
  interface FastifyInstance {
    auth: Auth
  }
  interface FastifyRequest {
    session?: { session: Session; user: User & { role: string; planId?: string } }
  }
}
