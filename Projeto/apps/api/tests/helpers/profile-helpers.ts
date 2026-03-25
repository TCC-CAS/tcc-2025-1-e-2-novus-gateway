import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser, signInUser, extractSessionCookie } from "./auth-helpers.js"

/** Sign up a user with the given role and return { sessionCookie, email, password } */
export async function signUpAndGetCookie(
  app: FastifyInstance,
  role: "player" | "team"
): Promise<{ sessionCookie: string; email: string; password: string }> {
  const password = "Password123!"
  const { response, payload } = await signUpUser(app, { role })
  const sessionCookie = extractSessionCookie(response as any)
  if (!sessionCookie) throw new Error(`Sign-up failed for role=${role}: ${response.body}`)
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
