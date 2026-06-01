import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import {
  signUpAndGetCookie,
  upsertTeamProfile,
  upsertPlayerProfile,
} from "../helpers/profile-helpers.js"

describe("Roster routes (F3b)", () => {
  let app: FastifyInstance
  let teamCookie: string
  let teamId: string
  let playerCookie: string
  let playerId: string

  beforeAll(async () => {
    app = await createTestApp()

    const team = await signUpAndGetCookie(app, "team")
    teamCookie = team.sessionCookie
    await upsertTeamProfile(app, teamCookie)
    const teamMe = await app.inject({ method: "GET", url: "/api/teams/me", headers: { cookie: teamCookie } })
    teamId = teamMe.json().data.id

    const player = await signUpAndGetCookie(app, "player")
    playerCookie = player.sessionCookie
    await upsertPlayerProfile(app, playerCookie)
    const playerMe = await app.inject({ method: "GET", url: "/api/players/me", headers: { cookie: playerCookie } })
    playerId = playerMe.json().data.id
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /api/teams/me/roster", () => {
    it("F3b-01: team can add player to roster", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: teamCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(201)
    })

    it("F3b-02: adding same player twice returns 409", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: teamCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(409)
    })

    it("F3b-03: player cannot add to roster (403)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: playerCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(403)
    })

    it("F3b-04: adding non-existent player returns 404", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: teamCookie },
        payload: { playerId: "does-not-exist" },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe("GET /api/teams/:id/roster", () => {
    it("F3b-05: returns 200 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamId}/roster`,
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data.members)).toBe(true)
    })

    it("F3b-06: added player appears in roster", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamId}/roster`,
      })
      const body = res.json()
      const found = body.data.members.find((m: { id: string }) => m.id === playerId)
      expect(found).toBeDefined()
    })

    it("F3b-07: roster does not expose player userId", async () => {
      const res = await app.inject({ method: "GET", url: `/api/teams/${teamId}/roster` })
      for (const member of res.json().data.members) {
        expect(member).not.toHaveProperty("userId")
      }
    })
  })

  describe("DELETE /api/teams/me/roster/:playerId", () => {
    it("F3b-08: team can remove player from roster", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/teams/me/roster/${playerId}`,
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(204)
    })

    it("F3b-09: after removal, player no longer in roster", async () => {
      const res = await app.inject({ method: "GET", url: `/api/teams/${teamId}/roster` })
      const found = res.json().data.members.find((m: { id: string }) => m.id === playerId)
      expect(found).toBeUndefined()
    })
  })
})
