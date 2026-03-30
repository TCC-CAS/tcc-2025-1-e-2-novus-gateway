import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser, signInUser, extractSessionCookie } from "./auth-helpers.js"

/** Signs up a user, patches their role to "admin" in DB, returns session cookie */
export async function createAdminUser(app: FastifyInstance): Promise<{ sessionCookie: string; userId: string; email: string }> {
  const { payload } = await signUpUser(app, { email: `admin-${Date.now()}@example.com`, role: "player" })
  // Patch role to admin directly in DB via app's drizzle instance
  const db = (app as any).db
  const { users } = await import("../../src/db/schema/users.js")
  const { eq } = await import("drizzle-orm")
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, payload.email))
  await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id))
  // Sign in to get session with admin role
  const freshSignIn = await signInUser(app, payload.email, payload.password)
  const sessionCookie = extractSessionCookie(freshSignIn as any)!
  return { sessionCookie, userId: user.id, email: payload.email }
}

/** Signs up a regular player/team user, returns session cookie and userId */
export async function createRegularUser(app: FastifyInstance, role: "player" | "team" = "player"): Promise<{ sessionCookie: string; userId: string; email: string }> {
  const { payload } = await signUpUser(app, { role })
  const signInRes = await signInUser(app, payload.email, payload.password)
  const db = (app as any).db
  const { users } = await import("../../src/db/schema/users.js")
  const { eq } = await import("drizzle-orm")
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, payload.email))
  const sessionCookie = extractSessionCookie(signInRes as any)!
  return { sessionCookie, userId: user.id, email: payload.email }
}

/** Seeds a moderation report in DB, returns the report id */
export async function seedReport(app: FastifyInstance, reporterId: string, overrides: Partial<{
  reportedEntityType: "player" | "team" | "message"
  reportedEntityId: string
  reason: "inappropriate" | "spam" | "harassment" | "fake" | "other"
  description: string
}> = {}): Promise<string> {
  const db = (app as any).db
  const { moderationReports } = await import("../../src/db/schema/moderation-reports.js")
  const id = `report-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await db.insert(moderationReports).values({
    id,
    reporterId,
    reportedEntityType: overrides.reportedEntityType ?? "player",
    reportedEntityId: overrides.reportedEntityId ?? "entity-123",
    reason: overrides.reason ?? "spam",
    description: overrides.description ?? "Test report",
    status: "pending",
  })
  return id
}

/** Sets a user's banned status directly in DB (for testing ban enforcement) */
export async function setUserBanned(app: FastifyInstance, userId: string, banned: boolean): Promise<void> {
  const db = (app as any).db
  const { users } = await import("../../src/db/schema/users.js")
  const { eq } = await import("drizzle-orm")
  await db.update(users).set({ banned }).where(eq(users.id, userId))
}
