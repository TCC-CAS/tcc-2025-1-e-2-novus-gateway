import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import type { Socket } from "socket.io-client"
import { createTestApp, signUpAndGetCookie } from "../helpers/auth-helpers.js"
import { signUpAndCreateConversation } from "../helpers/messaging-helpers.js"
import { createSocketClient, createAuthenticatedSocket } from "../helpers/socket-helpers.js"

describe("Messaging Socket.io (MSG-03, MSG-04)", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  describe("WebSocket authentication (MSG-03)", () => {
    it("MSG-03a: authenticated socket connects successfully", async () => {
      const { playerCookie } = await signUpAndCreateConversation(app)
      const socket = await createAuthenticatedSocket(app, playerCookie)
      expect(socket.connected).toBe(true)
      socket.disconnect()
    })

    it("MSG-03b: unauthenticated socket is rejected before connection", async () => {
      await expect(createAuthenticatedSocket(app, "")).rejects.toThrow()
    })
  })

  describe("Real-time message delivery (MSG-03)", () => {
    it("MSG-03c: POST message causes recipient socket to receive new_message within 1000ms", async () => {
      const { playerCookie, teamCookie, conversationId } =
        await signUpAndCreateConversation(app)

      const recipientSocket = await createAuthenticatedSocket(app, teamCookie)

      const messagePromise = new Promise<Record<string, unknown>>((resolve) => {
        recipientSocket.on("new_message", (msg) => resolve(msg))
      })

      // HTTP POST triggers socket emit on backend
      await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        payload: { content: "hello from test" },
        headers: { cookie: playerCookie },
      })

      const received = await Promise.race([
        messagePromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 1000)
        ),
      ])

      expect(received).toHaveProperty("id")
      expect(received).toHaveProperty("conversationId", conversationId)
      expect(received).toHaveProperty("content", "hello from test")
      recipientSocket.disconnect()
    })

    it("MSG-03d: new_message payload has id, conversationId, senderId, content, createdAt", async () => {
      const { playerCookie, teamCookie, conversationId } =
        await signUpAndCreateConversation(app)

      const recipientSocket = await createAuthenticatedSocket(app, teamCookie)
      const messagePromise = new Promise<Record<string, unknown>>((resolve) => {
        recipientSocket.on("new_message", resolve)
      })

      await app.inject({
        method: "POST",
        url: `/api/conversations/${conversationId}/messages`,
        payload: { content: "payload test" },
        headers: { cookie: playerCookie },
      })

      const msg = await Promise.race([
        messagePromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ])

      expect(msg).toHaveProperty("id")
      expect(msg).toHaveProperty("conversationId")
      expect(msg).toHaveProperty("senderId")
      expect(msg).toHaveProperty("content")
      expect(msg).toHaveProperty("createdAt")
      recipientSocket.disconnect()
    })
  })

  describe("Typing indicators (MSG-04)", () => {
    it("MSG-04a: typing_start emitted by sender is received by recipient", async () => {
      const { playerCookie, teamCookie, conversationId, playerId } =
        await signUpAndCreateConversation(app)

      const senderSocket = await createAuthenticatedSocket(app, playerCookie)
      const recipientSocket = await createAuthenticatedSocket(app, teamCookie)

      const typingPromise = new Promise<Record<string, unknown>>((resolve) => {
        recipientSocket.on("typing_start", resolve)
      })

      senderSocket.emit("typing_start", { conversationId })

      const event = await Promise.race([
        typingPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ])

      expect(event).toHaveProperty("conversationId", conversationId)
      expect(event).toHaveProperty("userId")
      senderSocket.disconnect()
      recipientSocket.disconnect()
    })

    it("MSG-04b: typing_stop emitted by sender is received by recipient", async () => {
      const { playerCookie, teamCookie, conversationId } =
        await signUpAndCreateConversation(app)

      const senderSocket = await createAuthenticatedSocket(app, playerCookie)
      const recipientSocket = await createAuthenticatedSocket(app, teamCookie)

      const stopPromise = new Promise<Record<string, unknown>>((resolve) => {
        recipientSocket.on("typing_stop", resolve)
      })

      senderSocket.emit("typing_stop", { conversationId })

      const event = await Promise.race([
        stopPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ])

      expect(event).toHaveProperty("conversationId", conversationId)
      expect(event).toHaveProperty("userId")
      senderSocket.disconnect()
      recipientSocket.disconnect()
    })
  })

  describe("Online presence (MSG-04)", () => {
    it("MSG-04c: user_online event received by other participant when user connects", async () => {
      const { playerCookie, teamCookie, playerId } =
        await signUpAndCreateConversation(app)

      // team connects first and listens
      const teamSocket = await createAuthenticatedSocket(app, teamCookie)
      const onlinePromise = new Promise<Record<string, unknown>>((resolve) => {
        teamSocket.on("user_online", (ev) => {
          if (ev.userId === playerId) resolve(ev)
        })
      })

      // player connects after — should trigger user_online to team
      const playerSocket = await createAuthenticatedSocket(app, playerCookie)

      const event = await Promise.race([
        onlinePromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ])

      expect(event).toHaveProperty("userId", playerId)
      playerSocket.disconnect()
      teamSocket.disconnect()
    })

    it("MSG-04d: user_offline event received by other participant when user disconnects", async () => {
      const { playerCookie, teamCookie, playerId } =
        await signUpAndCreateConversation(app)

      const playerSocket = await createAuthenticatedSocket(app, playerCookie)
      const teamSocket = await createAuthenticatedSocket(app, teamCookie)

      const offlinePromise = new Promise<Record<string, unknown>>((resolve) => {
        teamSocket.on("user_offline", (ev) => {
          if (ev.userId === playerId) resolve(ev)
        })
      })

      playerSocket.disconnect()

      const event = await Promise.race([
        offlinePromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000)),
      ])

      expect(event).toHaveProperty("userId", playerId)
      teamSocket.disconnect()
    })
  })
})
