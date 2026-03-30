import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import {
  signUpAndGetCookie,
  upsertPlayerProfile,
  playerProfilePayload,
} from "../helpers/profile-helpers.js"

describe("Player profile routes", () => {
  let app: FastifyInstance
  let playerCookie: string
  let teamCookie: string
  let playerId: string

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

  // PLAY-01: PUT /players/me — upsert
  describe("PUT /api/players/me", () => {
    it("PLAY-01a: creates player profile and returns 200 with { data: profile }", async () => {
      const res = await upsertPlayerProfile(app, playerCookie)
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data).toMatchObject({
        name: playerProfilePayload.name,
        positions: playerProfilePayload.positions,
        skills: playerProfilePayload.skills,
      })
      expect(body.data.id).toBeDefined()
      expect(body.data.userId).toBeDefined()
      expect(body.data.createdAt).toBeDefined()
      expect(body.data.updatedAt).toBeDefined()
      playerId = body.data.id
    })

    it("PLAY-01b: updates existing profile (upsert idempotent) and updatedAt changes", async () => {
      const firstRes = await upsertPlayerProfile(app, playerCookie, { name: "João Original" })
      const firstBody = firstRes.json()
      const firstUpdatedAt = firstBody.data.updatedAt

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10))

      const secondRes = await upsertPlayerProfile(app, playerCookie, { name: "João Atualizado" })
      expect(secondRes.statusCode).toBe(200)
      const secondBody = secondRes.json()
      expect(secondBody.data.name).toBe("João Atualizado")
      // updatedAt must be newer or equal (D-09: explicitly set on update)
      expect(new Date(secondBody.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(firstUpdatedAt).getTime()
      )
    })

    it("PLAY-01c: returns 401 when not authenticated", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/api/players/me",
        payload: playerProfilePayload,
      })
      expect(res.statusCode).toBe(401)
    })

    it("PLAY-01d: returns 403 when authenticated as team user (D-05)", async () => {
      const res = await upsertPlayerProfile(app, teamCookie)
      expect(res.statusCode).toBe(403)
    })
  })

  // PLAY-02: GET /players/me
  describe("GET /api/players/me", () => {
    it("PLAY-02a: returns own profile with 200 and { data: profile } shape", async () => {
      // ensure profile exists first
      await upsertPlayerProfile(app, playerCookie)
      const res = await app.inject({
        method: "GET",
        url: "/api/players/me",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data.name).toBe(playerProfilePayload.name)
    })

    it("PLAY-02b: returns 401 when not authenticated (D-01 path)", async () => {
      const res = await app.inject({ method: "GET", url: "/api/players/me" })
      expect(res.statusCode).toBe(401)
    })

    it("PLAY-02c: returns 403 when authenticated as team user (D-05)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/players/me",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // PLAY-03: GET /players/:id
  describe("GET /api/players/:id", () => {
    it("PLAY-03a: returns public profile with 200 for any authenticated user (D-07)", async () => {
      // ensure profile exists and capture id
      const upsertRes = await upsertPlayerProfile(app, playerCookie)
      const profileId = upsertRes.json().data.id
      const res = await app.inject({
        method: "GET",
        url: `/api/players/${profileId}`,
        headers: { cookie: teamCookie }, // team user can read player profile (D-07)
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty("data")
    })

    it("PLAY-03b: returns 404 when profile does not exist (D-03)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/players/nonexistent-id-that-does-not-exist",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(404)
    })

    it("PLAY-03c: returns 401 when not authenticated", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/players/some-id",
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
