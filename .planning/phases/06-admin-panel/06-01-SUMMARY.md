---
phase: 06-admin-panel
plan: "01"
subsystem: admin
tags: [schema, auth, tdd, ban-enforcement]
dependency_graph:
  requires: []
  provides: [warnCount-schema, ban-enforcement-hook, admin-test-harness]
  affects: [06-02-PLAN, 06-03-PLAN]
tech_stack:
  added: []
  patterns: [drizzle-ban-check-in-prehandler, tdd-red-stubs]
key_files:
  created:
    - Projeto/apps/api/tests/helpers/admin-helpers.ts
    - Projeto/apps/api/tests/routes/admin.test.ts
  modified:
    - Projeto/apps/api/src/db/schema/users.ts
    - Projeto/apps/api/src/hooks/require-auth.ts
decisions:
  - "Ban check queries DB directly in requireSession hook — Better Auth session object does not carry the custom users.banned field, so a DB lookup is required on every authenticated request (acceptable for v1)"
  - "admin.test.ts extended rather than replaced — pre-existing stubs for ADM-01/02 were already richer than plan template; ADM-03/04 sections added"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 4
---

# Phase 06 Plan 01: Wave 0 Foundation — Schema, Ban Hook, RED Tests Summary

**One-liner:** warnCount schema field, per-request ban enforcement in requireSession, and RED integration test harness (31 stubs) covering ADM-01 through ADM-04.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add warnCount to users schema and ban enforcement to requireSession | d5d6625 | users.ts, require-auth.ts |
| 2 | Create admin test helper and RED test stubs for ADM-01 through ADM-04 | c7eba02 | admin-helpers.ts, admin.test.ts |

---

## What Was Built

**Task 1 — Schema + Ban Hook:**
- Added `warnCount: integer("warn_count").notNull().default(0)` to the users table (needed by the warn moderation action in Plan 03)
- Added `integer` to drizzle-orm/pg-core imports in users.ts
- Added ban enforcement in `requireSession`: after setting `request.session`, queries DB for `users.banned`; returns 403 `ACCOUNT_BANNED` if true (D-02 enforcement point)
- Imported `eq` from drizzle-orm and `users` schema into require-auth.ts

**Task 2 — Test Infrastructure:**
- Created `admin-helpers.ts` with 4 exports: `createAdminUser`, `createRegularUser`, `seedReport`, `setUserBanned`
- Extended existing `admin.test.ts` (which already had ADM-01/02 stubs) with ADM-03 and ADM-04 sections
- Final test count: 31 RED stubs across all admin routes — all will fail until Plans 02 and 03 implement the routes

---

## Deviations from Plan

### Auto-fixed Issues

None.

### Observations

**1. [Rule 2 - Enhancement] admin.test.ts already existed with richer ADM-01/02 coverage**
- **Found during:** Task 2
- **Issue:** The file already existed from prior work with 20 tests covering ADM-01 and ADM-02 in more detail than the plan template (filter tests, 404 cases, etc.)
- **Fix:** Kept existing tests intact, added ADM-03 and ADM-04 sections using `seedReport` from the new admin-helpers
- **Files modified:** admin.test.ts
- **Commit:** c7eba02

**2. Pre-existing TypeScript error in require-auth.ts (out of scope)**
- Line 19 `request.session = session` has a pre-existing TS2322 type mismatch (Better Auth session type missing the `role` augmentation). This existed before this plan and is unrelated to our changes. Deferred per scope boundary rules.

---

## Known Stubs

All tests in `admin.test.ts` are intentional RED stubs — they will fail with 404 until Plans 02 and 03 implement the admin routes. This is the expected TDD state.

---

## Self-Check: PASSED

- `warnCount` in users.ts: FOUND (line 17)
- `ACCOUNT_BANNED` in require-auth.ts: FOUND (line 29)
- admin-helpers.ts: FOUND with 4 exports (createAdminUser, createRegularUser, seedReport, setUserBanned)
- admin.test.ts: FOUND with 31 test cases
- Commits d5d6625 and c7eba02: FOUND
