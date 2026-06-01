---
phase: 01-foundation-database-schema
plan: 02
subsystem: database
tags: [drizzle, schema, postgresql, orm, enums, indexes]
dependency_graph:
  requires: []
  provides: [drizzle-schema, db-tables, db-enums]
  affects: [phase-02-auth, phase-03-player-team, phase-04-messaging, phase-05-search, phase-06-moderation, phase-07-subscriptions]
tech_stack:
  added: [drizzle-orm@0.45.1, drizzle-kit@0.31.10, postgres@3.4.8, vitest@3.0.0]
  patterns: [drizzle-pg-core, pgEnum, bigserial, array-columns, unique-constraint, composite-unique]
key_files:
  created:
    - Projeto/apps/api/src/db/schema/users.ts
    - Projeto/apps/api/src/db/schema/players.ts
    - Projeto/apps/api/src/db/schema/teams.ts
    - Projeto/apps/api/src/db/schema/conversations.ts
    - Projeto/apps/api/src/db/schema/messages.ts
    - Projeto/apps/api/src/db/schema/subscriptions.ts
    - Projeto/apps/api/src/db/schema/audit-logs.ts
    - Projeto/apps/api/src/db/schema/moderation-reports.ts
    - Projeto/apps/api/src/db/schema/index.ts
    - Projeto/apps/api/drizzle.config.ts
    - Projeto/apps/api/tests/schema.test.ts
    - Projeto/apps/api/package.json
    - Projeto/apps/api/tsconfig.json
    - Projeto/apps/api/vitest.config.ts
  modified: []
decisions:
  - "bigserial mode=bigint produces PgBigSerial64 column type (not PgBigSerial) — test updated to match actual Drizzle internals"
  - "Package.json and tsconfig created in this plan (parallel with 01-01 scaffold) to enable test execution; 01-01 will produce compatible versions that merge cleanly"
metrics:
  duration_minutes: 10
  completed_date: "2026-03-24"
  tasks_completed: 1
  files_created: 14
---

# Phase 01 Plan 02: Database Schema Summary

**One-liner:** All 8 Drizzle ORM table definitions with typed enums, foreign keys, array columns, and composite unique constraints derived from shared contracts.

---

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create all 8 Drizzle schema files with enums, relations, and indexes | 36c86da | Done |

---

## What Was Built

Eight Drizzle ORM schema files covering all domain tables for VarzeaPro:

- **users** — `roleEnum` ("player"|"team"|"admin"), `planIdEnum` ("free"|"craque"|"titular"|"campeao"), unique email
- **players** — FK to users (unique), array columns for `positions` and `skills`
- **teams** — `teamLevelEnum`, FK to users (unique), array columns for `openPositions` and `matchDays`
- **conversations** — composite unique constraint on `(participantA, participantB)` preventing duplicate conversations
- **messages** — `bigserial` PK (DB sequence, not application-generated), index on `conversationId` for fast chat queries
- **subscriptions** — `subscriptionStatusEnum`, unique `userId` (one subscription per user)
- **audit_logs** — `bigserial` PK, FK to users (admin actions only)
- **moderation_reports** — three enums: `reportedEntityTypeEnum`, `reportReasonEnum`, `reportStatusEnum`

A barrel `index.ts` re-exports all 8 tables and 7 enums. `drizzle.config.ts` points Drizzle Kit at the schema for migration generation.

---

## Test Results

All 21 schema shape tests pass via Vitest:
- Column presence verified for all 8 tables
- Enum values verified against shared contracts
- Unique constraints verified (`users.email`, `subscriptions.userId`)
- `messages.id` column type confirmed as `PgBigSerial64` (bigserial with mode=bigint)
- All 8 table exports and 7 enum exports confirmed from barrel index

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion used wrong Drizzle column type name**
- **Found during:** Task 1 (GREEN phase verification)
- **Issue:** Test expected `columnType` to be `"PgBigSerial"` but Drizzle uses `"PgBigSerial64"` when `mode: "bigint"` is specified
- **Fix:** Updated test assertion to `"PgBigSerial64"` — implementation (bigserial with mode=bigint) is correct per plan spec
- **Files modified:** `Projeto/apps/api/tests/schema.test.ts`
- **Commit:** 36c86da

**2. [Rule 3 - Blocking] Package.json/tsconfig/vitest.config created in this plan**
- **Found during:** Task 1 setup
- **Issue:** `apps/api` directory didn't exist (plan 01-01 runs in parallel in sibling worktree); test runner could not be installed without package.json
- **Fix:** Created minimal `package.json`, `tsconfig.json`, and `vitest.config.ts` to unblock test execution. Plan 01-01 will produce compatible versions that merge cleanly at integration
- **Files modified:** `Projeto/apps/api/package.json`, `Projeto/apps/api/tsconfig.json`, `Projeto/apps/api/vitest.config.ts`
- **Commit:** 84cfc6f

---

## Known Stubs

None — all 8 tables are fully defined with real column types. No placeholder data.

---

## Self-Check

Checking created files exist and commits are valid:

## Self-Check: PASSED

- FOUND: Projeto/apps/api/src/db/schema/users.ts
- FOUND: Projeto/apps/api/src/db/schema/messages.ts
- FOUND: Projeto/apps/api/src/db/schema/index.ts
- FOUND: Projeto/apps/api/drizzle.config.ts
- FOUND commit 36c86da: feat(01-02): implement all 8 Drizzle schema files
- FOUND commit 84cfc6f: test(01-02): add failing schema shape tests
