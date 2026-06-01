# Phase 5: Real-Time Messaging - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

HTTP REST endpoints for conversation and message CRUD + Socket.io server for real-time delivery, typing indicators, and online presence. Also includes additive socket.io-client wiring in the frontend (`mensagens.tsx` for both jogador and time routes).

Delivers:
- `POST /conversations` — start a conversation (player→team or team→player)
- `GET /conversations` — list user's conversations with last message preview and unread count
- `GET /conversations/:id/messages` — fetch all messages in a conversation (marks as read)
- `POST /conversations/:id/messages` — send a message + emit Socket.io event to room
- Socket.io server: real-time message delivery, typing indicators, online presence
- socket.io-client hook in frontend: `app/lib/messaging/use-socket.ts`

The backend must match `~shared/contracts/messaging.ts` exactly. The frontend is otherwise complete — only additive socket.io-client changes allowed.

</domain>

<decisions>
## Implementation Decisions

### Socket.io Scope
- **D-01:** Add socket.io-client to the frontend (`apps/web` package). This is an additive change — no existing contracts or components are modified.
- **D-02:** Create `app/lib/messaging/use-socket.ts` as a shared hook used by both `jogador/mensagens.tsx` and `time/mensagens.tsx`.
- **D-03:** Standard event set:
  - `new_message` — payload: `Message` object (from shared contracts)
  - `typing_start` / `typing_stop` — payload: `{ conversationId: string; userId: string }`
  - `user_online` / `user_offline` — payload: `{ userId: string }`
- **D-04:** Room strategy: one room per `conversationId` (for message delivery and typing events) + one room per `userId` (for presence events).
- **D-05:** When `POST /conversations/:id/messages` is called, the handler saves the message to DB **and** emits `new_message` to the conversation room. HTTP is the source of truth; socket is the delivery mechanism.
- **D-06:** Frontend hook receives `new_message` events and updates local React Query state without a full refetch (optimistic append).

### Socket.io Authentication
- **D-07:** WebSocket authentication via `io.use()` middleware — reads the session cookie from `handshake.headers.cookie`, calls Better Auth's `getSession()` to validate. Same auth path as HTTP routes. Unauthenticated connections are rejected before the connection is established (SC-5).
- **D-08:** No token passing via query params — cookie-only to avoid token leakage in URLs.

### Conversation Access Control
- **D-09:** `POST /conversations` enforces the plan's `conversationsLimit`. Count existing conversations for the authenticated user. If `count >= plan.conversationsLimit`, return `403 Forbidden` with a clear error (matches `MessageLimitBanner` and `getRemainingConversations()` in the frontend).
- **D-10:** If a conversation between the two participants already exists (unique constraint), return the **existing** `Conversation` object with `200 OK`. Idempotent — no `409` errors.
- **D-11:** Plan limit is resolved via DB lookup per request (same pattern as Phase 4 D-13).

### Messages — Load Strategy
- **D-12:** `GET /conversations/:id/messages` returns **all messages** for the conversation. No real pagination. Response meta is set to `{ page: 1, pageSize: total, total, totalPages: 1 }` to satisfy the optional meta field in the contract.
- **D-13:** Messages ordered `ASC` by `id` (bigserial) — oldest first, matching standard chat chronological display.

### unreadCount
- **D-14:** `unreadCount` in `ConversationSummary` is computed as: `COUNT(*) FROM messages WHERE conversationId = :id AND senderId != :me AND readAt IS NULL`. No new tables needed — derived from existing `messages.readAt` column.
- **D-15:** Auto-mark as read: when `GET /conversations/:id/messages` is called, run `UPDATE messages SET readAt = now() WHERE conversationId = :id AND senderId != :me AND readAt IS NULL`. No separate mark-as-read endpoint.

### Claude's Discretion
- ID generation for new conversation rows (`crypto.randomUUID()` vs `nanoid`)
- Drizzle query style for conversation upsert (select-then-return vs insert with `onConflictDoNothing`)
- Socket.io room join/leave lifecycle (join on connect based on user's conversations, or on-demand)
- Presence tracking strategy (in-memory Set, socket.io built-in `sockets.adapter.rooms`, or Redis — for TCC single-server deployment, in-memory is fine)
- Vitest integration test structure for socket.io events (following Phase 3/4 RED→GREEN pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shared Contracts (source of truth for all request/response shapes)
- `Projeto/apps/web/shared/contracts/messaging.ts` — `MessageSchema`, `ConversationSchema`, `ConversationSummarySchema`, `ListConversationsResponseSchema`, `GetMessagesResponseSchema`, `CreateConversationRequestSchema`, `SendMessageRequestSchema`
- `Projeto/apps/web/shared/contracts/subscription.ts` — `PLAN_CONFIGS`, `getPlanLimits()`, `conversationsLimit`
- `Projeto/apps/web/shared/contracts/common.ts` — `PaginationMetaSchema`

### Database Schema
- `Projeto/apps/api/src/db/schema/conversations.ts` — `conversations` table, `unique_participants` constraint
- `Projeto/apps/api/src/db/schema/messages.ts` — `messages` table, `bigserial` id, `readAt` column, `messages_conversation_id_idx`
- `Projeto/apps/api/src/db/schema/users.ts` — `users` table (for participant joins)

### Existing Infrastructure to Reuse
- `Projeto/apps/api/src/hooks/require-auth.ts` — `requireAuth` / `requireSession` preHandler
- `Projeto/apps/api/src/lib/response.ts` — `ok()` helper for `{ data: T }` wrapping
- `Projeto/apps/api/src/lib/errors.ts` — error factory for `403`, `404`, `400` responses
- `Projeto/apps/api/src/app.ts` — where to register new route plugins and Socket.io server
- `Projeto/apps/api/src/routes/subscription.ts` — reference for plan limit DB lookup pattern (Phase 4)

### Frontend Files to Wire Socket.io Into
- `Projeto/apps/web/app/routes/jogador/mensagens.tsx` — add useSocket hook call here
- `Projeto/apps/web/app/routes/time/mensagens.tsx` — add useSocket hook call here
- `Projeto/apps/web/app/lib/api-client.ts` — `messagingApi` signatures (verify endpoint contracts)
- `Projeto/apps/web/mocks/handlers/messaging.ts` — MSW mock behavior (baseline for expected HTTP responses)

### Requirements
- `.planning/REQUIREMENTS.md` §Messaging — MSG-01, MSG-02, MSG-03, MSG-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireAuth` / `requireSession` preHandler — session validation, already used in all protected routes
- `ok()` response helper — wraps `{ data: T }`, required for all endpoints
- `errors.ts` error factory — standardized error responses
- `conversations` + `messages` DB tables — schema already live from Phase 1
- `messages.id` is `bigserial` — sequence guarantees ordering without app-level sort ambiguity

### Established Patterns
- Routes registered as Fastify plugins in `src/routes/`, imported in `src/app.ts`
- Zod validation via `fastify-type-provider-zod` — schema declared in route options
- Error responses through `src/lib/errors.ts`
- Rate limiting applied globally — no per-endpoint config needed
- Plan limit resolution via DB lookup per request (established in Phase 4)
- Integration test pattern: Vitest + real DB, RED→GREEN per plan

### Integration Points
- **Backend:** Register `fastify-socket.io` in `src/app.ts` alongside existing plugins
- **Backend:** New route file `src/routes/conversations.ts` (registered with `/api` prefix)
- **Frontend:** New hook `app/lib/messaging/use-socket.ts` (socket.io-client)
- **Frontend:** Import and call hook in `jogador/mensagens.tsx` and `time/mensagens.tsx`

### Constraints
- `fastify-socket.io` not yet installed — must add to `Projeto/apps/api/package.json`
- `socket.io-client` not yet installed — must add to `Projeto/apps/web/package.json`
- Frontend changes must be **additive only** — no existing component or contract modifications

</code_context>

<specifics>
## Specific Ideas

- Frontend hook (`use-socket.ts`) should append incoming `new_message` events to React Query cache rather than triggering a full `invalidateQueries` refetch — avoids race conditions with in-flight HTTP requests
- The `unique_participants` constraint on `conversations` is ordered (participantA, participantB) — the upsert query must normalize participant order (e.g., `min(userA, userB)` as participantA) to ensure the constraint fires correctly
- For presence: TCC runs on a single VPS with a single Docker container — in-memory Set is sufficient, no Redis needed

</specifics>

<deferred>
## Deferred Ideas

- Message read receipts per-message (MSG-V2-01) — v2 milestone
- Message reactions / emoji (MSG-V2-02) — v2 milestone
- File/image attachments (MSG-V2-03) — v2 milestone
- Explicit `PUT /conversations/:id/read` endpoint — not needed given auto-mark on GET
- Cursor-based pagination for long message threads — out of TCC scope

</deferred>

---

*Phase: 05-real-time-messaging*
*Context gathered: 2026-03-25*
