import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"

describe("Rate limiting on auth routes", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it("returns 429 after 5 sign-in attempts within 15 minutes", async () => {
    const payload = { email: "ratelimit-signin@example.com", password: "Password123!" }

    // Send 5 requests (may return 401 since user doesn't exist, but rate limit still applies)
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        payload,
      })
    }

    // Next request should be rate-limited
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload,
    })
    expect(response.statusCode).toBe(429)
  })

  it("returns 429 after 5 sign-up attempts within 15 minutes", async () => {
    // Use the same email repeatedly — rate limit is keyed by email, so the same
    // address exhausts its bucket after 5 requests
    const payload = {
      email: "ratelimit-signup@example.com",
      password: "Password123!",
      name: "Rate Test",
      role: "player",
    }
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        payload,
      })
    }

    // Next request with same email should be rate-limited
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload,
    })
    expect(response.statusCode).toBe(429)
  })
})
