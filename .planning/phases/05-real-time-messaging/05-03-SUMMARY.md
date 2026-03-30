---
phase: "05"
plan: "03"
subsystem: real-time-messaging
tags: [socket.io, websockets, auth-middleware, presence, typing-indicators]
dependency_graph:
  requires: ["05-02"]
  provides: ["socket-io-plugin", "fastify.io-decoration", "MSG-03", "MSG-04"]
  affects: ["conversations-routes"]
tech_stack:
  added: ["fastify-socket.io", "fastify-plugin fp wrapper for socket-io"]
  patterns: ["io.use() auth middleware", "rooms_joined sync event", "server-side room join on connect"]
key_files:
  created:
    - Projeto/apps/api/src/plugins/socket-io.ts
  modified:
    - Projeto/apps/api/src/app.ts
    - Projeto/apps/api/tests/helpers/auth-helpers.ts
    - Projeto/apps/api/tests/helpers/socket-helpers.ts
decisions:
  - "Wrapped socketIOPlugin with fp() so fastify.io decoration propagates to child route scopes"
  - "Emitted rooms_joined event after server-side room joins complete so test clients wait for readiness"
  - "Added app.listen() on port 0 in createTestApp to bind HTTP server for WebSocket acceptance"
metrics:
  duration_minutes: 35
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_modified: 4
---

# Phase 05 Plan 03: Socket.io Plugin — Summary

**One-liner:** Socket.io plugin with Better Auth io.use() middleware, server-side room joins, typing relay, and presence events — all 8 MSG-03/MSG-04 tests GREEN.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement socket-io.ts plugin | ee11a17 | src/plugins/socket-io.ts |
| 2 | Register plugin in app.ts; tests GREEN | 4ad42fb | src/app.ts, tests/helpers/auth-helpers.ts, tests/helpers/socket-helpers.ts |

---

## What Was Built

- **`src/plugins/socket-io.ts`** — Fastify plugin wrapping fastify-socket.io with:
  - `io.use()` auth middleware calling `auth.api.getSession()` via cookie header — rejects unauthenticated connections before the connection event fires
  - `connection` handler: joins `user:{userId}` presence room + all conversation rooms from DB
  - `rooms_joined` event emitted after all `socket.join()` calls complete
  - `typing_start` / `typing_stop` relay via `socket.to(conversationId).emit()`
  - `user_online` / `user_offline` presence events on connect/disconnect
  - `FastifyInstance.io: Server` type augmentation via `declare module "fastify"`

- **`src/app.ts`** — socket-io plugin registered after auth, before route plugins (order critical: routes use `fastify.io`)

- **Test helpers (Rule 3 auto-fix):**
  - `tests/helpers/auth-helpers.ts`: added `app.listen({ port: 0 })` so HTTP server binds for WebSocket acceptance
  - `tests/helpers/socket-helpers.ts`: `createAuthenticatedSocket` waits for `rooms_joined` instead of `connect` to ensure all room joins are complete before test proceeds

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] fastify-socket.io types don't declare FastifyInstance.io**
- **Found during:** Task 1 TypeScript check
- **Issue:** `fastify.io` caused TS2339 because fastify-socket.io's type definitions don't include a `declare module "fastify"` augmentation
- **Fix:** Added `declare module "fastify" { interface FastifyInstance { io: Server } }` in socket-io.ts
- **Files modified:** src/plugins/socket-io.ts
- **Commit:** ee11a17

**2. [Rule 3 - Blocking] fastify.register(fastifySocketIO, opts) TS overload mismatch**
- **Found during:** Task 1 TypeScript check
- **Issue:** TypeScript couldn't match `fastifySocketIO` to any `fastify.register` overload when options were passed inline; imported as `FastifySocketioOptions` didn't resolve the overload
- **Fix:** Cast `fastifySocketIO as any` for the register call (library type limitation, not a runtime issue)
- **Files modified:** src/plugins/socket-io.ts
- **Commit:** ee11a17

**3. [Rule 3 - Blocking] socketIOPlugin not wrapped with fp() — io decoration confined to child scope**
- **Found during:** Task 2 test run (MSG-03c/d timeouts)
- **Issue:** Without `fp()`, the plugin runs in an encapsulated scope. `fastify.io` was decorated on that child scope, not the root. The conversations route (another child scope) couldn't see it, so `(fastify as any).io` was undefined and no emit fired.
- **Fix:** Wrapped `socketIOPlugin` with `fp(socketIOPlugin, { name: "socket-io" })` so the `io` decoration propagates to root and all child scopes
- **Files modified:** src/plugins/socket-io.ts
- **Commit:** 4ad42fb

**4. [Rule 3 - Blocking] createTestApp did not call app.listen() — WebSocket connections rejected**
- **Found during:** Task 2 first test run (all 7 tests failed with "websocket error")
- **Issue:** Socket.io client connects to `app.server.address().port` but without `app.listen()`, the HTTP server is not bound to any port
- **Fix:** Added `await app.listen({ port: 0, host: "127.0.0.1" })` in `createTestApp`
- **Files modified:** tests/helpers/auth-helpers.ts
- **Commit:** 4ad42fb

**5. [Rule 3 - Blocking] createAuthenticatedSocket resolved on connect before server rooms were joined**
- **Found during:** Task 2 second test run (6/8 pass, MSG-03c/d timeout)
- **Issue:** The `connect` event fires on the client when the socket connects, but the server-side `connection` handler is async and DB room joins haven't completed yet. Tests that send events immediately after connect raced with room join completion.
- **Fix:** Server emits `rooms_joined` after all `socket.join()` calls; `createAuthenticatedSocket` waits for `rooms_joined` instead of `connect`
- **Files modified:** src/plugins/socket-io.ts, tests/helpers/socket-helpers.ts
- **Commit:** 4ad42fb

---

## Known Stubs

None.

---

## Test Results

```
MSG-03a: authenticated socket connects successfully         ✓ 698ms
MSG-03b: unauthenticated socket is rejected before connection ✓ 10ms
MSG-03c: POST message causes recipient socket to receive new_message within 1000ms ✓ 555ms
MSG-03d: new_message payload has id, conversationId, senderId, content, createdAt ✓ 538ms
MSG-04a: typing_start emitted by sender is received by recipient ✓ 576ms
MSG-04b: typing_stop emitted by sender is received by recipient ✓ 534ms
MSG-04c: user_online event received by other participant when user connects ✓ 562ms
MSG-04d: user_offline event received by other participant when user disconnects ✓ 564ms

8/8 tests GREEN
```

Pre-existing SUB-03b failure confirmed via git stash — not introduced by this plan.

---

## Self-Check: PASSED
