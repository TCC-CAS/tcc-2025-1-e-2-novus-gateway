import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import { signUpAndGetCookie } from "../helpers/profile-helpers.js"

describe("Subscription routes", () => {
  let app: FastifyInstance
  let playerCookie: string
  let teamCookie: string

  beforeAll(async () => {
    app = await createTestApp()
    const player = await signUpAndGetCookie(app, "player")
    playerCookie = player.sessionCookie
    const team = await signUpAndGetCookie(app, "team")
    teamCookie = team.sessionCookie
  })

  afterAll(async () => {
    await app.close()
  })

  // SUB-01: GET /api/subscription/usage
  describe("GET /api/subscription/usage (SUB-01)", () => {
    it("SUB-01a: returns 200 with { data: UsageShape } as authenticated player", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/subscription/usage",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
    })

    it("SUB-01b: auto-creates free subscription if none exists — idempotent (two calls both 200)", async () => {
      const freshPlayer = await signUpAndGetCookie(app, "player")
      const res1 = await app.inject({
        method: "GET",
        url: "/api/subscription/usage",
        headers: { cookie: freshPlayer.sessionCookie },
      })
      expect(res1.statusCode).toBe(200)

      const res2 = await app.inject({
        method: "GET",
        url: "/api/subscription/usage",
        headers: { cookie: freshPlayer.sessionCookie },
      })
      expect(res2.statusCode).toBe(200)
    })

    it("SUB-01c: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/subscription/usage",
      })
      expect(res.statusCode).toBe(401)
    })

    it("SUB-01d: response data contains all UsageSchema fields", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/subscription/usage",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      const data = body.data
      expect(typeof data.conversationsUsed).toBe("number")
      expect(typeof data.conversationsLimit).toBe("number")
      expect(typeof data.searchResultsLimit).toBe("number")
      expect(typeof data.openPositionsUsed).toBe("number")
      expect(typeof data.openPositionsLimit).toBe("number")
      expect(typeof data.favoritesUsed).toBe("number")
      expect(typeof data.favoritesLimit).toBe("number")
      // periodResetAt must be a valid ISO string
      expect(typeof data.periodResetAt).toBe("string")
      expect(isNaN(new Date(data.periodResetAt).getTime())).toBe(false)
    })
  })

  // SUB-02: POST /api/subscription/upgrade
  describe("POST /api/subscription/upgrade (SUB-02)", () => {
    it("SUB-02a: player can upgrade to craque — returns 200 with { data: { success, planId, message } }", async () => {
      const freshPlayer = await signUpAndGetCookie(app, "player")
      const res = await app.inject({
        method: "POST",
        url: "/api/subscription/upgrade",
        headers: { cookie: freshPlayer.sessionCookie },
        payload: { planId: "craque" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data.success).toBe(true)
      expect(body.data.planId).toBe("craque")
      expect(typeof body.data.message).toBe("string")
    })

    it("SUB-02b: team can upgrade to titular — returns 200", async () => {
      const freshTeam = await signUpAndGetCookie(app, "team")
      const res = await app.inject({
        method: "POST",
        url: "/api/subscription/upgrade",
        headers: { cookie: freshTeam.sessionCookie },
        payload: { planId: "titular" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data.success).toBe(true)
      expect(body.data.planId).toBe("titular")
    })

    it("SUB-02c: team can upgrade to campeao — returns 200", async () => {
      const freshTeam = await signUpAndGetCookie(app, "team")
      const res = await app.inject({
        method: "POST",
        url: "/api/subscription/upgrade",
        headers: { cookie: freshTeam.sessionCookie },
        payload: { planId: "campeao" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data.success).toBe(true)
      expect(body.data.planId).toBe("campeao")
    })

    it("SUB-02d: player cannot upgrade to titular (D-18: cross-role plan) — returns 400", async () => {
      const freshPlayer = await signUpAndGetCookie(app, "player")
      const res = await app.inject({
        method: "POST",
        url: "/api/subscription/upgrade",
        headers: { cookie: freshPlayer.sessionCookie },
        payload: { planId: "titular" },
      })
      expect(res.statusCode).toBe(400)
    })

    it("SUB-02e: team cannot upgrade to craque (D-18: cross-role plan) — returns 400", async () => {
      const freshTeam = await signUpAndGetCookie(app, "team")
      const res = await app.inject({
        method: "POST",
        url: "/api/subscription/upgrade",
        headers: { cookie: freshTeam.sessionCookie },
        payload: { planId: "craque" },
      })
      expect(res.statusCode).toBe(400)
    })

    it("SUB-02f: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/subscription/upgrade",
        payload: { planId: "craque" },
      })
      expect(res.statusCode).toBe(401)
    })

    it("SUB-02g: after upgrade to craque, GET /subscription/usage reflects upgraded plan", async () => {
      const freshPlayer = await signUpAndGetCookie(app, "player")

      // Upgrade to craque
      const upgradeRes = await app.inject({
        method: "POST",
        url: "/api/subscription/upgrade",
        headers: { cookie: freshPlayer.sessionCookie },
        payload: { planId: "craque" },
      })
      expect(upgradeRes.statusCode).toBe(200)
      expect(upgradeRes.json().data.planId).toBe("craque")

      // Verify usage reflects the upgraded plan limits
      // craque has unlimited conversations (999_999), so conversationsLimit should be high
      const usageRes = await app.inject({
        method: "GET",
        url: "/api/subscription/usage",
        headers: { cookie: freshPlayer.sessionCookie },
      })
      expect(usageRes.statusCode).toBe(200)
      const usage = usageRes.json().data
      // craque plan has conversations = UNLIMITED (999_999)
      expect(usage.conversationsLimit).toBeGreaterThan(10)
    })
  })
})
