import { buildApp } from "../../src/app.js"
import type { FastifyInstance } from "fastify"

export async function createTestApp(): Promise<FastifyInstance> {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/testdb"
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-that-is-long-enough-for-validation"
  process.env.NODE_ENV = "test"
  const app = await buildApp()
  await app.ready()
  return app
}

export async function signUpUser(
  app: FastifyInstance,
  overrides: Partial<{ email: string; password: string; name: string; role: string }> = {}
) {
  const payload = {
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "Password123!",
    name: "Test User",
    role: "player",
    ...overrides,
  }
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload,
  })
  return { response, payload }
}

export async function signInUser(
  app: FastifyInstance,
  email: string,
  password: string
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    payload: { email, password },
  })
  return response
}

export function extractSessionCookie(
  response: { headers: Record<string, string | string[] | undefined> }
): string | undefined {
  const setCookie = response.headers["set-cookie"]
  if (!setCookie) return undefined
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  // Better Auth sets a cookie starting with "better-auth" or containing session info
  const sessionCookie = cookies.find(
    (c) => c.includes("better-auth") || c.includes("varzeapro") || c.includes("session")
  )
  return sessionCookie
}
