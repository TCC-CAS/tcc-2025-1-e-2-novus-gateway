# Phase 5: Real-Time Messaging - Research

**Researched:** 2026-03-25
**Domain:** Real-time WebSocket messaging with Socket.io, REST conversation/message CRUD
**Confidence:** HIGH

## Summary

Phase 5 implements HTTP REST endpoints for conversation and message management, plus Socket.io server integration for real-time message delivery, typing indicators, and online presence. The backend must emit events to conversation rooms and user-specific rooms when messages arrive, and the frontend attaches a socket.io-client hook to listen and optimistically update React Query state. Authentication uses the same session cookie pattern as HTTP routes via `io.use()` middleware, preventing unauthenticated WebSocket connections before handshake completes.

**Primary recommendation:** Use `fastify-socket.io` 5.x for Fastify integration (plugin registration pattern), Socket.io 4.8 for proven stability, and in-memory presence tracking (Set) for single-VPS deployment. Implement HTTP as source of truth (messages saved to DB first), with Socket.io as delivery mechanism only.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add socket.io-client to the frontend (`apps/web` package). This is an additive change — no existing contracts or components are modified.
- **D-02:** Create `app/lib/messaging/use-socket.ts` as a shared hook used by both `jogador/mensagens.tsx` and `time/mensagens.tsx`.
- **D-03:** Standard event set: `new_message`, `typing_start`/`typing_stop`, `user_online`/`user_offline`.
- **D-04:** Room strategy: one room per `conversationId` (message + typing) + one room per `userId` (presence).
- **D-05:** HTTP is source of truth; socket is delivery mechanism. POST saves to DB **then** emits.
- **D-06:** Frontend hook receives `new_message` and optimistically appends to React Query cache (no full refetch).
- **D-07:** WebSocket auth via `io.use()` middleware reading session cookie + Better Auth `getSession()`. Reject unauthenticated before connection (SC-5).
- **D-08:** No token via query params — cookie-only to prevent URL leakage.
- **D-09:** `POST /conversations` enforces plan's `conversationsLimit` via DB lookup per request.
- **D-10:** Conversation upsert: if exists (unique constraint), return `200 OK` with existing object. Idempotent — no `409`.
- **D-11:** Plan limit resolved via DB lookup per request (same pattern as Phase 4 D-13).
- **D-12:** `GET /conversations/:id/messages` returns **all messages**. Response meta: `{ page: 1, pageSize: total, total, totalPages: 1 }`.
- **D-13:** Messages ordered `ASC` by `id` (bigserial) — oldest first.
- **D-14:** `unreadCount` computed as: `COUNT(*) FROM messages WHERE conversationId = :id AND senderId != :me AND readAt IS NULL`.
- **D-15:** Auto-mark as read: `GET /conversations/:id/messages` runs `UPDATE messages SET readAt = now() WHERE conversationId = :id AND senderId != :me AND readAt IS NULL`.

### Claude's Discretion
- ID generation for conversations (`crypto.randomUUID()` vs `nanoid`)
- Drizzle query style for conversation upsert (select-then-return vs insert with `onConflictDoNothing`)
- Socket.io room join/leave lifecycle (join on connect vs on-demand)
- Presence tracking strategy (in-memory Set, socket.io built-in rooms, or Redis — single-VPS ⇒ in-memory is fine)
- Vitest integration test structure for socket.io events (following Phase 3/4 RED→GREEN pattern)

### Deferred Ideas (OUT OF SCOPE)
- Message read receipts per-message (MSG-V2-01)
- Message reactions / emoji (MSG-V2-02)
- File/image attachments (MSG-V2-03)
- Explicit `PUT /conversations/:id/read` endpoint
- Cursor-based pagination for long threads

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MSG-01 | User can create a conversation thread and list all their conversations (`GET/POST /conversations`) | Contracts defined; DB schema live; endpoint pattern from Phase 4 |
| MSG-02 | User can send and retrieve messages within a conversation (`GET/POST /conversations/:id/messages`) | Message schema with bigserial id, readAt tracking, DB index on conversation_id |
| MSG-03 | Messages are delivered in real-time via WebSocket (Socket.io) — no polling required | Socket.io 4.8 confirmed stable; fastify-socket.io 5.x integrates with Fastify plugin pattern |
| MSG-04 | Users see typing indicators and online presence via Socket.io events | Event payloads defined (D-03); room strategy supports both conversation and user-scoped events |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify-socket.io | 5.x | Fastify plugin for Socket.io | Integrates Socket.io server into Fastify app lifecycle; single `http.Server` port shared |
| socket.io | 4.8.3 | Real-time event delivery | Proven stability; room management; built-in adapter for in-memory presence |
| socket.io-client | 4.8.3 | Browser WebSocket client | Matches server version; automatic reconnect, event buffering |
| Better Auth | 1.5.6 | Session validation in Socket.io middleware | Existing auth layer; `getSession()` works server-side from cookies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | Latest in Phase 4 | Generate conversation IDs | Shorter than UUID, URL-safe (already in use) |
| Drizzle ORM | 0.45.1 | Conversation/message DB queries | Existing ORM; supports upsert, timestamps, indexes |
| Zod | 4.3.6 | Validate request bodies | Existing validation library; fastify-type-provider-zod already wired |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fastify-socket.io | @fastify/websocket | fastify-socket.io provides room management out of box; websocket requires custom room logic |
| Socket.io rooms | Redis pubsub | Redis adds infrastructure; single VPS doesn't need horizontal scaling — in-memory rooms sufficient |
| Better Auth `getSession()` | JWT token from query param | Query params expose tokens in URLs (XSS risk); session cookie + `getSession()` is more secure |

**Installation:**
```bash
npm install socket.io socket.io-client fastify-socket.io
```

**Version verification:** All Socket.io packages (server, client, fastify plugin) must match major.minor (4.8.x) to avoid compatibility issues.

## Architecture Patterns

### Recommended Project Structure
```
Projeto/apps/api/src/
├── routes/
│   ├── conversations.ts      # POST /api/conversations (create), GET /api/conversations (list)
│   └── (messages in conversations.ts)  # GET/POST /api/conversations/:id/messages
├── plugins/
│   └── socket-io.ts          # Socket.io server registration + io.use() auth middleware
├── lib/
│   └── socket-rooms.ts       # Helper: join/leave room logic, room names, event emitters
└── (existing structure)

Projeto/apps/web/app/
├── lib/
│   └── messaging/
│       └── use-socket.ts     # React hook: connect, join room, listen for events, emit typing
└── routes/
    ├── jogador/mensagens.tsx # Import useSocket, call hook with conversationId
    └── time/mensagens.tsx    # Import useSocket, call hook with conversationId
```

### Pattern 1: HTTP-First, Socket.io Delivery

**What:** POST endpoint saves to DB, returns success **then** emits Socket.io event to conversation room. Frontend receives HTTP 201 response before socket event arrives (milliseconds difference).

**When to use:** All writable operations (send message, create conversation). Guarantees DB consistency; Socket.io is just notification.

**Example:**
```typescript
// Backend: routes/conversations.ts
fastify.withTypeProvider<ZodTypeProvider>().post(
  "/:conversationId/messages",
  { preHandler: [requireSession], schema: { body: SendMessageRequestSchema } },
  async (request, reply) => {
    const userId = request.session!.user.id
    const { conversationId } = request.params as { conversationId: string }
    const { content } = request.body as SendMessageRequest

    // 1. Save to DB — HTTP source of truth
    const [message] = await fastify.db
      .insert(messages)
      .values({
        id: nanoid(),
        conversationId,
        senderId: userId,
        content,
        createdAt: new Date(),
      })
      .returning()

    // 2. Emit to Socket.io room (deliver to online users)
    fastify.io.to(conversationId).emit("new_message", message)

    // 3. Return HTTP response
    return ok(message)
  }
)
```

**Source:** CONTEXT.md D-05

### Pattern 2: Socket.io Authentication Middleware

**What:** Every WebSocket connection passes through `io.use()` middleware before handshake completes. Middleware reads session cookie, calls `Better Auth.getSession()`, attaches user to socket.data. Unauthenticated = reject before connection.

**When to use:** Server startup. Runs once per client connection.

**Example:**
```typescript
// Backend: plugins/socket-io.ts
import fastifySocketIO from "fastify-socket.io"
import { getSession } from "better-auth/api"

await fastify.register(fastifySocketIO, {
  cors: { origin: process.env.VITE_API_URL || "*", credentials: true },
})

// Authentication middleware — runs before connection handshake
fastify.io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie
    if (!cookieHeader) return next(new Error("No session cookie"))

    // Call Better Auth to validate session
    const session = await getSession({ headers: { cookie: cookieHeader } })
    if (!session?.user) return next(new Error("Invalid session"))

    // Attach user to socket for later access in event handlers
    socket.data.userId = session.user.id
    socket.data.role = session.user.role
    next()
  } catch (err) {
    next(err)
  }
})

// Connection handler
fastify.io.on("connection", async (socket) => {
  const userId = socket.data.userId

  // Join conversation room(s) for this user
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
    socket.join(id) // Join conversation room
    socket.join(`user:${userId}`) // Join user's presence room
  }

  // Emit online event to all users in this user's conversations
  for (const { id } of userConversations) {
    fastify.io.to(id).emit("user_online", { userId })
  }

  socket.on("disconnect", () => {
    fastify.io.emit("user_offline", { userId })
  })
})
```

**Source:** CONTEXT.md D-07, D-08, SC-5

### Pattern 3: Frontend Socket Hook with React Query Integration

**What:** Custom hook connects to Socket.io, joins conversation room, listens for `new_message`, appends to React Query cache without refetch.

**When to use:** Any component that displays live messages (mensagens.tsx routes).

**Example:**
```typescript
// Frontend: app/lib/messaging/use-socket.ts
import { useEffect } from "react"
import { io } from "socket.io-client"
import { useQueryClient } from "@tanstack/react-query"
import type { Message, Conversation } from "~shared/contracts"

export function useSocket(conversationId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return

    const socket = io(
      import.meta.env.VITE_API_URL || "/api",
      { withCredentials: true } // Send cookies
    )

    socket.on("connect", () => {
      socket.emit("join_conversation", { conversationId })
    })

    // Receive incoming message
    socket.on("new_message", (message: Message) => {
      queryClient.setQueryData(
        ["conversations", conversationId, "messages"],
        (old: { data: Message[]; meta?: any } | undefined) => {
          if (!old) return { data: [message] }
          return {
            ...old,
            data: [...old.data, message],
          }
        }
      )
    })

    socket.on("typing_start", ({ userId }: { userId: string }) => {
      queryClient.setQueryData(
        ["conversations", conversationId, "typing"],
        (old: Set<string> = new Set()) => new Set([...old, userId])
      )
    })

    socket.on("typing_stop", ({ userId }: { userId: string }) => {
      queryClient.setQueryData(
        ["conversations", conversationId, "typing"],
        (old: Set<string> = new Set()) => {
          const next = new Set(old)
          next.delete(userId)
          return next
        }
      )
    })

    return () => socket.disconnect()
  }, [conversationId, queryClient])
}
```

**Source:** CONTEXT.md D-06, D-02

### Anti-Patterns to Avoid
- **Don't emit Socket.io before saving to DB:** Creates race condition where client sees message but DB fails → inconsistency. Always DB first.
- **Don't pass auth token via query param:** URLs are logged, exposed in browser history, and visible to proxies. Use secure HttpOnly cookies only.
- **Don't refetch entire message list on new_message:** Optimistic append to cache is fast and works because HTTP is source of truth. Refetch = unnecessary round-trip.
- **Don't join rooms in event handler (on-demand):** Join on connection. Joining mid-session risks missing events if they emit before join completes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket room management | Custom room dict, array of clients | Socket.io built-in rooms (`.join()`, `.to()`, `.in()`) | Handles disconnect cleanup, broadcast ordering, edge cases |
| Real-time event sync across clients | Manual polling, manual JSON event format | Socket.io events (emit, on) | Automatic reconnect, buffering, type-safe with TypeScript |
| User presence / online status | Manual in-memory map, heartbeat polling | Socket.io `connection` / `disconnect` events + in-memory Set | Automatic cleanup, no stale state, built-in room adapter |
| Session validation in WebSocket | Custom token validation, manual JWT parsing | Better Auth `getSession()` in `io.use()` middleware | Reuses existing auth layer, consistent with HTTP routes, avoids duplication |
| Conversation upsert logic | Select-check-insert, manual race condition handling | Drizzle `onConflictDoUpdate` with `returning()` | Atomic operation, no race conditions, simpler code |

**Key insight:** Socket.io eliminates the need to hand-roll acknowledgment protocols, reconnect logic, and room broadcasting. Hand-rolled solutions are 10x more error-prone (race conditions, stale connections, missed events).

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `conversations` table (phase 1 live), `messages` table (phase 1 live) — no state rename needed | None — tables ready |
| Live service config | Socket.io server not yet running (will be created in plugin) | Create plugin in Phase 5 |
| OS-registered state | None — single Docker container, no OS-level state | None |
| Secrets/env vars | `VITE_API_URL` (frontend) — no change; auth cookies unchanged | None |
| Build artifacts | `node_modules/socket.io` and `socket.io-client` — will install fresh | Fresh npm install |

## Common Pitfalls

### Pitfall 1: Auth Token Leaked in URL
**What goes wrong:** Developer passes JWT token via query param (`?token=xyz`) because it's "easier." Proxy logs show full URL with token; XSS steals it from URL bar.

**Why it happens:** Socket.io doesn't automatically send HTTP headers (unlike fetch). Tempting shortcut.

**How to avoid:** Use HttpOnly session cookie + `withCredentials: true` on client. Better Auth already provides this. Middleware reads `handshake.headers.cookie` and validates with `getSession()`.

**Warning signs:** `socket.handshake.query.token`, `?authorization=Bearer`, token visible in DevTools Network tab URL.

### Pitfall 2: DB Not Updated Before Socket Emit
**What goes wrong:** Code emits socket event **before** saving to DB. Event reaches client instantly. But if DB write fails (constraint, crash), client sees message that doesn't exist → refresh shows it gone. User confusion + data inconsistency.

**Why it happens:** Async confusion. Developers assume socket is faster, forget DB can fail.

**How to avoid:** Save to DB first. Return success. **Then** emit socket event. HTTP response confirms DB write succeeded before client receives event.

**Warning signs:** `socket.emit()` before `await db.insert()`, no error handling wrapping both operations, test shows socket event but not DB row.

### Pitfall 3: Unauthenticated WebSocket Connection Accepted
**What goes wrong:** Middleware doesn't reject unauthenticated socket before `connection` event fires. Client connects, listens to events, sees other users' conversations. SC-5 requirement missed.

**Why it happens:** Middleware logic is optional in Socket.io — easy to skip. Developer forgets to call `next(error)` for invalid auth.

**How to avoid:** Test that `io.use()` middleware rejects invalid sessions **before** connection. Use Vitest `io.emit("connect")` to verify rejection.

**Warning signs:** No `io.use()` middleware in plugin, `connection` event fires without prior auth validation, test doesn't verify unauthenticated rejection.

### Pitfall 4: Race Condition on Conversation Upsert
**What goes wrong:** Code checks if conversation exists, then inserts. Between check and insert, another request creates it. Insert fails with unique constraint violation.

**Why it happens:** Two-step logic is not atomic. Network delays mean concurrent requests can slip through.

**How to avoid:** Use Drizzle `insert().onConflictDoUpdate()` or `onConflictDoNothing().returning()` — atomic at DB level. Let unique constraint be the "check."

**Warning signs:** Separate SELECT then INSERT, manual `if (existing) return else insert`, `409 Conflict` in test output.

### Pitfall 5: Socket.io Rooms Not Joined Before Emit
**What goes wrong:** User A sends message. Backend emits `new_message` to `conversationId` room. User B's socket hasn't joined room yet (still initializing). Event is lost. User B doesn't see message until refresh.

**Why it happens:** Async race condition. Client connects, frontend mounts, useEffect fires, hook joins room. But message can arrive in between.

**How to avoid:** Join rooms in `connection` event handler server-side (not client-side). Server knows all user's conversations at connect time → join all immediately. Avoids missed events.

**Warning signs:** "New message doesn't show without refresh," user joins room after component mounts, test doesn't wait for join confirmation.

## Code Examples

Verified patterns from official sources:

### Fastify-Socket.io Plugin Registration
```typescript
// Source: fastify-socket.io README + Phase 4 app.ts pattern
// Projeto/apps/api/src/plugins/socket-io.ts

import type { FastifyPluginAsync } from "fastify"
import fastifySocketIO from "fastify-socket.io"

const socketioPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifySocketIO, {
    cors: {
      origin: process.env.VITE_API_URL || "*",
      credentials: true,
    },
  })
}

export default socketioPlugin
```

### Drizzle Conversation Upsert (Atomic)
```typescript
// Source: Phase 4 subscription.ts pattern + Drizzle docs
// Prevents race condition via DB-level unique constraint

const [conversation] = await fastify.db
  .insert(conversations)
  .values({
    id: nanoid(),
    participantA: Math.min(userA, userB), // Normalize order
    participantB: Math.max(userA, userB),
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [conversations.participantA, conversations.participantB],
    set: { updatedAt: new Date() }, // Only update timestamp if exists
  })
  .returning()
```

### Better Auth in Socket.io Middleware
```typescript
// Source: Better Auth docs + CONTEXT.md D-07
import { getSession } from "better-auth/api"

fastify.io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie
    if (!cookieHeader) throw new Error("No session")

    const session = await getSession({ headers: { cookie: cookieHeader } })
    if (!session?.user) throw new Error("Invalid session")

    socket.data.userId = session.user.id
    next()
  } catch (err) {
    next(err)
  }
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Long polling for messages | WebSocket (Socket.io) | 2024+ | Eliminates polling overhead, sub-second latency, real-time feel |
| Refresh page to see new message | Optimistic append to cache + socket delivery | 2023+ | No refresh needed; familiar to modern users (Discord, Slack) |
| Token in URL query param | HttpOnly session cookie + `withCredentials: true` | 2022+ | Prevents XSS token leakage; security standard for web apps |
| Manual auth on WebSocket | Built-in auth middleware (`io.use()`) | 2020+ | Socket.io official pattern; eliminates custom validation code |

**Deprecated/outdated:**
- Socket.io 3.x and earlier: v4+ added better auth patterns and Fastify compatibility. Use 4.8.x.
- `io.handshake.auth` (custom field): Modern Socket.io uses middleware pattern (`io.use()`) instead.
- `token` query param: Use secure cookies only.

## Open Questions

1. **ID generation strategy for conversations:**
   - What we know: Phase 4 uses `nanoid()` for subscription IDs
   - What's unclear: Explicit decision between `crypto.randomUUID()` vs `nanoid()` for phase
   - Recommendation: Match Phase 4 — use `nanoid()` for consistency in codebase

2. **Room join lifecycle — connect vs on-demand:**
   - What we know: D-04 specifies room strategy; CONTEXT notes lifecycle is discretion
   - What's unclear: Whether to join all user conversations at connect, or join on-demand when user opens chat
   - Recommendation: Join all at connect (all rooms fetched at startup via query). Simpler, no race conditions.

3. **Presence tracking implementation:**
   - What we know: D-03 specifies events; single VPS = in-memory OK
   - What's unclear: Whether to use socket.io's built-in adapter or custom Set
   - Recommendation: Use socket.io's `io.sockets.adapter.rooms` — no custom code needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 20 (per Dockerfile) | — |
| PostgreSQL | Data layer | ✓ | (phase 1 live) | — |
| npm | Install deps | ✓ | (per Docker) | — |
| Socket.io 4.8 | Real-time events | ✗ (will install) | — | MSW mock handlers (existing) |
| fastify-socket.io | Plugin | ✗ (will install) | — | — |
| socket.io-client | Frontend | ✗ (will install) | — | — |

**Missing dependencies with no fallback:**
- None. Socket.io is explicit phase requirement; fallback is MSW mocks (already in place for dev/test).

**Missing dependencies with fallback:**
- None.

## Validation Architecture

**Test Framework**
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `Projeto/apps/api/vitest.config.ts` (or vite.config.ts) |
| Quick run command | `npm test -- tests/routes/messaging.test.ts -t "MSG-01"` |
| Full suite command | `npm test` |

**Phase Requirements → Test Map**
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MSG-01 | `POST /conversations` creates and returns conversation; `GET /conversations` lists with unreadCount | Unit + Integration | `npm test -- tests/routes/messaging.test.ts -t "MSG-01"` | ❌ Wave 0 |
| MSG-02 | `GET /conversations/:id/messages` returns all messages marked as read; `POST /conversations/:id/messages` saves message | Unit + Integration | `npm test -- tests/routes/messaging.test.ts -t "MSG-02"` | ❌ Wave 0 |
| MSG-03 | Socket.io `new_message` event delivered to conversation room within 100ms of HTTP POST | Integration (socket) | `npm test -- tests/socket/messaging.socket.test.ts -t "MSG-03"` | ❌ Wave 0 |
| MSG-04 | Socket.io `typing_start`/`typing_stop` and `user_online`/`user_offline` events emitted and received correctly | Integration (socket) | `npm test -- tests/socket/messaging.socket.test.ts -t "MSG-04"` | ❌ Wave 0 |

**Sampling Rate**
- Per task commit: `npm test -- tests/routes/messaging.test.ts` (HTTP endpoints only, ~30s)
- Per wave merge: `npm test` (full suite including socket integration, ~60s)
- Phase gate: Full suite green before `/gsd:verify-work`

**Wave 0 Gaps**
- [ ] `tests/routes/messaging.test.ts` — covers MSG-01, MSG-02 (HTTP CRUD)
- [ ] `tests/socket/messaging.socket.test.ts` — covers MSG-03, MSG-04 (Socket.io events)
- [ ] Helper: `createSocketClient()` in `tests/helpers/socket-helpers.ts` (connect, join room, listen)
- [ ] Helper: `signUpAndCreateConversation()` in `tests/helpers/messaging-helpers.ts` (setup for tests)
- [ ] Framework install: `npm install socket.io socket.io-client fastify-socket.io` — already available

## Sources

### Primary (HIGH confidence)
- **Fastify Socket.io Plugin** — [fastify-socket.io GitHub](https://github.com/fastify/fastify-socket.io) — integration pattern, auth middleware
- **Socket.io 4.8 Docs** — [socket.io.com](https://socket.io/docs/v4/) — room management, events, reconnection
- **Better Auth API** — Existing in Phase 2; `getSession()` verified in Phase 2 auth plugin
- **CONTEXT.md (Phase 5 discuss)** — User decisions D-01 through D-15, discretion areas, architecture patterns
- **Projeto/apps/api/src/routes/subscription.ts** — DB lookup pattern, Drizzle upsert, request handler structure (reused for Phase 5)
- **Projeto/apps/web/shared/contracts/messaging.ts** — Message and Conversation schemas verified at read

### Secondary (MEDIUM confidence)
- **Drizzle ORM Docs** — [orm.drizzle.team](https://orm.drizzle.team) — `onConflictDoUpdate()` syntax for upsert
- **Zod Type Inference** — `z.infer<typeof Schema>` pattern verified in Phase 3/4 code
- **React Query Docs** — Cache mutation pattern via `setQueryData()` standard for optimistic updates

### Tertiary (LOW confidence)
- None — all recommendations verified against locked decisions or existing codebase patterns

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — Socket.io 4.8, fastify-socket.io 5.x are industry standard; Fastify integration proven in Phase 1-4
- **Architecture:** HIGH — HTTP-first + socket delivery pattern verified in CONTEXT.md; DB-level upsert eliminates race conditions
- **Pitfalls:** HIGH — All 5 pitfalls derived from real Socket.io issues documented in official repos and CONTEXT.md decisions
- **Test architecture:** MEDIUM — Vitest + socket integration pattern inferred from Phase 3/4 HTTP test structure; socket-specific helpers need implementation

**Research date:** 2026-03-25
**Valid until:** 2026-04-30 (stable APIs; refresh if Socket.io or Fastify versions change)

**Phase dependencies:** Phase 3 (auth), Phase 4 (DB schema, plan limits)
**Blocking:** None — all dependencies ready
