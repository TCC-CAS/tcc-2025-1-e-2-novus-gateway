import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { eq, ilike, or, and, count } from "drizzle-orm"
import { z } from "zod"
import { requireRole } from "../hooks/require-auth.js"
import { AppError } from "../lib/errors.js"
import { users } from "../db/schema/users.js"
import { auditLogs } from "../db/schema/audit-logs.js"
import {
  ListUsersQuerySchema,
  BanUserRequestSchema,
} from "../../../../apps/web/shared/contracts/users.js"

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /users — list users with filters and pagination (ADM-01, D-12, D-13, D-14)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/users",
    {
      preHandler: [requireRole("admin")],
      schema: { querystring: ListUsersQuerySchema },
    },
    async (request, reply) => {
      const { page, pageSize, status, role, search } = request.query
      const offset = Math.max(0, (page - 1) * pageSize)

      const whereClause = and(
        status !== undefined
          ? eq(users.banned, status === "banned")
          : undefined,
        role ? eq(users.role, role as "player" | "team" | "admin") : undefined,
        search
          ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
          : undefined,
      )

      const [results, [{ value: total }]] = await Promise.all([
        fastify.db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            banned: users.banned,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(whereClause)
          .offset(offset)
          .limit(pageSize),
        fastify.db.select({ value: count() }).from(users).where(whereClause),
      ])

      const data = results.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.banned ? "banned" : "active",
        createdAt: u.createdAt.toISOString(),
      }))

      return reply.send({
        data,
        meta: {
          page,
          pageSize,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / pageSize),
        },
      })
    }
  )

  // GET /users/:id — user detail with audit log (ADM-01, D-10)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/users/:id",
    {
      preHandler: [requireRole("admin")],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const { id } = request.params
      const adminId = request.session!.user.id

      const [user] = await fastify.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          banned: users.banned,
          banReason: users.banReason,
          warnCount: users.warnCount,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, id))

      if (!user) throw new AppError(404, "NOT_FOUND", "User not found")

      // Log detail view per D-10
      await fastify.db.insert(auditLogs).values({
        adminId,
        action: "view_user_detail",
        targetEntityType: "user",
        targetEntityId: id,
        note: null,
      })

      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.banned ? "banned" : "active",
          createdAt: user.createdAt.toISOString(),
        },
      })
    }
  )

  // POST /users/:id/ban — ban user (ADM-02, D-01, D-02, D-03, D-09)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/users/:id/ban",
    {
      preHandler: [requireRole("admin")],
      schema: {
        params: z.object({ id: z.string() }),
        body: BanUserRequestSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { reason } = request.body
      const adminId = request.session!.user.id

      const [user] = await fastify.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, id))
      if (!user) throw new AppError(404, "NOT_FOUND", "User not found")

      // 1. Set banned in DB (D-01) — requireSession in Plan 01 enforces 403 on all subsequent requests (D-02)
      await fastify.db
        .update(users)
        .set({ banned: true, banReason: reason ?? null })
        .where(eq(users.id, id))

      // 2. Invalidate Better Auth sessions (D-01)
      try {
        await (fastify as any).auth?.api?.revokeUserSessions?.({ body: { userId: id } })
      } catch {
        // If Better Auth API method unavailable, sessions will be rejected via banned check in requireSession (D-02)
      }

      // 3. Disconnect active Socket.io connections (D-03)
      if ((fastify as any).io) {
        for (const socket of (fastify as any).io.sockets.sockets.values()) {
          if ((socket as any).data?.userId === id) {
            socket.disconnect(true)
          }
        }
      }

      // 4. Write audit log (D-09)
      await fastify.db.insert(auditLogs).values({
        adminId,
        action: "ban_user",
        targetEntityType: "user",
        targetEntityId: id,
        note: reason ?? null,
      })

      return reply.send({ data: { id, status: "banned" } })
    }
  )

  // POST /users/:id/unban — unban user (ADM-02, D-04, D-09)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/users/:id/unban",
    {
      preHandler: [requireRole("admin")],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const { id } = request.params
      const adminId = request.session!.user.id

      const [user] = await fastify.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, id))
      if (!user) throw new AppError(404, "NOT_FOUND", "User not found")

      await fastify.db
        .update(users)
        .set({ banned: false, banReason: null })
        .where(eq(users.id, id))

      await fastify.db.insert(auditLogs).values({
        adminId,
        action: "unban_user",
        targetEntityType: "user",
        targetEntityId: id,
        note: null,
      })

      return reply.send({ data: { id, status: "active" } })
    }
  )
}

export default adminRoutes
