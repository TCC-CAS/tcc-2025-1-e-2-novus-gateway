import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp, signUpUser } from "../helpers/auth-helpers.js"

describe("POST /api/auth/request-password-reset", () => {
  let app: FastifyInstance
  const testEmail = `reset-${Date.now()}@example.com`

  beforeAll(async () => {
    app = await createTestApp()
    await signUpUser(app, { email: testEmail })
  })

  afterAll(async () => {
    await app.close()
  })

  it("accepts password reset request for existing email", async () => {
    const consoleSpy = vi.spyOn(console, "log")

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/request-password-reset",
      payload: { email: testEmail },
    })

    expect(response.statusCode).toBe(200)

    // AUTH-03: token should be logged to console (stub, no email sent)
    const resetLog = consoleSpy.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("[PASSWORD RESET]")
    )
    expect(resetLog).toBeDefined()

    consoleSpy.mockRestore()
  })
})
