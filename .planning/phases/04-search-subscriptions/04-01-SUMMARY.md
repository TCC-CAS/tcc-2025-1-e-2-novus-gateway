---
phase: 04-search-subscriptions
plan: "01"
subsystem: testing
tags: [tdd, search, subscription, red-phase]
dependency_graph:
  requires: []
  provides:
    - tests/routes/search.test.ts
    - tests/routes/subscription.test.ts
  affects:
    - plans/04-02 (search routes must make search tests GREEN)
    - plans/04-03 (subscription routes must make subscription tests GREEN)
tech_stack:
  added: []
  patterns:
    - vitest integration tests with Fastify inject
    - TDD RED phase — tests fail with no routes present
key_files:
  created:
    - Projeto/apps/api/tests/routes/search.test.ts
    - Projeto/apps/api/tests/routes/subscription.test.ts
  modified: []
decisions:
  - "Import signUpAndGetCookie from profile-helpers (not auth-helpers) — it lives there alongside upsertPlayerProfile"
  - "SUB-03b test creates 11 player users with upserted profiles to ensure plan limit has data to cap"
  - "SUB-02g verifies upgrade effect by asserting conversationsLimit > 10 (craque = 999999 vs free = 10)"
metrics:
  duration_minutes: 10
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 2
requirements:
  - SRCH-01
  - SRCH-02
  - SUB-01
  - SUB-02
  - SUB-03
---

# Phase 4 Plan 01: RED Test Stubs for Search and Subscription Summary

**One-liner:** Vitest RED integration test stubs covering all 5 Phase 4 requirements (SRCH-01, SRCH-02, SUB-01, SUB-02, SUB-03) — 24 total test cases, all failing with no routes present.

---

## What Was Built

Two test files created following the exact structure of `tests/routes/players.test.ts`:

**`tests/routes/search.test.ts`** — 13 test cases:
- SRCH-01 (6 cases): GET /api/search/players — auth, role enforcement, filters, self-exclusion
- SRCH-02 (5 cases): GET /api/search/teams — auth, role enforcement, filters
- SUB-03 (2 cases): pageSize cap at 50, free-plan team capped at 10 results

**`tests/routes/subscription.test.ts`** — 11 test cases:
- SUB-01 (4 cases): GET /api/subscription/usage — auth, idempotency, full UsageSchema field validation
- SUB-02 (7 cases): POST /api/subscription/upgrade — player/team valid plans, cross-role rejection, auth, post-upgrade state

---

## RED State Confirmed

Both test suites fail at `beforeAll` due to DB connection refused (no running DB in CI). All test cases are skipped/failed — correct RED state. TypeScript imports compile without errors (verified by vitest transform phase succeeding).

```
search.test.ts:      1 failed | 13 skipped
subscription.test.ts: 1 failed | 11 skipped
```

---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | a3e4113 | test(04-01): add RED integration test stubs for SRCH-01, SRCH-02, SUB-03 |
| Task 2 | 98f2673 | test(04-01): add RED integration test stubs for SUB-01, SUB-02 |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — test files are intentionally failing (RED state). No implementation stubs exist; all test assertions are real.

---

## Self-Check: PASSED

- [x] `Projeto/apps/api/tests/routes/search.test.ts` exists
- [x] `Projeto/apps/api/tests/routes/subscription.test.ts` exists
- [x] Commit a3e4113 exists
- [x] Commit 98f2673 exists
- [x] 13 `it(` blocks in search.test.ts (>= 13 required)
- [x] 11 `it(` blocks in subscription.test.ts (>= 11 required)
- [x] Both test files fail at runtime (RED state confirmed)
