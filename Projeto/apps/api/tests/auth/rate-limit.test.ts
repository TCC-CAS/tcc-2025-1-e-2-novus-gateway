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

    // 6th request should be rate-limited
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload,
    })
    expect(response.statusCode).toBe(429)
  })

  it("returns 429 after 5 sign-up attempts within 15 minutes", async () => {
    // Each sign-up uses the same IP (127.0.0.1) via inject()
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        payload: {
          email: `rate-${i}-${Date.now()}@example.com`,
          password: "Password123!",
          name: "Rate Test",
          role: "player",
        },
      })
    }

    // 6th request should be rate-limited
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: {
        email: `rate-final-${Date.now()}@example.com`,
        password: "Password123!",
        name: "Rate Test",
        role: "player",
      },
    })
    expect(response.statusCode).toBe(429)
  })
})
