import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { and, eq, or, desc, sql, isNull, ne } from "drizzle-orm"
import { nanoid } from "nanoid"
import { conversations } from "../db/schema/conversations.js"
import { messages } from "../db/schema/messages.js"
import { users } from "../db/schema/users.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { requireSession } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { AppError } from "../lib/errors.js"
import {
  getPlanLimits,
} from "../../../../apps/web/shared/contracts/subscription.js"

const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /conversations — start or retrieve existing conversation (MSG-01, D-09, D-10)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/conversations",
    {
      preHandler: [requireSession],
      schema: { body: z.object({ participantId: z.string() }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = (request.session!.user as Record<string, unknown>).role as "player" | "team"
      const { participantId } = request.body

      // Look up user's subscription plan (auto-create free if missing)
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const [sub] = await fastify.db
        .insert(subscriptions)
        .values({
          id: nanoid(),
          userId,
          planId: "free",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: { updatedAt: now },
        })
        .returning()

      const limits = getPlanLimits(sub.planId, role)

      // Count existing conversations for this user
      const [countRow] = await fastify.db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(
          or(
            eq(conversations.participantA, userId),
            eq(conversations.participantB, userId)
          )
        )

      const existingCount = countRow?.count ?? 0
      if (existingCount >= limits.conversations) {
        throw new AppError(403, "CONVERSATION_LIMIT_REACHED", "Conversation limit reached for your plan")
      }

      // Normalize participant order for unique constraint (D-04)
      const [pA, pB] = [userId, participantId].sort()

      // Check if conversation already exists (for 200 vs 201 detection)
      const [existing] = await fastify.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.participantA, pA),
            eq(conversations.participantB, pB)
          )
        )

      if (existing) {
        return reply.code(200).send(ok(existing))
      }

      // Upsert — atomic idempotent create (D-10)
      const [conversation] = await fastify.db
        .insert(conversations)
        .values({
          id: nanoid(),
          participantA: pA,
          participantB: pB,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [conversations.participantA, conversations.participantB],
          set: { updatedAt: new Date() },
        })
        .returning()

      return reply.code(201).send(ok(conversation))
    }
  )

  // GET /conversations — list all conversations for user (MSG-01, D-14)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/conversations",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id

      const rows = await fastify.db
        .select({
          id: conversations.id,
          participantA: conversations.participantA,
          participantB: conversations.participantB,
          updatedAt: conversations.updatedAt,
          createdAt: conversations.createdAt,
        })
        .from(conversations)
        .where(
          or(
            eq(conversations.participantA, userId),
            eq(conversations.participantB, userId)
          )
        )
        .orderBy(desc(conversations.updatedAt))

      // Enrich each conversation with participant info, unreadCount, lastMessage
      const summaries = await Promise.all(
        rows.map(async (row) => {
          const participantId = row.participantA === userId ? row.participantB : row.participantA

          // Fetch other participant user record
          const [participant] = await fastify.db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, participantId))

          // Count unread messages (sent by the other participant, not yet read)
          const [unreadRow] = await fastify.db
            .select({ count: sql<number>`count(*)::int` })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, row.id),
                ne(messages.senderId, userId),
                isNull(messages.readAt)
              )
            )

          // Fetch last message
          const [lastMsg] = await fastify.db
            .select({
              content: messages.content,
              createdAt: messages.createdAt,
              senderId: messages.senderId,
            })
            .from(messages)
            .where(eq(messages.conversationId, row.id))
            .orderBy(desc(messages.id))
            .limit(1)

          return {
            id: row.id,
            otherParticipant: {
              id: participant?.id ?? participantId,
              name: participant?.name ?? "Unknown",
            },
            lastMessage: lastMsg
              ? {
                  content: lastMsg.content,
                  createdAt: lastMsg.createdAt.toISOString(),
                  senderId: lastMsg.senderId,
                }
              : undefined,
            unreadCount: unreadRow?.count ?? 0,
          }
        })
      )

      return reply.send({
        data: summaries,
        meta: {
          page: 1,
          pageSize: summaries.length,
          total: summaries.length,
          totalPages: 1,
        },
      })
    }
  )

  // GET /conversations/:id/messages — fetch messages, auto-mark as read (MSG-02, D-12, D-13, D-15)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/conversations/:id/messages",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { id } = request.params

      // Verify conversation exists and user is a participant
      const [conversation] = await fastify.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, id),
            or(
              eq(conversations.participantA, userId),
              eq(conversations.participantB, userId)
            )
          )
        )

      if (!conversation) {
        throw new AppError(404, "NOT_FOUND", "Conversation not found")
      }

      // Auto-mark messages from other participant as read (D-15)
      await fastify.db
        .update(messages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(messages.conversationId, id),
            ne(messages.senderId, userId),
            isNull(messages.readAt)
          )
        )

      // Fetch all messages ordered ASC
      const msgs = await fastify.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.id)

      const formatted = msgs.map((m) => ({
        id: String(m.id),
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt ? m.readAt.toISOString() : undefined,
      }))

      return reply.send({
        data: formatted,
        meta: {
          page: 1,
          pageSize: formatted.length,
          total: formatted.length,
          totalPages: 1,
        },
      })
    }
  )

  // POST /conversations/:id/messages — send a message (MSG-02, D-05)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/conversations/:id/messages",
    {
      preHandler: [requireSession],
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ content: z.string().min(1).max(2000) }),
      },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { id } = request.params
      const { content } = request.body

      // Verify conversation exists and user is a participant
      const [conversation] = await fastify.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, id),
            or(
              eq(conversations.participantA, userId),
              eq(conversations.participantB, userId)
            )
          )
        )

      if (!conversation) {
        throw new AppError(404, "NOT_FOUND", "Conversation not found")
      }

      // Insert message — id is bigserial, do NOT provide id value
      const [message] = await fastify.db
        .insert(messages)
        .values({
          conversationId: id,
          senderId: userId,
          content,
          createdAt: new Date(),
        })
        .returning()

      const formatted = {
        id: String(message.id),
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt ? message.readAt.toISOString() : undefined,
      }

      // Emit Socket.io event AFTER DB save (D-05 — HTTP source of truth)
      // fastify.io is decorated by the socket-io plugin (Plan 03); guard for when not yet registered
      if ((fastify as any).io) {
        (fastify as any).io.to(id).emit("new_message", formatted)
      }

      return reply.code(201).send(ok(formatted))
    }
  )
}

export default conversationRoutes
