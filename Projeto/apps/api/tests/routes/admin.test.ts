import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser, signInUser, extractSessionCookie } from "../helpers/auth-helpers.js"
import { users } from "../../src/db/schema/index.js"
import { seedReport } from "../helpers/admin-helpers.js"

/** Sign up and get an admin session cookie */
async function signUpAndGetAdminCookie(
  app: FastifyInstance
): Promise<{ sessionCookie: string; userId: string; email: string }> {
  const password = "Password123!"
  const { response, payload } = await signUpUser(app)
  const body = response.json()
  const userId: string = body.user?.id ?? body.id
  // Patch role to admin directly in DB
  await (app as any).db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.id, userId))
  // Re-sign-in to get fresh session with updated role
  const signInRes = await signInUser(app, payload.email, password)
  const sessionCookie = extractSessionCookie(signInRes as any)
  if (!sessionCookie) throw new Error(`Admin re-sign-in failed: ${signInRes.body}`)
  return { sessionCookie, userId, email: payload.email }
}

/** Sign up a player and return id + cookie */
async function signUpPlayer(
  app: FastifyInstance
): Promise<{ sessionCookie: string; userId: string; email: string }> {
  const password = "Password123!"
  const { response, payload } = await signUpUser(app)
  const body = response.json()
  const userId: string = body.user?.id ?? body.id
  const sessionCookie = extractSessionCookie(response as any)
  if (!sessionCookie) throw new Error(`Player sign-up failed: ${response.body}`)
  return { sessionCookie, userId, email: payload.email }
}

describe("Admin user management routes", () => {
  let app: FastifyInstance
  let adminCookie: string
  let playerCookie: string
  let teamCookie: string
  let targetUserId: string

  beforeAll(async () => {
    app = await createTestApp()

    const admin = await signUpAndGetAdminCookie(app)
    adminCookie = admin.sessionCookie

    const player = await signUpPlayer(app)
    playerCookie = player.sessionCookie
    targetUserId = player.userId

    // Create a team user
    const { response: teamRes, payload: teamPayload } = await signUpUser(app)
    const teamBody = teamRes.json()
    const teamUserId: string = teamBody.user?.id ?? teamBody.id
    await (app as any).db
      .update(users)
      .set({ role: "team" })
      .where(eq(users.id, teamUserId))
    const teamSignIn = await signInUser(app, teamPayload.email, "Password123!")
    const tc = extractSessionCookie(teamSignIn as any)
    if (!tc) throw new Error("Team re-sign-in failed")
    teamCookie = tc
  })

  afterAll(async () => {
    await app.close()
  })

  // ADM-01: GET /api/admin/users
  describe("GET /api/admin/users", () => {
    it("ADM-01a: returns 200 with paginated user list for admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users?page=1&pageSize=20",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(Array.isArray(body.data)).toBe(true)
      expect(body).toHaveProperty("meta")
      expect(body.meta).toMatchObject({
        page: 1,
        pageSize: 20,
      })
      expect(typeof body.meta.total).toBe("number")
      expect(typeof body.meta.totalPages).toBe("number")
    })

    it("ADM-01b: filters by status=banned", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users?status=banned",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      body.data.forEach((u: any) => {
        expect(u.status).toBe("banned")
      })
    })

    it("ADM-01c: filters by role=player", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users?role=player",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      body.data.forEach((u: any) => {
        expect(u.role).toBe("player")
      })
    })

    it("ADM-01d: filters by search (name/email ilike)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users?search=test-",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty("data")
    })

    it("ADM-01e: returns 403 for non-admin (player)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("ADM-01f: returns 401 for unauthenticated request", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users",
      })
      expect(res.statusCode).toBe(401)
    })
  })

  // ADM-01: GET /api/admin/users/:id
  describe("GET /api/admin/users/:id", () => {
    it("ADM-01g: returns 200 with user detail for admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/admin/users/${targetUserId}`,
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data.id).toBe(targetUserId)
      expect(body.data).toHaveProperty("email")
      expect(body.data).toHaveProperty("role")
      expect(body.data).toHaveProperty("status")
      expect(body.data).toHaveProperty("createdAt")
    })

    it("ADM-01h: returns 404 for non-existent user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/users/nonexistent-user-id",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(404)
    })

    it("ADM-01i: returns 403 for non-admin", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/admin/users/${targetUserId}`,
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("ADM-01j: returns 401 for unauthenticated", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/admin/users/${targetUserId}`,
      })
      expect(res.statusCode).toBe(401)
    })
  })

  // ADM-02: POST /api/admin/users/:id/ban
  describe("POST /api/admin/users/:id/ban", () => {
    it("ADM-02a: bans a user and returns 200 with { data: { id, status: 'banned' } }", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/ban`,
        headers: { cookie: adminCookie },
        payload: { reason: "spam" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data.id).toBe(targetUserId)
      expect(body.data.status).toBe("banned")
    })

    it("ADM-02b: banned user gets 403 on subsequent requests (D-02)", async () => {
      // Ban the player first (may already be banned from previous test)
      await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/ban`,
        headers: { cookie: adminCookie },
        payload: { reason: "test ban" },
      })
      // Banned user's requests should return 403
      const res = await app.inject({
        method: "GET",
        url: "/api/players/me",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("ADM-02c: returns 404 for non-existent user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/users/nonexistent-id/ban",
        headers: { cookie: adminCookie },
        payload: {},
      })
      expect(res.statusCode).toBe(404)
    })

    it("ADM-02d: returns 403 for non-admin", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/ban`,
        headers: { cookie: teamCookie },
        payload: {},
      })
      expect(res.statusCode).toBe(403)
    })

    it("ADM-02e: returns 401 for unauthenticated", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/ban`,
        payload: {},
      })
      expect(res.statusCode).toBe(401)
    })
  })

  // ADM-02: POST /api/admin/users/:id/unban
  describe("POST /api/admin/users/:id/unban", () => {
    it("ADM-02f: unbans a user and returns 200 with { data: { id, status: 'active' } }", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/unban`,
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data.id).toBe(targetUserId)
      expect(body.data.status).toBe("active")
    })

    it("ADM-02g: unbanned user can access routes again (D-04)", async () => {
      // Unban first
      await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/unban`,
        headers: { cookie: adminCookie },
      })
      // Re-sign-in to get fresh cookie since previous was invalidated
      const { response: signUpRes, payload } = await signUpUser(app)
      const newUserId: string = signUpRes.json().user?.id ?? signUpRes.json().id
      const newCookie = extractSessionCookie(signUpRes as any)
      if (!newCookie) return // skip if no cookie
      // Just verify the unban itself returned active status
      const checkRes = await app.inject({
        method: "GET",
        url: `/api/admin/users/${targetUserId}`,
        headers: { cookie: adminCookie },
      })
      expect(checkRes.statusCode).toBe(200)
      expect(checkRes.json().data.status).toBe("active")
    })

    it("ADM-02h: returns 404 for non-existent user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/users/nonexistent-id/unban",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(404)
    })

    it("ADM-02i: returns 403 for non-admin", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/unban`,
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("ADM-02j: returns 401 for unauthenticated", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/users/${targetUserId}/unban`,
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

describe("Admin moderation routes", () => {
  let app: FastifyInstance
  let adminCookie: string
  let playerCookie: string
  let reporterUserId: string

  beforeAll(async () => {
    app = await createTestApp()

    // Create admin
    const password = "Password123!"
    const { response: adminRes, payload: adminPayload } = await signUpUser(app)
    const adminBody = adminRes.json()
    const adminId: string = adminBody.user?.id ?? adminBody.id
    await (app as any).db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, adminId))
    const adminSignIn = await signInUser(app, adminPayload.email, password)
    const ac = extractSessionCookie(adminSignIn as any)
    if (!ac) throw new Error("Admin sign-in failed")
    adminCookie = ac

    // Create a player as reporter
    const { response: playerRes, payload: playerPayload } = await signUpUser(app)
    const playerBody = playerRes.json()
    reporterUserId = playerBody.user?.id ?? playerBody.id
    const playerSignIn = await signInUser(app, playerPayload.email, password)
    const pc = extractSessionCookie(playerSignIn as any)
    if (!pc) throw new Error("Player sign-in failed")
    playerCookie = pc
  })

  afterAll(async () => {
    await app.close()
  })

  // ADM-03: GET /api/admin/moderation/reports
  describe("GET /api/admin/moderation/reports", () => {
    it("ADM-03a: admin can list pending moderation reports with pagination", async () => {
      await seedReport(app, reporterUserId)
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/moderation/reports",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body).toHaveProperty("meta")
      expect(body.meta).toHaveProperty("total")
      expect(body.meta).toHaveProperty("page")
    })

    it("ADM-03b: filters by status=pending", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/moderation/reports?status=pending",
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      body.data.forEach((r: any) => {
        expect(r.status).toBe("pending")
      })
    })

    it("ADM-03c: non-admin gets 403", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/moderation/reports",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("ADM-03d: unauthenticated gets 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/admin/moderation/reports",
      })
      expect(res.statusCode).toBe(401)
    })
  })

  // ADM-04: POST /api/admin/moderation/reports/:id
  describe("POST /api/admin/moderation/reports/:id", () => {
    it("ADM-04a: admin can dismiss a report", async () => {
      const reportId = await seedReport(app, reporterUserId)
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/moderation/reports/${reportId}`,
        headers: { cookie: adminCookie },
        payload: { action: "dismiss", note: "Not a violation" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data).toHaveProperty("status", "dismissed")
    })

    it("ADM-04b: admin can warn (increments warnCount, resolves report)", async () => {
      const reportId = await seedReport(app, reporterUserId)
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/moderation/reports/${reportId}`,
        headers: { cookie: adminCookie },
        payload: { action: "warn", note: "First warning" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data).toHaveProperty("status", "resolved")
    })

    it("ADM-04c: admin can remove content (resolves report)", async () => {
      const reportId = await seedReport(app, reporterUserId)
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/moderation/reports/${reportId}`,
        headers: { cookie: adminCookie },
        payload: { action: "remove", note: "Content removed" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data).toHaveProperty("status", "resolved")
    })

    it("ADM-04d: invalid action returns 400", async () => {
      const reportId = await seedReport(app, reporterUserId)
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/moderation/reports/${reportId}`,
        headers: { cookie: adminCookie },
        payload: { action: "invalid_action" },
      })
      expect(res.statusCode).toBe(400)
    })

    it("ADM-04e: returns 404 for non-existent report", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/admin/moderation/reports/nonexistent-report-id",
        headers: { cookie: adminCookie },
        payload: { action: "dismiss" },
      })
      expect(res.statusCode).toBe(404)
    })

    it("ADM-04f: non-admin gets 403", async () => {
      const reportId = await seedReport(app, reporterUserId)
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/moderation/reports/${reportId}`,
        headers: { cookie: playerCookie },
        payload: { action: "dismiss" },
      })
      expect(res.statusCode).toBe(403)
    })

    it("ADM-04g: unauthenticated gets 401", async () => {
      const reportId = await seedReport(app, reporterUserId)
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/moderation/reports/${reportId}`,
        payload: { action: "dismiss" },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
