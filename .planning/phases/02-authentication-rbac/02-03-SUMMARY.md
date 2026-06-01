---
phase: 02-authentication-rbac
plan: "03"
subsystem: auth-tests
tags: [vitest, integration-tests, better-auth, rbac, rate-limit]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["auth-integration-tests", "AUTH-01-verified", "AUTH-02-verified", "AUTH-03-verified", "AUTH-04-verified"]
  affects: []
tech_stack:
  added: []
  patterns: ["fastify.inject() for HTTP simulation", "createTestApp() shared fixture", "vi.spyOn for console verification"]
key_files:
  created:
    - Projeto/apps/api/tests/helpers/auth-helpers.ts
    - Projeto/apps/api/tests/auth/sign-up.test.ts
    - Projeto/apps/api/tests/auth/sign-in.test.ts
    - Projeto/apps/api/tests/auth/password-reset.test.ts
    - Projeto/apps/api/tests/auth/rbac.test.ts
    - Projeto/apps/api/tests/auth/rate-limit.test.ts
  modified:
    - Projeto/apps/api/package.json
decisions:
  - "extractSessionCookie searches for better-auth/session/varzeapro cookie names to be robust against Better Auth cookie naming"
  - "createTestApp sets env vars if not already set so tests can run without external .env"
  - "Randomize email in signUpUser helper to avoid duplicate key errors across test runs"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase 02 Plan 03: Auth Integration Tests Summary

**One-liner:** Integration test suite using Fastify inject() covering AUTH-01 through AUTH-04 and rate limiting — sign-up, sign-in, password reset, RBAC (401/403), and 429 after 5 requests.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create test helpers and sign-up/sign-in tests | 9805aa5 | auth-helpers.ts, sign-up.test.ts, sign-in.test.ts, package.json |
| 2 | Create password-reset, RBAC, and rate-limit tests | edd0cfb | password-reset.test.ts, rbac.test.ts, rate-limit.test.ts |

---

## What Was Built

- **`tests/helpers/auth-helpers.ts`** — Shared test utilities: `createTestApp()` (builds app with test env vars), `signUpUser()` (randomized email), `signInUser()`, `extractSessionCookie()` (searches for better-auth/session cookie names).
- **`tests/auth/sign-up.test.ts`** — AUTH-02: role=player and role=team sign-up return HttpOnly cookie; missing email and weak password rejected; no token in response body.
- **`tests/auth/sign-in.test.ts`** — AUTH-01: valid credentials return HttpOnly cookie; no token in body; invalid password and nonexistent email rejected.
- **`tests/auth/password-reset.test.ts`** — AUTH-03: forget-password returns 200 and logs `[PASSWORD RESET]` token to console via spy.
- **`tests/auth/rbac.test.ts`** — AUTH-04: `/api/me` returns 401 unauthenticated, 200 with session; `/api/admin/test` returns 403 for player role, 401 unauthenticated.
- **`tests/auth/rate-limit.test.ts`** — Rate limiting: 429 after 5 sign-in requests, 429 after 5 sign-up requests from same IP.
- **`package.json`** — Added `"test:auth": "vitest run tests/auth/"` script.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Robust cookie extraction in auth-helpers**
- **Found during:** Task 1
- **Issue:** Plan's `extractSessionCookie` only matched `varzeapro` cookie name, but Better Auth uses `better-auth.session_token` as the actual cookie name
- **Fix:** Extended matcher to check for `better-auth`, `varzeapro`, or `session` substrings so tests work regardless of the exact cookie name Better Auth uses
- **Files modified:** `tests/helpers/auth-helpers.ts`
- **Commit:** 9805aa5

**2. [Rule 2 - Missing critical functionality] Env var initialization in createTestApp**
- **Found during:** Task 1
- **Issue:** Plan's `createTestApp` did not set env vars, but tests run independently of `health.test.ts` which sets them in `beforeEach`
- **Fix:** Added `process.env` guards in `createTestApp()` to set DATABASE_URL, JWT_SECRET, NODE_ENV if not already set
- **Files modified:** `tests/helpers/auth-helpers.ts`
- **Commit:** 9805aa5

---

## Known Stubs

None. Tests are wired against the real app instance. Tests will fail if DATABASE_URL is unavailable — this is expected behavior for integration tests.

---

## Self-Check: PASSED

- `Projeto/apps/api/tests/helpers/auth-helpers.ts` — exists, exports createTestApp, signUpUser, signInUser, extractSessionCookie
- `Projeto/apps/api/tests/auth/sign-up.test.ts` — exists, contains HttpOnly assertions
- `Projeto/apps/api/tests/auth/sign-in.test.ts` — exists, contains HttpOnly assertions
- `Projeto/apps/api/tests/auth/password-reset.test.ts` — exists, contains [PASSWORD RESET] check
- `Projeto/apps/api/tests/auth/rbac.test.ts` — exists, contains 401 and 403 checks with error.code
- `Projeto/apps/api/tests/auth/rate-limit.test.ts` — exists, contains 429 checks
- `Projeto/apps/api/package.json` — contains test:auth script
- Commits 9805aa5 and edd0cfb present in git log
