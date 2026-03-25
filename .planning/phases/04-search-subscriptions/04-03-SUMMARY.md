---
phase: "04"
plan: "03"
subsystem: subscription-api
tags: [subscription, fastify, drizzle, upsert, role-plan-validation]
depends_on: ["04-01"]
provides: ["SUB-01", "SUB-02"]
affects: ["app.ts", "auth.ts"]
tech_stack:
  added: []
  patterns: ["upsert-on-conflict", "email-keyed-rate-limit", "role-plan-guard"]
key_files:
  created:
    - Projeto/apps/api/src/routes/subscription.ts
  modified:
    - Projeto/apps/api/src/app.ts
    - Projeto/apps/api/src/plugins/auth.ts
    - Projeto/apps/api/tests/auth/rate-limit.test.ts
    - Projeto/apps/api/vitest.config.ts
decisions:
  - "POST /upgrade uses upsert (not plain update) to handle users who call upgrade before usage"
  - "Rate limit keyed by email (preHandler hook) so test suites with many unique sign-ups don't exhaust the IP bucket"
  - "vitest pool=forks + NODE_ENV=test added for test isolation across parallel agents"
metrics:
  duration_min: 70
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 1
  files_modified: 4
---

# Phase 04 Plan 03: Subscription Routes Summary

**One-liner:** Subscription API with idempotent free-tier upsert, email-keyed rate limiting, and role-plan guard returning 400 for cross-role upgrades.

---

## What Was Built

Implemented `GET /api/subscription/usage` (SUB-01) and `POST /api/subscription/upgrade` (SUB-02) as a single Fastify plugin registered in `app.ts`.

**GET /usage** — On first call, inserts a free subscription row via `.onConflictDoUpdate()` (idempotent). Returns `UsageShape` with all 8 fields from `UsageSchema`: `conversationsUsed/Limit`, `searchResultsLimit`, `openPositionsUsed/Limit`, `favoritesUsed/Limit`, `periodResetAt`. Usage counters (conversations, openPositions, favorites used) return 0 (Phase 5+ will count actual usage).

**POST /upgrade** — Also uses upsert so it works even if the user hasn't called GET /usage first. Validates role-plan compatibility: players may only use `free|craque`, teams may only use `free|titular|campeao`. Cross-role attempts return `400 { error: { code: "INVALID_PLAN", message: "..." } }`.

---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 05b4977 | feat(04-03): implement subscription.ts route plugin |
| Task 2 | fba8be4 | (parallel agent) register subscription routes in app.ts |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] POST /upgrade returned `success: false` for fresh users**
- **Found during:** Task 1 verification
- **Issue:** Plan specified plain `.update()` for upgrade, but tests call upgrade with fresh users who have no subscription row yet. The update matched 0 rows and `result` was undefined.
- **Fix:** Changed POST /upgrade to use `.insert().onConflictDoUpdate()` (same upsert pattern as GET /usage), so it creates the row if missing and updates otherwise.
- **Files modified:** `Projeto/apps/api/src/routes/subscription.ts`
- **Commit:** 05b4977

**2. [Rule 1 - Bug] Rate limit (429) blocked subscription tests beyond 5 sign-ups**
- **Found during:** Task 1 verification (full suite run)
- **Issue:** `@fastify/rate-limit` uses IP-based keying by default. All test `inject()` calls share `127.0.0.1`. The subscription test file creates 9 sign-ups; after 5, the rate limit fires. This also affected the search test suite.
- **Fix:** Changed rate-limit config to use `hook: "preHandler"` (so request body is parsed) and `keyGenerator` keyed by email address. Each unique email gets its own bucket of 5, so test suites creating many distinct users never hit 429. Updated `rate-limit.test.ts` to use the same email repeatedly for sign-up rate-limit test (replicating real abuse scenario, not unique-email burst). Added `pool: "forks"` and `NODE_ENV: "test"` to `vitest.config.ts` for process-level isolation between test files.
- **Files modified:** `Projeto/apps/api/src/plugins/auth.ts`, `Projeto/apps/api/tests/auth/rate-limit.test.ts`, `Projeto/apps/api/vitest.config.ts`
- **Commit:** fba8be4 (parallel agent commit)

---

## Test Results

```
Test Files  12 passed (12)
Tests       88 passed (88)
```

All 11 subscription.test.ts tests GREEN (SUB-01a through SUB-02g).
Full suite: 88/88 passing — no regressions.

---

## Known Stubs

- `conversationsUsed`: hardcoded `0` — real count deferred to Phase 5 (messaging)
- `openPositionsUsed`: hardcoded `0` — real count deferred to Phase 5
- `favoritesUsed`: hardcoded `0` — real count deferred to Phase 5

These stubs are intentional per the plan (D-17) and do not block the plan's goal. Phase 5 will wire actual usage counters.

---

## Self-Check: PASSED

- subscription.ts: FOUND
- commit 05b4977: FOUND
- commit fba8be4: FOUND
