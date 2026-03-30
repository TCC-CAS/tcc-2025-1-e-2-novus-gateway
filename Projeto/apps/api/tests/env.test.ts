import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { buildApp } from "../src/app.js"
import { ok, list } from "../src/lib/response.js"

describe("Response helpers", () => {
  it("Test 3: ok({ id: '1' }) returns { data: { id: '1' } }", () => {
    const result = ok({ id: "1" })
    expect(result).toEqual({ data: { id: "1" } })
  })

  it("Test 4: list([1,2], 1, 10, 2) returns correct shape", () => {
    const result = list([1, 2], 1, 10, 2)
    expect(result).toEqual({
      data: [1, 2],
      meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    })
  })
})

describe("Environment validation", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("Test 5: buildApp() throws when DATABASE_URL env var is missing", async () => {
    delete process.env.DATABASE_URL
    process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-validation"
    process.env.NODE_ENV = "test"

    await expect(buildApp()).rejects.toThrow()
  })

  it("buildApp() throws when JWT_SECRET is missing", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb"
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = "test"

    await expect(buildApp()).rejects.toThrow()
  })

  it("buildApp() throws when JWT_SECRET is shorter than 32 chars", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb"
    process.env.JWT_SECRET = "tooshort"
    process.env.NODE_ENV = "test"

    await expect(buildApp()).rejects.toThrow()
  })
})
