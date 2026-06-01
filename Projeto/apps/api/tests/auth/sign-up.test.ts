import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser, extractSessionCookie } from "../helpers/auth-helpers.js"

describe("POST /api/auth/sign-up/email", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it("creates a user with role=player and returns HttpOnly session cookie", async () => {
    const { response } = await signUpUser(app, { role: "player" })
    expect(response.statusCode).toBe(200)

    const cookie = extractSessionCookie(response)
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/i)
  })

  it("creates a user with role=team and returns HttpOnly session cookie", async () => {
    const { response } = await signUpUser(app, { role: "team" })
    expect(response.statusCode).toBe(200)

    const cookie = extractSessionCookie(response)
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/i)
  })

  it("rejects sign-up with missing email", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { password: "Password123!", name: "Test", role: "player" },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it("rejects sign-up with weak password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { email: "weak@example.com", password: "123", name: "Test", role: "player" },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it("does not expose session token in JSON response body", async () => {
    const { response } = await signUpUser(app)
    const body = JSON.parse(response.body)
    expect(body.token).toBeUndefined()
    expect(body.sessionToken).toBeUndefined()
    expect(body.accessToken).toBeUndefined()
  })
})
