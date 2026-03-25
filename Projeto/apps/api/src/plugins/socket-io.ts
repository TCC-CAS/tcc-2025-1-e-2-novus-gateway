import fp from "fastify-plugin"
import type { FastifyPluginAsync } from "fastify"
import fastifySocketIO, { type FastifySocketioOptions } from "fastify-socket.io"
import { eq, or } from "drizzle-orm"
import type { Server, Socket } from "socket.io"
import { conversations } from "../db/schema/conversations.js"
import { auth } from "../lib/auth.js"

// Augment FastifyInstance so fastify.io is typed
declare module "fastify" {
  interface FastifyInstance {
    io: Server
  }
}

/**
 * Socket.io plugin — auth middleware, room joins, typing relay, and presence events.
 * Must be registered BEFORE route plugins so fastify.io is decorated before routes use it.
 */
const socketIOPlugin: FastifyPluginAsync = async (fastify) => {
  const socketOpts: FastifySocketioOptions = {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await fastify.register(fastifySocketIO as any, socketOpts)

  // io.use() — authentication middleware
  // Runs for EVERY connection before "connection" event fires
  // Rejects unauthenticated connections (MSG-03b, SC-5)
  fastify.io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie
      if (!cookieHeader) {
        return next(new Error("No session cookie"))
      }

      const session = await auth.api.getSession({
        headers: new Headers({ cookie: cookieHeader }),
      })

      if (!session?.user) {
        return next(new Error("Invalid session"))
      }

      socket.data.userId = session.user.id
      socket.data.role = (session.user as Record<string, unknown>).role
      next()
    } catch {
      next(new Error("Authentication failed"))
    }
  })

  // connection handler — runs after io.use() approves the connection
  fastify.io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as string

    // Join user's personal presence room (D-04)
    await socket.join(`user:${userId}`)

    // Join all conversation rooms this user belongs to (D-04, anti-pitfall-5)
    const userConversations = await fastify.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.participantA, userId),
          eq(conversations.participantB, userId)
        )
      )

    for (const { id } of userConversations) {
      await socket.join(id)
    }

    // Signal client that all rooms are joined — client waits for this before emitting events
    socket.emit("rooms_joined")

    // Emit user_online to all OTHER participants in user's conversation rooms (MSG-04c)
    for (const { id } of userConversations) {
      socket.to(id).emit("user_online", { userId })
    }

    // typing_start relay — send to all others in the room (MSG-04a)
    socket.on("typing_start", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("typing_start", { conversationId, userId })
    })

    // typing_stop relay — send to all others in the room (MSG-04b)
    socket.on("typing_stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("typing_stop", { conversationId, userId })
    })

    // disconnect — emit user_offline to all participants (MSG-04d)
    socket.on("disconnect", () => {
      for (const { id } of userConversations) {
        socket.to(id).emit("user_offline", { userId })
      }
    })
  })
}

export default fp(socketIOPlugin, { name: "socket-io" })
