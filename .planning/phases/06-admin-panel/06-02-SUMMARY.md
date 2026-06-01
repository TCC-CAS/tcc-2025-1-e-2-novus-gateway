---
phase: 06-admin-panel
plan: "02"
subsystem: admin-routes
tags: [admin, user-management, ban, audit-log, fastify]
dependency_graph:
  requires: [06-01]
  provides: [admin-user-management-routes]
  affects: [admin-panel, user-enforcement]
tech_stack:
  added: [nanoid@3.3.11]
  patterns: [requireRole preHandler, Drizzle ORM pagination, audit log on action, Socket.io disconnect on ban]
key_files:
  created:
    - Projeto/apps/api/src/routes/admin.ts
    - Projeto/apps/api/src/db/migrations/0005_funny_mandroid.sql
    - Projeto/apps/api/tests/routes/admin.test.ts
  modified:
    - Projeto/apps/api/src/app.ts
    - Projeto/apps/api/package.json
    - Projeto/apps/api/pnpm-lock.yaml
decisions:
  - used requireRole("admin") preHandler on all 4 routes for consistent 403/401 enforcement
  - ban sets users.banned=true; 403 enforcement delegated to requireSession from Plan 01 (D-02)
  - audit log written on view_user_detail, ban_user, unban_user
  - Socket.io disconnect loop guards against missing io with optional chaining
metrics:
  duration_min: 25
  completed_date: "2026-03-27"
  tasks_completed: 1
  files_changed: 6
requirements: [ADM-01, ADM-02]
---

# Phase 6 Plan 02: Admin User Management Routes Summary

**One-liner:** Admin user management via GET /users (paginated+filtered), GET /users/:id (audit logged), POST ban/unban with Socket.io disconnect and Better Auth session invalidation.

---

## Objective Achieved

Delivers ADM-01 and ADM-02 requirements. Turns RED test cases for list users, user detail, ban, and unban GREEN. All 21 ADM-01/ADM-02 test cases pass.

---

## What Was Built

### `Projeto/apps/api/src/routes/admin.ts`

Fastify plugin with 4 user management routes:

- **GET /api/admin/users** — paginated list with `role`, `status`, `search` (ilike) filters. Maps `banned` boolean to `status: "banned" | "active"`.
- **GET /api/admin/users/:id** — full user detail; writes `view_user_detail` audit log entry.
- **POST /api/admin/users/:id/ban** — sets `users.banned=true`, attempts Better Auth session revocation, disconnects Socket.io connections, writes `ban_user` audit log.
- **POST /api/admin/users/:id/unban** — sets `users.banned=false`, writes `unban_user` audit log.

All routes use `preHandler: [requireRole("admin")]` — non-admin gets 403, unauthenticated gets 401.

### `Projeto/apps/api/src/app.ts`

Added admin route registration: `await fastify.register(import("./routes/admin.js"), { prefix: "/api/admin" })`

### `Projeto/apps/api/src/db/migrations/0005_funny_mandroid.sql`

Generated migration adding missing `warn_count` column to `users` table (pre-existing schema/migration gap from Plan 01).

---

## Test Results

- **21 ADM-01/ADM-02 tests: PASS**
- **10 ADM-03/ADM-04 moderation tests: FAIL** (expected — moderation routes are Plan 03's responsibility)
- **134/144 total tests pass** across full suite — no regressions

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing nanoid dependency**
- **Found during:** Test run setup
- **Issue:** `src/lib/auth.ts` imports `nanoid` but it wasn't in `package.json`
- **Fix:** `pnpm add nanoid`
- **Files modified:** `Projeto/apps/api/package.json`, `Projeto/apps/api/pnpm-lock.yaml`

**2. [Rule 1 - Bug] Missing warn_count column in DB migrations**
- **Found during:** Test execution — sign-up failing with `column "warn_count" does not exist`
- **Issue:** `src/db/schema/users.ts` defines `warnCount` column but no migration existed for it
- **Fix:** Generated new migration `0005_funny_mandroid.sql` via `drizzle-kit generate`
- **Files modified:** `Projeto/apps/api/src/db/migrations/0005_funny_mandroid.sql`
- **Commit:** ebfb771

**3. [External] Parallel Plan 03 agent modified admin.test.ts**
- **Found during:** After writing RED phase test file
- **Issue:** Plan 03 parallel agent added ADM-03/ADM-04 moderation tests and `seedReport` import to the shared test file
- **Fix:** Rewrote test to use `createAdminUser`/`createRegularUser` helpers from `admin-helpers.ts` (more robust than extracting userId from sign-up response body). Retained Plan 03 moderation tests in file.

---

## Known Stubs

None. All routes return real data from DB.

---

## Self-Check: PASSED

- admin.ts: FOUND
- 0005_funny_mandroid.sql: FOUND
- commit 410172b (test RED phase): FOUND
- commit ebfb771 (feat GREEN phase): FOUND
- commit 6a71fcf (docs metadata): FOUND
