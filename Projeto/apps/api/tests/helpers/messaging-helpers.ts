import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { users } from "../../src/db/schema/index.js"
import { signUpUser, signInUser, extractSessionCookie } from "./auth-helpers.js"

/**
 * Signs up a user with the given role and returns { sessionCookie, userId }.
 * Mirrors profile-helpers signUpAndGetCookie but also returns the userId.
 */
async function signUpAndGetCookieWithId(
  app: FastifyInstance,
  role: "player" | "team"
): Promise<{ sessionCookie: string; userId: string }> {
  const password = "Password123!"
  const { response, payload } = await signUpUser(app, { role })
  let sessionCookie = extractSessionCookie(response as any)
  if (!sessionCookie) throw new Error(`Sign-up failed for role=${role}: ${response.body}`)

  const body = response.json()
  const userId: string = body.user?.id ?? body.id

  if (role !== "player") {
    // Better Auth admin plugin blocks role in sign-up body.
    // Patch role directly in DB, then re-sign-in to get a fresh session.
    await (app as any).db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))

    const signInRes = await signInUser(app, payload.email, password)
    const refreshedCookie = extractSessionCookie(signInRes as any)
    if (!refreshedCookie) throw new Error(`Re-sign-in failed for role=${role}: ${signInRes.body}`)
    sessionCookie = refreshedCookie
  }

  return { sessionCookie, userId }
}

/**
 * Signs up two users (player + team), creates a conversation between them,
 * and returns cookies and the conversation ID for downstream tests.
 */
export async function signUpAndCreateConversation(app: FastifyInstance): Promise<{
  playerCookie: string
  teamCookie: string
  playerId: string
  teamUserId: string
  conversationId: string
}> {
  const player = await signUpAndGetCookieWithId(app, "player")
  const team = await signUpAndGetCookieWithId(app, "team")

  // POST /api/conversations as player targeting team user
  const res = await app.inject({
    method: "POST",
    url: "/api/conversations",
    payload: { participantId: team.userId },
    headers: { cookie: player.sessionCookie },
  })

  const body = JSON.parse(res.body)
  return {
    playerCookie: player.sessionCookie,
    teamCookie: team.sessionCookie,
    playerId: player.userId,
    teamUserId: team.userId,
    conversationId: body.data?.id ?? "unknown",
  }
}
