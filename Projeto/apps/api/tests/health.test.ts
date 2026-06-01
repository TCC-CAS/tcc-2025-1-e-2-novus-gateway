import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { buildApp } from "../src/app.js"
import type { FastifyInstance } from "fastify"

describe("Fastify server", () => {
  let app: FastifyInstance

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb"
    process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-validation"
    process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-long-enough-32chars"
    process.env.NODE_ENV = "test"
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it("Test 1: buildApp() creates a Fastify instance without throwing", async () => {
    expect(app).toBeDefined()
    expect(typeof app.inject).toBe("function")
  })

  it("Test 2: GET /health returns 200 with body { status: 'ok' }", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: "ok" })
  })
})
