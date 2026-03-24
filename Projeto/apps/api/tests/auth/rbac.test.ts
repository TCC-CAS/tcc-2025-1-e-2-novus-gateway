import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser, extractSessionCookie } from "../helpers/auth-helpers.js"

describe("RBAC enforcement (AUTH-04)", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it("returns 401 for unauthenticated request to /api/me", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/me",
    })
    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  it("returns 200 with user data for authenticated request to /api/me", async () => {
    const { response: signUpResponse } = await signUpUser(app, { role: "player" })
    const cookie = extractSessionCookie(signUpResponse)
    expect(cookie).toBeDefined()

    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: cookie! },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.data).toBeDefined()
    expect(body.data.email).toBeDefined()
  })

  it("returns 403 for player accessing admin route /api/admin/test", async () => {
    const { response: signUpResponse } = await signUpUser(app, { role: "player" })
    const cookie = extractSessionCookie(signUpResponse)
    expect(cookie).toBeDefined()

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/test",
      headers: { cookie: cookie! },
    })
    expect(response.statusCode).toBe(403)
    const body = JSON.parse(response.body)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("returns 401 for unauthenticated request to /api/admin/test", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/test",
    })
    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.error.code).toBe("UNAUTHORIZED")
  })
})
