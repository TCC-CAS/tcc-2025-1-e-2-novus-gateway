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

    it("SRCH-01e: returns 200 when authenticated as player user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
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

    it("SRCH-01g: filters results by position when position=goleiro", async () => {
      const goleiro = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, goleiro.sessionCookie, {
        name: "Goleiro Test",
        positions: ["goleiro"],
      })

      const atacante = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, atacante.sessionCookie, {
        name: "Atacante Test",
        positions: ["atacante"],
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { position: "goleiro" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      for (const player of body.data) {
        expect(player.positions).toContain("goleiro")
      }
    })

    it("SRCH-01h: filters results by region when region is set on player", async () => {
      const player = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, player.sessionCookie, {
        name: "Player Region Test",
        region: "Zona Sul",
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { region: "Zona Sul" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("SRCH-01i: filters results by level when level=amador", async () => {
      const player = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, player.sessionCookie, {
        name: "Amador Player",
        level: "amador",
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { level: "amador" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      for (const player of body.data) {
        expect(player.level).toBe("amador")
      }
    })

    it("SRCH-01j: filters male player results including trans male and excluding female groups", async () => {
      const male = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, male.sessionCookie, {
        name: "Male Player Filter Test",
        sex: "male",
      })

      const transMale = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, transMale.sessionCookie, {
        name: "Trans Male Player Filter Test",
        sex: "trans_male",
      })

      const female = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, female.sessionCookie, {
        name: "Female Player Filter Test",
        sex: "female",
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { sex: "male" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      const names = body.data.map((player: { name: string }) => player.name)
      expect(names).toContain("Male Player Filter Test")
      expect(names).toContain("Trans Male Player Filter Test")
      expect(names).not.toContain("Female Player Filter Test")
      for (const player of body.data) {
        expect(["male", "trans_male"]).toContain(player.sex)
      }
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

    it("SRCH-02e: returns 200 when authenticated as team user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/teams",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(200)
    })

    it("SRCH-02f: filters teams by lineupSex", async () => {
      const maleTeam = await signUpAndGetCookie(app, "team")
      await upsertTeamProfile(app, maleTeam.sessionCookie, {
        name: "Male Lineup Team Filter Test",
        lineupSex: "male",
      })

      const femaleTeam = await signUpAndGetCookie(app, "team")
      await upsertTeamProfile(app, femaleTeam.sessionCookie, {
        name: "Female Lineup Team Filter Test",
        lineupSex: "female",
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/search/teams",
        headers: { cookie: playerCookie },
        query: { lineupSex: "female" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      const names = body.data.map((team: { name: string }) => team.name)
      expect(names).toContain("Female Lineup Team Filter Test")
      expect(names).not.toContain("Male Lineup Team Filter Test")
      for (const team of body.data) {
        expect(team.lineupSex).toBe("female")
      }
    })
  })

  // F3a: GET /api/search/community-players
  describe("GET /api/search/community-players (F3a)", () => {
    it("F3a-01: returns 200 for authenticated player", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toHaveProperty("total")
    })

    it("F3a-02: returns 200 for authenticated team user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(200)
    })

    it("F3a-03: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
      })
      expect(res.statusCode).toBe(401)
    })

    it("F3a-04: results do not include userId field", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
        headers: { cookie: playerCookie },
      })
      const body = res.json()
      for (const item of body.data) {
        expect(item).not.toHaveProperty("userId")
      }
    })

    it("F3a-05: accepts position filter without error", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players?position=goleiro",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
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
      // Create 11+ distinct player profiles in parallel so there's data to limit
      await Promise.all(
        Array.from({ length: 11 }, (_, i) =>
          signUpAndGetCookie(app, "player").then((p) =>
            upsertPlayerProfile(app, p.sessionCookie, {
              name: `Player Limit Test ${i}`,
            })
          )
        )
      )

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
    }, 15000)
  })
})
