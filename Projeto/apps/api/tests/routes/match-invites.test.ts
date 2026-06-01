import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import { signUpAndGetCookie, upsertTeamProfile, upsertPlayerProfile } from "../helpers/profile-helpers.js"

describe("Match invites routes", () => {
  let app: FastifyInstance
  let teamCookie: string
  let playerCookie: string
  let createdMatchId: string
  let playerId: string

  beforeAll(async () => {
    app = await createTestApp()

    const team = await signUpAndGetCookie(app, "team")
    teamCookie = team.sessionCookie
    await upsertTeamProfile(app, teamCookie)

    const player = await signUpAndGetCookie(app, "player")
    playerCookie = player.sessionCookie
    await upsertPlayerProfile(app, playerCookie)

    // Resolve the player's DB id for invite creation
    const meRes = await app.inject({ method: "GET", url: "/api/players/me", headers: { cookie: playerCookie } })
    playerId = meRes.json().data.id
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── Match creation ───────────────────────────────────────────────────────

  describe("POST /api/teams/me/matches", () => {
    it("team can create a match", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: teamCookie },
        payload: { matchDate: "2099-01-01" },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.data.status).toBe("scheduled")
      createdMatchId = body.data.id
    })

    it("returns 403 when player tries to create a match", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: playerCookie },
        payload: { matchDate: "2099-01-01" },
      })
      expect(res.statusCode).toBe(403)
    })

    it("returns 401 when unauthenticated", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        payload: { matchDate: "2099-01-01" },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  // ─── Team lists own matches ───────────────────────────────────────────────

  describe("GET /api/teams/me/matches", () => {
    it("team can list own matches", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/teams/me/matches",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBeGreaterThan(0)
      expect(body.meta).toHaveProperty("total")
    })

    it("returns 403 when player tries GET /teams/me/matches", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/teams/me/matches",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ─── Invite a player ─────────────────────────────────────────────────────

  describe("POST /api/teams/me/matches/:matchId/invites", () => {
    it("team can invite a player to a match", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/teams/me/matches/${createdMatchId}/invites`,
        headers: { cookie: teamCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.data.status).toBe("pending")
      expect(body.data.playerId).toBe(playerId)
      expect(body.data.matchId).toBe(createdMatchId)
    })

    it("returns 409 when inviting the same player twice", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/teams/me/matches/${createdMatchId}/invites`,
        headers: { cookie: teamCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(409)
    })

    it("returns 403 when player tries to invite", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/teams/me/matches/${createdMatchId}/invites`,
        headers: { cookie: playerCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ─── List invites for a match ─────────────────────────────────────────────

  describe("GET /api/teams/me/matches/:matchId/invites", () => {
    it("team can list invites for a match", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/me/matches/${createdMatchId}/invites`,
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data.invites)).toBe(true)
      expect(body.data.invites.length).toBeGreaterThan(0)
      expect(body.data.invites[0].status).toBe("pending")
    })

    it("returns 403 when player tries to list match invites", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/me/matches/${createdMatchId}/invites`,
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ─── Player lists own invites ─────────────────────────────────────────────

  describe("GET /api/players/me/invites", () => {
    it("player can list their invites (non-empty after being invited)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/players/me/invites",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBeGreaterThan(0)
      expect(body.data[0].status).toBe("pending")
    })

    it("returns 403 when team tries GET /players/me/invites", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/players/me/invites",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ─── Player accepts/declines an invite ───────────────────────────────────

  describe("PATCH /api/players/me/invites/:inviteId", () => {
    let inviteId: string

    beforeAll(async () => {
      // Fetch the invite id from player's invite list
      const res = await app.inject({
        method: "GET",
        url: "/api/players/me/invites",
        headers: { cookie: playerCookie },
      })
      inviteId = res.json().data[0].id
    })

    it("player can accept an invite", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/players/me/invites/${inviteId}`,
        headers: { cookie: playerCookie },
        payload: { status: "accepted" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data.status).toBe("accepted")
    })

    it("returns 400 when trying to respond to an already-answered invite", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/players/me/invites/${inviteId}`,
        headers: { cookie: playerCookie },
        payload: { status: "declined" },
      })
      expect(res.statusCode).toBe(400)
    })

    it("returns 403 when team tries to respond to a player invite", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/players/me/invites/${inviteId}`,
        headers: { cookie: teamCookie },
        payload: { status: "declined" },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ─── Cancel an invite ─────────────────────────────────────────────────────

  describe("DELETE /api/teams/me/matches/:matchId/invites/:inviteId", () => {
    it("team can cancel a pending invite", async () => {
      // Create a new player to invite so we have a fresh pending invite
      const newPlayer = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, newPlayer.sessionCookie)
      const meRes = await app.inject({ method: "GET", url: "/api/players/me", headers: { cookie: newPlayer.sessionCookie } })
      const newPlayerId = meRes.json().data.id

      const inviteRes = await app.inject({
        method: "POST",
        url: `/api/teams/me/matches/${createdMatchId}/invites`,
        headers: { cookie: teamCookie },
        payload: { playerId: newPlayerId },
      })
      expect(inviteRes.statusCode).toBe(201)
      const newInviteId = inviteRes.json().data.id

      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/api/teams/me/matches/${createdMatchId}/invites/${newInviteId}`,
        headers: { cookie: teamCookie },
      })
      expect(deleteRes.statusCode).toBe(204)
    })
  })
})
