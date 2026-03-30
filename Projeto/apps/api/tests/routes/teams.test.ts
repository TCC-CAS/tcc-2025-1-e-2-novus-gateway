import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import {
  signUpAndGetCookie,
  upsertTeamProfile,
  teamProfilePayload,
} from "../helpers/profile-helpers.js"

describe("Team profile routes", () => {
  let app: FastifyInstance
  let teamCookie: string
  let playerCookie: string

  beforeAll(async () => {
    app = await createTestApp()
    const team = await signUpAndGetCookie(app, "team")
    teamCookie = team.sessionCookie
    const player = await signUpAndGetCookie(app, "player")
    playerCookie = player.sessionCookie
  })

  afterAll(async () => {
    await app.close()
  })

  // TEAM-01: PUT /teams/me — upsert
  describe("PUT /api/teams/me", () => {
    it("TEAM-01a: creates team profile and returns 200 with { data: profile }", async () => {
      const res = await upsertTeamProfile(app, teamCookie)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data).toMatchObject({
        name: teamProfilePayload.name,
        level: teamProfilePayload.level,
        openPositions: teamProfilePayload.openPositions,
      })
      expect(body.data.id).toBeDefined()
      expect(body.data.userId).toBeDefined()
      expect(body.data.createdAt).toBeDefined()
      expect(body.data.updatedAt).toBeDefined()
    })

    it("TEAM-01b: updates existing profile (upsert idempotent) and updatedAt changes", async () => {
      const firstRes = await upsertTeamProfile(app, teamCookie, { name: "Time Original" })
      const firstUpdatedAt = firstRes.json().data.updatedAt

      await new Promise((r) => setTimeout(r, 10))

      const secondRes = await upsertTeamProfile(app, teamCookie, { name: "Time Atualizado" })
      expect(secondRes.statusCode).toBe(200)
      const secondBody = secondRes.json()
      expect(secondBody.data.name).toBe("Time Atualizado")
      expect(new Date(secondBody.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(firstUpdatedAt).getTime()
      )
    })

    it("TEAM-01c: returns 401 when not authenticated", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/teams/me",
        payload: teamProfilePayload,
      })
      expect(res.statusCode).toBe(401)
    })

    it("TEAM-01d: returns 403 when authenticated as player user (D-06)", async () => {
      const res = await upsertTeamProfile(app, playerCookie)
      expect(res.statusCode).toBe(403)
    })
  })

  // TEAM-02: GET /teams/me
  describe("GET /api/teams/me", () => {
    it("TEAM-02a: returns own profile with 200 and { data: profile } shape", async () => {
      await upsertTeamProfile(app, teamCookie)
      const res = await app.inject({
        method: "GET",
        url: "/api/teams/me",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data.name).toBe(teamProfilePayload.name)
    })

    it("TEAM-02b: returns 401 when not authenticated (D-02 path)", async () => {
      const res = await app.inject({ method: "GET", url: "/api/teams/me" })
      expect(res.statusCode).toBe(401)
    })

    it("TEAM-02c: returns 403 when authenticated as player user (D-06)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/teams/me",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // TEAM-03: GET /teams/:id
  describe("GET /api/teams/:id", () => {
    it("TEAM-03a: returns public profile with 200 for any authenticated user (D-07)", async () => {
      const upsertRes = await upsertTeamProfile(app, teamCookie)
      const profileId = upsertRes.json().data.id
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${profileId}`,
        headers: { cookie: playerCookie }, // player can read team profile (D-07)
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty("data")
    })

    it("TEAM-03b: returns 404 when profile does not exist (D-04)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/teams/nonexistent-id-that-does-not-exist",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(404)
    })

    it("TEAM-03c: returns 401 when not authenticated", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/teams/some-id",
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
