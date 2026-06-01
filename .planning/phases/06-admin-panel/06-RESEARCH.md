# Phase 6: Admin Panel - Research

**Researched:** 2026-03-26
**Domain:** Backend admin API endpoints, user management, moderation, and audit logging
**Confidence:** HIGH

## Summary

Phase 6 implements admin-only backend endpoints for user management and content moderation. All infrastructure is in place: the database schema supports `banned` status, `auditLogs` table, and `moderationReports` table. The `requireRole("admin")` hook exists and is tested. Shared contracts define all request/response shapes. The only required changes are: (1) add optional `warnCount` field to users schema, (2) create `admin.ts` route file with 4 endpoints and associated logic, and (3) integrate Socket.io disconnect on ban.

**Primary recommendation:** Implement admin routes following established Drizzle + Fastify patterns. Reuse `requireRole("admin")`, error factory, and pagination from existing phases. Add ban enforcement logic that checks user status in `requireSession` hook.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Banning sets user status to `banned` in DB AND invalidates all active Better Auth sessions immediately.
- **D-02:** `requireAuth` checks user status on every authenticated request — banned users get `403` even with valid token.
- **D-03:** Banning force-disconnects the user's active WebSocket (Socket.io) connections.
- **D-04:** Unban capability included via `POST /admin/users/:id/unban`.
- **D-05:** `dismiss` sets report status to `dismissed`; entity untouched.
- **D-06:** `remove` soft-deletes reported entity (marked hidden/removed in DB).
- **D-07:** `warn` records in audit_logs and increments warning count on user record.
- **D-08–D-10:** All moderation actions (dismiss, remove, warn) + ban/unban + detail view are logged to `audit_logs`.
- **D-12–D-14:** `GET /admin/users` supports filtering by status, role, and text search.

### Claude's Discretion
- D-11: Additional audit log entries beyond explicitly listed ones.
- D-15: Filter implementation details beyond status, role, and search.
- Internal helpers, query optimization, and code organization.

### Deferred Ideas (OUT OF SCOPE)
- Automatic escalation logic (N warnings triggers ban) — future phase.
- Email notifications for warnings.
- Report creation endpoint.
- Unban notification to user.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-01 | Admin can list all users and view individual user detail (`GET /admin/users`, `GET /admin/users/:id`) | Contracts defined: `ListUsersQuerySchema`, `ListUsersResponseSchema`, `UserDetailSchema`. Route pattern established in players/teams/search routes. `requireRole("admin")` tested. |
| ADM-02 | Admin can ban a user account (`POST /admin/users/:id/ban`) | Users schema has `banned`, `banReason`, `banExpires` fields. Requires: (1) status enforcement in `requireSession`, (2) Better Auth session invalidation, (3) Socket.io disconnect. |
| ADM-03 | Admin can view content moderation reports (`GET /admin/moderation/reports`) | `moderationReports` table exists. Contracts: `ListReportsQuerySchema`, `ListReportsResponseSchema`, `ReportSummarySchema`. Pagination pattern from Phase 4. |
| ADM-04 | Admin can take action on moderation reports — dismiss or remove (`POST /admin/moderation/reports/:id`) | `ModerateReportRequestSchema` defined. Requires audit logging and conditional entity hiding (soft delete). |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.x | HTTP server framework | Non-negotiable per CLAUDE.md; established in Phase 1 |
| Drizzle ORM | 0.36+ | Database queries | Pure TypeScript, no codegen, SQL-transparent; established pattern |
| Zod | 4.3+ | Input validation | Reuses frontend contracts via `fastify-type-provider-zod` |
| Better Auth | 1.5.6+ | Session management | Built-in RBAC, session invalidation; established in Phase 2 |
| Socket.io | 4.8.3+ | Real-time WebSocket | Room management; force-disconnect on ban |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | Latest | ID generation | Generate audit log IDs (consistent with Phase 1–5) |
| drizzle-orm/pg-core | 0.36+ | PostgreSQL dialect | All queries against `users`, `audit_logs`, `moderation_reports` |

## Architecture Patterns

### Recommended Project Structure
```
src/routes/admin.ts          # New: admin-only endpoints
src/hooks/require-auth.ts    # Existing: requires status check on banned users
src/db/schema/users.ts       # Modify: add warnCount field
src/plugins/socket-io.ts     # Modify: disconnect socket on ban
```

### Pattern 1: Admin Route Registration
**What:** Fastify plugin using `requireRole("admin")` preHandler and `fastify-type-provider-zod` for validation.
**When to use:** All `/admin/*` endpoints — ensures only admin role can access, input validated against Zod contract.
**Example:**
```typescript
// Source: Projeto/apps/api/src/routes/players.ts (reference implementation)
const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/users",
    {
      preHandler: [requireRole("admin")],
      schema: { querystring: ListUsersQuerySchema }
    },
    async (request, reply) => {
      // Implementation
      return ok({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    }
  )
}
export default adminRoutes
```

### Pattern 2: Audit Logging
**What:** Insert row into `audit_logs` table with admin ID, action type, target entity, and optional note.
**When to use:** All moderation actions (ban, unban, dismiss, remove, warn) and detail view access.
**Example:**
```typescript
// Source: Projeto/apps/api/src/db/schema/audit-logs.ts
await fastify.db.insert(auditLogs).values({
  adminId: request.session!.user.id,
  action: "ban_user",
  targetEntityType: "user",
  targetEntityId: userId,
  note: banReason || null,
  createdAt: new Date(),
})
```

### Pattern 3: Ban Enforcement
**What:** Check user.banned status in `requireSession` hook; return 403 if banned.
**When to use:** Before allowing any authenticated request to proceed.
**Example:**
```typescript
// Modify: Projeto/apps/api/src/hooks/require-auth.ts
if (session.user.banned) {
  return reply.status(403).send({
    error: { code: "FORBIDDEN", message: "Account is banned" },
  })
}
```

### Pattern 4: Socket.io Disconnect on Ban
**What:** Find socket by userId and call `socket.disconnect()` to force WebSocket close.
**When to use:** During ban operation to ensure real-time chat is immediately severed.
**Example:**
```typescript
// Modify: Projeto/apps/api/src/plugins/socket-io.ts or admin.ts ban handler
for (const socket of fastify.io.sockets.sockets.values()) {
  if (socket.data.userId === userId) {
    socket.disconnect(true)
  }
}
```

### Pattern 5: Soft Delete (Entity Removal)
**What:** Mark entity as `hidden: true` or `removed: true` in database; exclude from public queries.
**When to use:** `remove` moderation action to preserve audit trail while hiding from users.
**Example:**
```typescript
// For player profiles:
await fastify.db.update(players).set({ hidden: true }).where(eq(players.id, entityId))

// For messages:
await fastify.db.update(messages).set({ deleted: true }).where(eq(messages.id, entityId))
```

### Anti-Patterns to Avoid
- **Hard deleting reported entities:** Loses audit trail and prevents future investigation. Always soft-delete.
- **Logging bans without invalidating sessions:** Admin can ban but user stays logged in. Must invalidate Better Auth sessions immediately.
- **Checking role in route handler instead of preHandler:** Move role check to `requireRole` hook for consistent 403 response.
- **Forgetting to disconnect Socket.io on ban:** User remains connected, can still send real-time messages. Use `socket.disconnect(true)` to force.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User authentication & role checking | Custom JWT verification | `requireSession` + `requireRole` hooks — reuse Pattern 3 | Better Auth handles session lifecycle, RBAC is tested, preHandler guarantees 401/403 before handler runs |
| Input validation | Manual property checking | `fastify-type-provider-zod` with contract schemas | Schema reuse with frontend; consistent error messages; Zod provides detailed validation errors |
| Error responses | Manual HTTP status + message | `AppError` class + error handler in `src/lib/errors.ts` | Consistent error format across all endpoints; centralizes error handling |
| Pagination | Manual offset/limit calculation | Drizzle query with `offset()` + `limit()` + `.count()` for total | Prevents off-by-one errors; meta calculation formula is standard |
| Soft deletes | Custom `deleted_at` timestamp field | Boolean column (e.g., `hidden: boolean`, `deleted: boolean`) OR status enum | Query filters are simpler; no need for timestamp comparisons |
| Session invalidation on ban | Custom logout endpoint | Better Auth `session.update()` or direct session table deletion | Better Auth manages session storage; API ensures consistency |

**Key insight:** Admin moderation is a critical security function — all patterns (auth, validation, logging, soft delete) are established and MUST be reused to prevent bypasses.

## Runtime State Inventory

**Trigger:** Phase 6 is admin management — no rename/refactor/migration involved.

**Status:** No runtime state inventory needed for this phase.

---

## Common Pitfalls

### Pitfall 1: Ban Without Session Invalidation
**What goes wrong:** Admin bans user, but user's existing JWT token remains valid. User can keep making API requests, see data, send messages.
**Why it happens:** Forgetting that JWT stored client-side is not revoked by updating DB. Session cookie validation must check status on every request.
**How to avoid:** Add `if (session.user.banned) return 403` check in `requireSession` hook BEFORE ANY route handler runs.
**Warning signs:** Banned user continues to appear in message threads, can update profile, can see other users.

### Pitfall 2: Soft Delete Not Excluded From Queries
**What goes wrong:** Admin removes report by soft-deleting player profile. Profile still appears in search results and public views because queries don't filter `hidden = true`.
**Why it happens:** Soft delete is added but queries weren't updated. Common oversight when deleting is first implemented.
**How to avoid:** Add WHERE clause filter in ALL queries that expose entities: `.where(eq(players.hidden, false))` in search/list endpoints. Document soft-delete pattern.
**Warning signs:** Removed profiles still searchable, removed messages still in conversations.

### Pitfall 3: Forgetting to Disconnect Socket.io on Ban
**What goes wrong:** User is banned, but their WebSocket connection persists. They can emit `typing_start`, `message_send` events and potentially cause data inconsistency.
**Why it happens:** Ban logic focuses on HTTP endpoints; real-time is overlooked.
**How to avoid:** During ban handler, iterate `fastify.io.sockets.sockets` and call `socket.disconnect(true)` for matching userId.
**Warning signs:** Banned user still shows as "online", chat messages appear from banned account after ban, typing indicators from banned user.

### Pitfall 4: Audit Log Missing Context
**What goes wrong:** Admin removes report but audit log shows `action: "remove"` with no note or target entity ID. Later investigation can't determine what was removed or why.
**Why it happens:** Logging is minimal; `note` field is optional and often skipped; `targetEntityId` may not be recorded.
**How to avoid:** Always populate `targetEntityType` and `targetEntityId`. Use `note` for admin's reason (e.g., "spam campaign"). Verify audit_logs row is inserted before returning success.
**Warning signs:** Audit log query shows bare actions with null `targetEntityId`, missing notes for critical actions.

### Pitfall 5: Forgetting to Check Banned Status in requireSession
**What goes wrong:** Similar to Pitfall 1 — ban enforcement exists in ban endpoint but not in the auth hook, so banned users still pass `requireSession`.
**Why it happens:** Two places to enforce: (1) when setting banned, (2) on every auth check. Easy to implement (1) and forget (2).
**How to avoid:** Update `requireSession` hook to fetch user record and check `banned` field before returning session. Use a query like `db.query.users.findFirst({ where: eq(users.id, session.user.id) })`.
**Warning signs:** Admin bans user; user can still GET their own profile, POST messages, access protected routes.

### Pitfall 6: Pagination Off-by-One Error
**What goes wrong:** `GET /admin/users?page=2` returns wrong users or skips users because offset calculation is wrong.
**Why it happens:** Incorrect formula: `offset = page * pageSize` instead of `offset = (page - 1) * pageSize`.
**How to avoid:** Use formula `offset = Math.max(0, (page - 1) * pageSize)`. Verify with test: page 1 should return first N users, page 2 should skip first N and return next N.
**Warning signs:** Users appear in multiple pages, users are skipped, page 2 and page 1 have overlap.

## Code Examples

Verified patterns from official sources:

### Get All Users with Filters
```typescript
// Source: Projeto/apps/api/src/routes/search.ts (pagination reference)
const searchUsers = async (db: Database, query: ListUsersQuery) => {
  const offset = Math.max(0, (query.page - 1) * query.pageSize)

  const where = and(
    query.status ? eq(users.status, query.status) : undefined,
    query.role ? eq(users.role, query.role) : undefined,
    query.search ? or(ilike(users.name, `%${query.search}%`), ilike(users.email, `%${query.search}%`)) : undefined,
  )

  const [results, countResult] = await Promise.all([
    db.query.users.findMany({
      where,
      offset,
      limit: query.pageSize,
    }),
    db.select({ count: count() }).from(users).where(where),
  ])

  const total = countResult[0]?.count || 0
  return {
    data: results.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
  }
}
```

### Ban User with Audit Logging
```typescript
// Source: Pattern from Projeto/apps/api/src/routes/players.ts + audit_logs schema
const banUser = async (fastify: FastifyInstance, userId: string, adminId: string, reason?: string) => {
  // Update user status
  await fastify.db.update(users).set({
    banned: true,
    banReason: reason || null,
  }).where(eq(users.id, userId))

  // Log action
  await fastify.db.insert(auditLogs).values({
    adminId,
    action: "ban_user",
    targetEntityType: "user",
    targetEntityId: userId,
    note: reason || null,
  })

  // Disconnect Socket.io
  for (const socket of fastify.io.sockets.sockets.values()) {
    if (socket.data.userId === userId) {
      socket.disconnect(true)
    }
  }
}
```

### Dismiss Report
```typescript
// Source: Projeto/apps/api/src/db/schema/moderation-reports.ts + audit_logs pattern
const dismissReport = async (fastify: FastifyInstance, reportId: string, adminId: string, note?: string) => {
  await fastify.db.update(moderationReports).set({
    status: "dismissed",
  }).where(eq(moderationReports.id, reportId))

  await fastify.db.insert(auditLogs).values({
    adminId,
    action: "dismiss_report",
    targetEntityType: "report",
    targetEntityId: reportId,
    note: note || null,
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded admin IDs in .env | Role-based access control (RBAC) via Better Auth | Phase 2 | Scalable: multiple admins, role enforcement via preHandler |
| Hard delete of user data | Soft delete (status flag) for moderation | Phase 6 | Audit trail preserved; investigation possible; compliance |
| Session validity per token only | Session validity + user status check | Phase 6 | Ban takes effect immediately; no token expiration needed |
| Manual pagination calculation | Drizzle offset/limit + count query | Phase 4 | Prevents off-by-one; testable; reusable |

**Deprecated/outdated:**
- Manual JWT parsing in routes — Better Auth handles session validation globally.
- Custom error responses — Use `AppError` class and centralized error handler.

## Open Questions

None — all infrastructure is in place. User schema needs optional `warnCount` field for future escalation logic, but that's a schema edit, not a blocker.

## Environment Availability

**Step 2.6: SKIPPED** (Phase 6 is backend code/database only — no external tool dependencies beyond existing infrastructure: Node.js, PostgreSQL, Socket.io server).

---

## Validation Architecture

**Status:** Enabled (workflow.nyquist_validation not explicitly set to false in .planning/config.json)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | Projeto/apps/api/vitest.config.ts |
| Quick run command | `cd Projeto/apps/api && npm run test:unit -- --run` |
| Full suite command | `cd Projeto/apps/api && npm run test` (includes integration) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-01 | GET /admin/users lists users; GET /admin/users/:id returns detail | integration | `npm run test -- routes/admin.test.ts -t "list users\|user detail"` | ❌ Wave 0 |
| ADM-02 | POST /admin/users/:id/ban sets status, invalidates session, disconnects socket | integration | `npm run test -- routes/admin.test.ts -t "ban user"` | ❌ Wave 0 |
| ADM-03 | GET /admin/moderation/reports lists pending reports with pagination | integration | `npm run test -- routes/admin.test.ts -t "list reports"` | ❌ Wave 0 |
| ADM-04 | POST /admin/moderation/reports/:id with action dismiss/remove/warn modifies status/entity and logs audit | integration | `npm run test -- routes/admin.test.ts -t "moderate report"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit -- --run`
- **Per wave merge:** `npm run test` (full suite with integration)
- **Phase gate:** Full suite must be green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `Projeto/apps/api/src/routes/admin.test.ts` — covers ADM-01 through ADM-04
- [ ] `Projeto/apps/api/src/hooks/require-auth.test.ts` — covers ban status enforcement
- [ ] Update `Projeto/apps/api/src/plugins/socket-io.test.ts` — verify disconnect on ban
- [ ] Fixtures: `adminUser`, `bannedUser`, `reports`, `moderation fixtures` in test setup

*(If test infrastructure is partial, Wave 0 will establish it; see `/gsd:plan-phase` output for task breakdown)*

---

## Sources

### Primary (HIGH confidence)
- **CONTEXT.md (Phase 6)** — Decisions D-01 through D-15, canonical references, code patterns
- **Projeto/apps/api/src/db/schema/** — users, audit_logs, moderation_reports tables; all fields verified
- **Projeto/apps/api/src/hooks/require-auth.ts** — `requireRole("admin")` hook, tested and working
- **Projeto/apps/web/shared/contracts/users.ts** — `ListUsersQuerySchema`, `UserDetailSchema`, `BanUserRequestSchema`, all verified
- **Projeto/apps/web/shared/contracts/moderation.ts** — `ListReportsQuerySchema`, `ModerateReportRequestSchema`, all verified
- **Projeto/apps/api/src/lib/errors.ts** — `AppError` class, error handler pattern
- **Projeto/apps/api/src/plugins/socket-io.ts** — Socket.io server, `fastify.io` decoration, room management

### Secondary (MEDIUM confidence)
- **Projeto/apps/api/src/routes/players.ts** — Route structure, pagination, Zod validation, date serialization pattern
- **Projeto/apps/api/src/routes/search.ts** — Advanced filtering, pagination formula, count aggregation pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Fastify/Drizzle/Zod/Better Auth/Socket.io are locked and tested in Phase 1–5
- Architecture: HIGH — Route pattern, hook pattern, audit logging, soft delete are established; no new approaches needed
- Pitfalls: HIGH — Drawn from common real-world moderation implementation mistakes (ban enforcement, soft delete filtering, socket disconnect)
- Validation: MEDIUM — Test framework is Vitest; test infrastructure partial (will be completed in Wave 0)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (30 days; stable domain — admin CRUD is well-known)
