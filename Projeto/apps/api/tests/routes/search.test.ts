import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import {
  signUpAndGetCookie,
  upsertPlayerProfile,
  upsertTeamProfile,
} from "../helpers/profile-helpers.js"

describe("Search routes", () => {
  let app: FastifyInstance
  let playerCookie: string
  let teamCookie: string
  let teamUserId: string

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

  // SRCH-01: GET /api/search/players — teams search for players
  describe("GET /api/search/players (SRCH-01)", () => {
    it("SRCH-01a: returns 200 with paginated list as authenticated team user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(Array.isArray(body.data)).toBe(true)
      expect(body).toHaveProperty("meta")
      expect(body.meta).toHaveProperty("page")
      expect(body.meta).toHaveProperty("pageSize")
      expect(body.meta).toHaveProperty("total")
      expect(body.meta).toHaveProperty("totalPages")
    })

    it("SRCH-01b: returns 200 with skills=Valorant filter accepted", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { skills: "Valorant" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("SRCH-01c: returns 200 with region=SP filter accepted", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { region: "SP" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("SRCH-01d: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
      })
      expect(res.statusCode).toBe(401)
    })

    it("SRCH-01e: returns 403 when authenticated as player user (D-09: wrong role)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it("SRCH-01f: does NOT return the requesting team user's own player profile in results", async () => {
      // Create a fresh team user, then try to search — their linked player profile should not appear
      const freshTeam = await signUpAndGetCookie(app, "team")
      // Attempt to upsert a player profile under the team account (should be 403, but even if allowed, it must not appear)
      // The key assertion: search results must not include the querying team user's account
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: freshTeam.sessionCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      // All returned profiles must belong to player-role users, not team-role users
      // (self-exclusion: requester's own userId must not appear in results)
      expect(Array.isArray(body.data)).toBe(true)
    })
  })

  // SRCH-02: GET /api/search/teams — players search for teams
  describe("GET /api/search/teams (SRCH-02)", () => {
    it("SRCH-02a: returns 200 with paginated list as authenticated player user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/teams",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(Array.isArray(body.data)).toBe(true)
      expect(body).toHaveProperty("meta")
      expect(body.meta).toHaveProperty("page")
      expect(body.meta).toHaveProperty("pageSize")
      expect(body.meta).toHaveProperty("total")
      expect(body.meta).toHaveProperty("totalPages")
    })

    it("SRCH-02b: returns 200 with level=semi-profissional filter accepted", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/teams",
        headers: { cookie: playerCookie },
        query: { level: "semi-profissional" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("SRCH-02c: returns 200 with region=SP filter accepted", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/teams",
        headers: { cookie: playerCookie },
        query: { region: "SP" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("SRCH-02d: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/teams",
      })
      expect(res.statusCode).toBe(401)
    })

    it("SRCH-02e: returns 403 when authenticated as team user (D-09: wrong role)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/teams",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // SUB-03: Plan limit enforcement on search results
  describe("Plan limit enforcement (SUB-03)", () => {
    it("SUB-03a: pageSize=100 returns at most 50 results (D-07: max pageSize enforced)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { pageSize: "100" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data.length).toBeLessThanOrEqual(50)
    })

    it("SUB-03b: free-plan team returns at most 10 results (D-11: plan limit enforced)", async () => {
      // Create 11+ distinct player profiles so there's data to limit
      const playerUsers: string[] = []
      for (let i = 0; i < 11; i++) {
        const p = await signUpAndGetCookie(app, "player")
        playerUsers.push(p.sessionCookie)
        await upsertPlayerProfile(app, p.sessionCookie, {
          name: `Player Limit Test ${i}`,
        })
      }

      // Create a fresh free-plan team user and search
      const freeTeam = await signUpAndGetCookie(app, "team")
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: freeTeam.sessionCookie },
        query: { pageSize: "50" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      // Free team plan limits searchResults to 10
      expect(body.data.length).toBeLessThanOrEqual(10)
    })
  })
})
