import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import { signUpAndGetCookie, upsertTeamProfile } from "../helpers/profile-helpers.js"

describe("Matches routes (F4)", () => {
  let app: FastifyInstance
  let teamACookie: string
  let teamBCookie: string
  let teamAId: string
  let createdMatchId: string

  beforeAll(async () => {
    app = await createTestApp()

    const teamA = await signUpAndGetCookie(app, "team")
    teamACookie = teamA.sessionCookie
    await upsertTeamProfile(app, teamACookie)
    const meA = await app.inject({ method: "GET", url: "/api/teams/me", headers: { cookie: teamACookie } })
    teamAId = meA.json().data.id

    const teamB = await signUpAndGetCookie(app, "team")
    teamBCookie = teamB.sessionCookie
    await upsertTeamProfile(app, teamBCookie)
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /api/teams/me/matches", () => {
    it("F4-01: team can create a match", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: teamACookie },
        payload: {
          matchDate: "2026-08-15",
          opponentName: "Flamengo do Bairro",
          matchTime: "09:00",
          neighborhood: "Centro",
          city: "São Paulo",
        },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.data.status).toBe("scheduled")
      createdMatchId = body.data.id
    })

    it("F4-02: rejects invalid matchDate format", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: teamACookie },
        payload: { matchDate: "15/08/2026" },
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("F4-03: unauthenticated request returns 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        payload: { matchDate: "2026-08-15" },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe("GET /api/teams/:id/matches", () => {
    it("F4-04: returns 200 without auth", async () => {
      const res = await app.inject({ method: "GET", url: `/api/teams/${teamAId}/matches` })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toHaveProperty("total")
    })

    it("F4-05: status=scheduled filter returns only scheduled matches", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamAId}/matches?status=scheduled`,
      })
      const body = res.json()
      for (const match of body.data) {
        expect(match.status).toBe("scheduled")
      }
    })
  })

  describe("PUT /api/teams/me/matches/:matchId", () => {
    it("F4-06: team can update their match", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/teams/me/matches/${createdMatchId}`,
        headers: { cookie: teamACookie },
        payload: { result: "2-1", status: "completed" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data.status).toBe("completed")
      expect(body.data.result).toBe("2-1")
    })

    it("F4-07: team B cannot update team A's match (404)", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/teams/me/matches/${createdMatchId}`,
        headers: { cookie: teamBCookie },
        payload: { result: "3-0" },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe("DELETE /api/teams/me/matches/:matchId", () => {
    it("F4-08: team can soft-cancel their match", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: teamACookie },
        payload: { matchDate: "2026-09-01" },
      })
      const toCancel = createRes.json().data.id

      const res = await app.inject({
        method: "DELETE",
        url: `/api/teams/me/matches/${toCancel}`,
        headers: { cookie: teamACookie },
      })
      expect(res.statusCode).toBe(204)

      const listRes = await app.inject({
        method: "GET",
        url: `/api/teams/${teamAId}/matches`,
      })
      const found = listRes.json().data.find((m: { id: string; status: string }) => m.id === toCancel)
      expect(found?.status).toBe("cancelled")
    })
  })
})
