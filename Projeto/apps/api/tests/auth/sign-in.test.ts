import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser, signInUser, extractSessionCookie } from "../helpers/auth-helpers.js"

describe("POST /api/auth/sign-in/email", () => {
  let app: FastifyInstance
  const testEmail = `signin-${Date.now()}@example.com`
  const testPassword = "Password123!"

  beforeAll(async () => {
    app = await createTestApp()
    // Create a user to sign in with
    await signUpUser(app, { email: testEmail, password: testPassword })
  })

  afterAll(async () => {
    await app.close()
  })

  it("returns HttpOnly session cookie on valid credentials", async () => {
    const response = await signInUser(app, testEmail, testPassword)
    expect(response.statusCode).toBe(200)

    const cookie = extractSessionCookie(response)
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/i)
  })

  it("does not expose session token in JSON response body", async () => {
    const response = await signInUser(app, testEmail, testPassword)
    const body = JSON.parse(response.body)
    expect(body.token).toBeUndefined()
    expect(body.sessionToken).toBeUndefined()
    expect(body.accessToken).toBeUndefined()
  })

  it("rejects invalid credentials", async () => {
    const response = await signInUser(app, testEmail, "WrongPassword!")
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it("rejects non-existent email", async () => {
    const response = await signInUser(app, "nonexistent@example.com", "Password123!")
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
})
