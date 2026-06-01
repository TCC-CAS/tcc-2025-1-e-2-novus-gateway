import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import {
  signUpAndGetCookie,
  upsertPlayerProfile,
  upsertTeamProfile,
} from "../helpers/profile-helpers.js"

describe("Public routes (F2)", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
    const team = await signUpAndGetCookie(app, "team")
    await upsertTeamProfile(app, team.sessionCookie)
    const player = await signUpAndGetCookie(app, "player")
    await upsertPlayerProfile(app, player.sessionCookie)
  })

  afterAll(async () => {
    await app.close()
  })

  describe("GET /api/public/showcase (F2-01)", () => {
    it("F2-01a: returns 200 without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/showcase" })
      expect(res.statusCode).toBe(200)
    })

    it("F2-01b: response has teams and players arrays", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/showcase" })
      const body = res.json()
      expect(body.data).toHaveProperty("teams")
      expect(body.data).toHaveProperty("players")
      expect(Array.isArray(body.data.teams)).toBe(true)
      expect(Array.isArray(body.data.players)).toBe(true)
    })

    it("F2-01c: does not expose userId in showcase response", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/showcase" })
      const body = res.json()
      for (const item of [...body.data.teams, ...body.data.players]) {
        expect(item).not.toHaveProperty("userId")
      }
    })
  })

  describe("GET /api/public/teams (F2-02)", () => {
    it("F2-02a: returns 200 without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/teams" })
      expect(res.statusCode).toBe(200)
    })

    it("F2-02b: returns paginated structure", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/teams?page=1&pageSize=6" })
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("meta")
      expect(body.meta).toHaveProperty("total")
      expect(body.meta.pageSize).toBe(6)
    })
  })

  describe("GET /api/teams/:id — now public (F2-03)", () => {
    it("F2-03a: returns 200 without auth token", async () => {
      const listRes = await app.inject({ method: "GET", url: "/api/public/teams" })
      const teamId = listRes.json().data[0]?.id
      if (!teamId) return

      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamId}`,
      })
      expect(res.statusCode).toBe(200)
    })
  })

  describe("GET /api/players/:id — now public (F2-04)", () => {
    it("F2-04a: returns 200 without auth token", async () => {
      const showcaseRes = await app.inject({ method: "GET", url: "/api/public/showcase" })
      const playerId = showcaseRes.json().data.players[0]?.id
      if (!playerId) return

      const res = await app.inject({
        method: "GET",
        url: `/api/players/${playerId}`,
      })
      expect(res.statusCode).toBe(200)
    })
  })
})
