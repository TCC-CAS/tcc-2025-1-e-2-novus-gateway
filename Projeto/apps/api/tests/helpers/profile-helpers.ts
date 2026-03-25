import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { users } from "../../src/db/schema/index.js"
import { createTestApp, signUpUser, signInUser, extractSessionCookie } from "./auth-helpers.js"

/** Sign up a user with the given role and return { sessionCookie, email, password } */
export async function signUpAndGetCookie(
  app: FastifyInstance,
  role: "player" | "team"
): Promise<{ sessionCookie: string; email: string; password: string }> {
  const password = "Password123!"
  const { response, payload } = await signUpUser(app, { role })
  let sessionCookie = extractSessionCookie(response as any)
  if (!sessionCookie) throw new Error(`Sign-up failed for role=${role}: ${response.body}`)

  if (role !== "player") {
    // Better Auth admin plugin blocks role in sign-up body.
    // Patch role directly in DB, then re-sign-in to get a fresh session
    // that reflects the updated role.
    const body = response.json()
    const userId: string = body.user?.id ?? body.id
    await (app as any).db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))

    const signInRes = await signInUser(app, payload.email, password)
    const refreshedCookie = extractSessionCookie(signInRes as any)
    if (!refreshedCookie) throw new Error(`Re-sign-in failed for role=${role}: ${signInRes.body}`)
    sessionCookie = refreshedCookie
  }

  return { sessionCookie, email: payload.email, password }
}

/** Minimal valid player profile payload */
export const playerProfilePayload = {
  name: "João Silva",
  positions: ["atacante"],
  skills: ["drible", "finalização"],
}

/** Minimal valid team profile payload */
export const teamProfilePayload = {
  name: "Santos FC Várzea",
  level: "amador",
  openPositions: ["goleiro", "zagueiro"],
}

/** Upsert a player profile and return the response */
export async function upsertPlayerProfile(
  app: FastifyInstance,
  sessionCookie: string,
  overrides: Record<string, unknown> = {}
) {
  return app.inject({
    method: "PUT",
    url: "/api/players/me",
    headers: { cookie: sessionCookie },
    payload: { ...playerProfilePayload, ...overrides },
  })
}

/** Upsert a team profile and return the response */
export async function upsertTeamProfile(
  app: FastifyInstance,
  sessionCookie: string,
  overrides: Record<string, unknown> = {}
) {
  return app.inject({
    method: "PUT",
    url: "/api/teams/me",
    headers: { cookie: sessionCookie },
    payload: { ...teamProfilePayload, ...overrides },
  })
}
