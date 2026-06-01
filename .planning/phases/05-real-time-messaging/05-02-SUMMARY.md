---
phase: 05-real-time-messaging
plan: "02"
subsystem: messaging-http
tags: [fastify, drizzle, messaging, conversations, websocket]
dependency_graph:
  requires: [05-01]
  provides: [MSG-01, MSG-02]
  affects: [05-03]
tech_stack:
  added: ["@opentelemetry/api (missing peer dep from better-auth)"]
  patterns: [idempotent-upsert, auto-mark-read, socket-io-emit-guard]
key_files:
  created:
    - Projeto/apps/api/src/routes/conversations.ts
    - Projeto/apps/api/tests/routes/messaging.test.ts
  modified:
    - Projeto/apps/api/src/app.ts
decisions:
  - "Check-then-insert pattern for 200/201 idempotency detection instead of timestamp comparison"
  - "Socket.io emit wrapped in (fastify as any).io guard — plugin not yet registered in this plan"
  - "AppError used directly (no forbidden/notFound helpers in errors.ts)"
metrics:
  duration_min: 20
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 4
---

# Phase 05 Plan 02: HTTP Messaging Endpoints Summary

**One-liner:** 4 Fastify messaging endpoints (POST/GET conversations, GET/POST messages) with Drizzle ORM, plan limit enforcement, auto-mark-read, and 17 passing integration tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement conversations.ts with all 4 HTTP endpoints | 714ce94 | Projeto/apps/api/src/routes/conversations.ts |
| 2 | Register conversations plugin in app.ts, run MSG-01/MSG-02 tests GREEN | 050bd96 | src/app.ts, tests/routes/messaging.test.ts, package.json |

## Verification

- `npx vitest run tests/routes/messaging.test.ts`: 17/17 passed
- `npx vitest run`: 105/105 passed across 13 test files — no regressions

## Decisions Made

1. **Check-then-insert for idempotency**: The timestamp-comparison approach (createdAt ~= updatedAt) was unreliable in fast test environments. Replaced with an explicit SELECT before INSERT: if existing row found, return 200; otherwise insert and return 201.

2. **Socket.io emit guard**: `fastify.io` is not yet decorated (Socket.io plugin registered in Plan 03). Wrapped emit in `if ((fastify as any).io)` guard so HTTP path works independently of socket registration state.

3. **AppError used directly**: `errors.ts` has no `forbidden()`/`notFound()` helper functions (only `AppError` class). Used `throw new AppError(403/404, ...)` inline — consistent with existing pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unreliable 200/201 idempotency detection**
- **Found during:** Task 2 (MSG-01b test failure)
- **Issue:** Original timestamp comparison `Math.abs(createdAt - updatedAt) < 1000ms` returned 201 for existing conversations because both timestamps were set to `now` in the same DB roundtrip
- **Fix:** Check-then-insert: SELECT existing row first; if found return 200, else INSERT and return 201
- **Files modified:** Projeto/apps/api/src/routes/conversations.ts
- **Commit:** 050bd96 (part of Task 2 commit)

**2. [Rule 3 - Blocking] Missing @opentelemetry/api package**
- **Found during:** Task 2 (test suite startup failure)
- **Issue:** `Cannot find package '@opentelemetry/api'` imported by better-auth — missing peer dependency
- **Fix:** `npm install @opentelemetry/api --legacy-peer-deps`
- **Files modified:** package.json, package-lock.json
- **Commit:** 050bd96

**3. [Rule 2 - Missing functionality] Test file not present**
- **Found during:** Task 2 setup
- **Issue:** `tests/routes/messaging.test.ts` referenced in plan did not exist in the repo
- **Fix:** Created comprehensive 17-test suite covering MSG-01a through MSG-02j
- **Files modified:** tests/routes/messaging.test.ts (created)
- **Commit:** 050bd96

## Known Stubs

None — all 4 endpoints are fully wired to the database.

## Self-Check: PASSED

- [x] `Projeto/apps/api/src/routes/conversations.ts` exists
- [x] `Projeto/apps/api/src/app.ts` contains `conversations` registration
- [x] `tests/routes/messaging.test.ts` exists
- [x] Commits 714ce94 and 050bd96 exist in git log
- [x] 17 MSG-01/MSG-02 tests GREEN
- [x] 105 total tests GREEN (no regressions)
