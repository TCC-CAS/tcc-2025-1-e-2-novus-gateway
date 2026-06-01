import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import { signUpAndGetCookie } from "../helpers/profile-helpers.js"

describe("Messaging routes", () => {
  let app: FastifyInstance
  let playerCookie: string
  let player2Cookie: string
  let playerId: string
  let player2Id: string

  beforeAll(async () => {
    app = await createTestApp()

    const p1 = await signUpAndGetCookie(app, "player")
    playerCookie = p1.sessionCookie

    const p2 = await signUpAndGetCookie(app, "player")
    player2Cookie = p2.sessionCookie

    // Resolve user IDs via /api/me
    const me1 = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: playerCookie } })
    playerId = me1.json().data.id

    const me2 = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: player2Cookie } })
    player2Id = me2.json().data.id
  })

  afterAll(async () => {
    await app.close()
  })

  // MSG-01: POST /api/conversations
  describe("POST /api/conversations (MSG-01)", () => {
    it("MSG-01a: returns 201 when creating a new conversation", async () => {
      const p = await signUpAndGetCookie(app, "player")
      const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: p.sessionCookie } })
      const otherMe = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: player2Cookie } })
      const res = await app.inject({
        method: "POST",
        url: "/api/conversations",
        headers: { cookie: p.sessionCookie },
        payload: { participantId: otherMe.json().data.id },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body.data).toHaveProperty("id")
    })

    it("MSG-01b: returns 200 (idempotent) when conversation already exists", async () => {
      // Create conversation
      const res1 = await app.inject({
        method: "POST",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
        payload: { participantId: player2Id },
      })
      expect([200, 201]).toContain(res1.statusCode)

      // Same conversation again — must return 200
      const res2 = await app.inject({
        method: "POST",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
        payload: { participantId: player2Id },
      })
      expect(res2.statusCode).toBe(200)
      expect(res2.json().data.id).toBe(res1.json().data.id)
    })

    it("MSG-01c: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/conversations",
        payload: { participantId: player2Id },
      })
      expect(res.statusCode).toBe(401)
    })

    it("MSG-01d: response data contains conversation shape fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
        payload: { participantId: player2Id },
      })
      expect([200, 201]).toContain(res.statusCode)
      const data = res.json().data
      expect(typeof data.id).toBe("string")
      expect(typeof data.participantA).toBe("string")
      expect(typeof data.participantB).toBe("string")
    })
  })

  // MSG-01: GET /api/conversations
  describe("GET /api/conversations (MSG-01)", () => {
    it("MSG-01e: returns 200 with data array", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("MSG-01f: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/conversations",
      })
      expect(res.statusCode).toBe(401)
    })

    it("MSG-01g: conversation list items have otherParticipant and unreadCount", async () => {
      // Ensure there is at least one conversation
      await app.inject({
        method: "POST",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
        payload: { participantId: player2Id },
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const data = res.json().data
      expect(data.length).toBeGreaterThan(0)
      const first = data[0]
      expect(first).toHaveProperty("id")
      expect(first).toHaveProperty("otherParticipant")
      expect(typeof first.otherParticipant.id).toBe("string")
      expect(typeof first.otherParticipant.name).toBe("string")
      expect(typeof first.unreadCount).toBe("number")
    })
  })

  // MSG-02: GET /api/conversations/:id/messages
  describe("GET /api/conversations/:id/messages (MSG-02)", () => {
    let conversationId: string

    beforeAll(async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
        payload: { participantId: player2Id },
      })
      conversationId = res.json().data.id
    })

    it("MSG-02a: returns 200 with data array for participant", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/conversations/${conversationId}/messages`,
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json().data)).toBe(true)
    })

    it("MSG-02b: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/conversations/${conversationId}/messages`,
      })
      expect(res.statusCode).toBe(401)
    })

    it("MSG-02c: returns 404 for non-existent conversation", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/conversations/nonexistent-id/messages",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(404)
    })

    it("MSG-02d: messages have correct shape after sending", async () => {
      // Send a message first
      await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        headers: { cookie: playerCookie },
        payload: { content: "Hello from MSG-02d" },
      })

      const res = await app.inject({
        method: "GET",
        url: `/api/conversations/${conversationId}/messages`,
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const msgs = res.json().data
      expect(msgs.length).toBeGreaterThan(0)
      const m = msgs[0]
      expect(typeof m.id).toBe("string")
      expect(typeof m.conversationId).toBe("string")
      expect(typeof m.senderId).toBe("string")
      expect(typeof m.content).toBe("string")
      expect(typeof m.createdAt).toBe("string")
    })
  })

  // MSG-02: POST /api/conversations/:id/messages
  describe("POST /api/conversations/:id/messages (MSG-02)", () => {
    let conversationId: string

    beforeAll(async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/conversations",
        headers: { cookie: playerCookie },
        payload: { participantId: player2Id },
      })
      conversationId = res.json().data.id
    })

    it("MSG-02e: returns 201 with message data when sending a message", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        headers: { cookie: playerCookie },
        payload: { content: "Hello!" },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(typeof body.data.id).toBe("string")
      expect(body.data.content).toBe("Hello!")
      expect(body.data.senderId).toBe(playerId)
    })

    it("MSG-02f: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        payload: { content: "Hello!" },
      })
      expect(res.statusCode).toBe(401)
    })

    it("MSG-02g: returns 404 for non-existent conversation", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/conversations/nonexistent-id/messages",
        headers: { cookie: playerCookie },
        payload: { content: "Hello!" },
      })
      expect(res.statusCode).toBe(404)
    })

    it("MSG-02h: returns 400 for empty content", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        headers: { cookie: playerCookie },
        payload: { content: "" },
      })
      expect(res.statusCode).toBe(400)
    })

    it("MSG-02i: both participants can send messages in the same conversation", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        headers: { cookie: player2Cookie },
        payload: { content: "Reply from player2" },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().data.senderId).toBe(player2Id)
    })

    it("MSG-02j: non-participant cannot send messages — returns 404", async () => {
      const outsider = await signUpAndGetCookie(app, "player")
      const res = await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        headers: { cookie: outsider.sessionCookie },
        payload: { content: "Intruder!" },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
