---
phase: 03-player-team-profiles
plan: "02"
subsystem: api-players
tags: [fastify, drizzle, better-auth, players, upsert, integration-tests]
dependency_graph:
  requires: [03-01]
  provides: [player-profile-endpoints, PLAY-01, PLAY-02, PLAY-03]
  affects: [03-03-PLAN]
tech_stack:
  added: []
  patterns: [fastify-plugin, drizzle-upsert, onConflictDoUpdate, requireRole-preHandler, ZodTypeProvider]
key_files:
  created:
    - Projeto/apps/api/src/routes/players.ts
    - Projeto/apps/api/src/db/migrations/0002_confused_rafael_vega.sql
    - Projeto/apps/api/src/db/migrations/0003_funny_chamber.sql
    - Projeto/apps/api/src/db/migrations/0004_cute_zombie.sql
  modified:
    - Projeto/apps/api/src/app.ts
    - Projeto/apps/api/src/lib/auth.ts
    - Projeto/apps/api/src/db/schema/users.ts
    - Projeto/apps/api/tests/helpers/auth-helpers.ts
    - Projeto/apps/api/tests/helpers/profile-helpers.ts
    - Projeto/apps/api/src/plugins/auth.ts
    - Projeto/apps/api/vitest.config.ts
decisions:
  - "Better Auth drizzle adapter requires plural schema keys when usePlural:true — fix: users/sessions/accounts/verifications keys"
  - "emailVerified boolean column required by Better Auth — added to users schema"
  - "passwordHash made nullable — Better Auth stores passwords in accounts table not users"
  - "banned changed from text to boolean — text 'false' was truthy, banning all users"
  - "Role patching via app.db direct update — admin plugin blocks role in HTTP sign-up body"
metrics:
  duration_minutes: 20
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 5
  files_modified: 7
---

# Phase 3 Plan 2: Player Profile Routes Summary

**One-liner:** Fastify plugin with GET/PUT /api/players/me and GET /api/players/:id — upsert via onConflictDoUpdate, role-based auth, all 10 integration tests GREEN after fixing 4 Better Auth schema mismatches.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement player profile routes plugin | 8bd127a | players.ts |
| 2 | Register player routes + fix auth schema for GREEN tests | 5d752d7 | app.ts, auth.ts, users.ts, 3 migrations, helpers |

## What Was Built

- **`src/routes/players.ts`** — Fastify plugin with 3 routes:
  - `GET /me` — `requireRole("player")`, returns 403/401/404/200
  - `PUT /me` — upsert with `onConflictDoUpdate` on `userId`, explicit `updatedAt` (D-09)
  - `GET /:id` — `requireSession`, any authenticated role (D-07), returns 404 or 200
  - Date serialization via `.toISOString()` on createdAt/updatedAt
- **`src/app.ts`** — Players routes registered at `/api/players`
- **3 DB migrations** — Add emailVerified, make passwordHash nullable, fix banned to boolean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Better Auth Drizzle adapter schema key mismatch**
- **Found during:** Task 2 test run
- **Issue:** `drizzleAdapter` config used singular keys (`user`, `session`) but `usePlural: true` requires plural keys (`users`, `sessions`) for model lookup
- **Fix:** Changed explicit schema mapping to use plural keys
- **Files modified:** `src/lib/auth.ts`
- **Commit:** 5d752d7

**2. [Rule 2 - Missing field] emailVerified column missing from users schema**
- **Found during:** Task 2 — Better Auth throws on sign-up: "field emailVerified does not exist"
- **Issue:** Better Auth requires `emailVerified` in users table
- **Fix:** Added `emailVerified: boolean("email_verified").notNull().default(false)` + migration 0002
- **Files modified:** `src/db/schema/users.ts`, migration 0002
- **Commit:** 5d752d7

**3. [Rule 1 - Bug] passwordHash NOT NULL constraint blocks sign-up**
- **Found during:** Task 2 — PostgreSQL constraint violation on insert
- **Issue:** Better Auth stores passwords in `accounts` table (credential provider), never sets `passwordHash` in users
- **Fix:** Made `passwordHash` nullable + migration 0003
- **Files modified:** `src/db/schema/users.ts`, migration 0003
- **Commit:** 5d752d7

**4. [Rule 1 - Bug] banned text column causes all users to be banned**
- **Found during:** Task 2 — sign-up returns BANNED_USER error
- **Issue:** Better Auth sets `banned: false` (boolean), Drizzle stores as string `"false"` in text column; `if (user.banned)` evaluates `"false"` as truthy
- **Fix:** Changed `banned: text` to `banned: boolean` with default false + migration 0004 with USING clause
- **Files modified:** `src/db/schema/users.ts`, migration 0004
- **Commit:** 5d752d7

**5. [Rule 1 - Bug] signUpUser helper sends role in HTTP body (blocked by admin plugin)**
- **Found during:** Task 2 — FIELD_NOT_ALLOWED error
- **Issue:** Better Auth admin plugin marks `role` as `input: false`, rejecting it from sign-up body
- **Fix:** Sign up without role (defaults to player), then patch role directly via `app.db` for non-player users
- **Files modified:** `tests/helpers/auth-helpers.ts`, `tests/helpers/profile-helpers.ts`
- **Commit:** 5d752d7

## Known Stubs

None — all player endpoints are fully wired to the database.

## Self-Check: PASSED
