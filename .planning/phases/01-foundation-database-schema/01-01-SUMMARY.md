---
phase: 01-foundation-database-schema
plan: "01"
subsystem: api-scaffold
tags: [fastify, typescript, zod, vitest, env-validation, health-endpoint]
dependency_graph:
  requires: []
  provides: [buildApp, env-plugin, health-endpoint, response-helpers, error-handler]
  affects: [all-subsequent-phases]
tech_stack:
  added:
    - fastify@5.8.4
    - fastify-plugin@5.1.0
    - "@fastify/cors@11.2.0"
    - "@fastify/env@5.0.3"
    - "@fastify/sensible"
    - fastify-type-provider-zod@6.1.0
    - zod@4.3.6
    - drizzle-orm@0.45.1
    - postgres@3.4.8
    - drizzle-kit@0.31.10
    - tsx@4.21.0
    - typescript@5.8.3
    - vitest@4.1.1
  patterns:
    - app.ts/server.ts factory split for testability
    - fastify-plugin decorator pattern for env and cors
    - ZodTypeProvider for request/response schema validation
    - ok()/list() response envelope helpers matching shared contracts
key_files:
  created:
    - Projeto/apps/api/package.json
    - Projeto/apps/api/tsconfig.json
    - Projeto/apps/api/vitest.config.ts
    - Projeto/apps/api/src/app.ts
    - Projeto/apps/api/src/server.ts
    - Projeto/apps/api/src/config/env.ts
    - Projeto/apps/api/src/plugins/cors.ts
    - Projeto/apps/api/src/routes/health.ts
    - Projeto/apps/api/src/lib/response.ts
    - Projeto/apps/api/src/lib/errors.ts
    - Projeto/apps/api/tests/health.test.ts
    - Projeto/apps/api/tests/env.test.ts
  modified: []
decisions:
  - "Used Zod safeParse directly in env plugin instead of @fastify/env — simpler, no JSON Schema conversion needed, same fail-fast behavior"
  - "Registered error handler via registerErrorHandler() function called in app.ts rather than as a plugin — avoids unnecessary plugin overhead"
  - "Used typescript@5.8.3 (stable) instead of 5.9.0-beta from plan — beta avoided for reliability"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-24"
  tasks_completed: 1
  tasks_total: 1
  files_created: 12
  files_modified: 0
---

# Phase 01 Plan 01: API Scaffold with Fastify, Env Validation, and Health Endpoint Summary

**One-liner:** Fastify 5 API factory with ZodTypeProvider, fail-fast env validation via fastify-plugin, GET /health endpoint, and ok()/list() response envelope helpers — 7 Vitest tests all green.

---

## What Was Built

The `Projeto/apps/api/` project was scaffolded from scratch with:

- **`buildApp()` factory** in `src/app.ts` — creates a configured Fastify 5 instance with ZodTypeProvider, registers plugins in the correct order (env → cors → sensible → routes), and is testable without calling `listen()`
- **Env plugin** (`src/config/env.ts`) — validates `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `PORT`, `NODE_ENV`, `CORS_ORIGIN` at startup using Zod; decorates `fastify.config` globally via `fp()` wrapper
- **CORS plugin** (`src/plugins/cors.ts`) — registers `@fastify/cors` with `credentials: true` and env-driven origin
- **Health endpoint** (`src/routes/health.ts`) — `GET /health` returns `{ status: "ok" }`
- **Response helpers** (`src/lib/response.ts`) — `ok<T>(data)` → `{ data }` and `list<T>(data, page, pageSize, total)` → `{ data, meta }` matching `~shared/contracts` PaginationMetaSchema exactly
- **Error handler** (`src/lib/errors.ts`) — `AppError` class + `setErrorHandler` returning `{ error: { code, message, details? } }` matching frontend `ApiErrorSchema`
- **Vitest test suite** (7 tests, all passing) covering buildApp creation, health endpoint, response helpers, and env validation failure cases

---

## Deviations from Plan

### Auto-decisions (no plan change required)

**1. Zod safeParse instead of @fastify/env JSON Schema bridge**
- **Found during:** Task 1 implementation
- **Issue:** Plan mentioned using `@fastify/env` OR direct Zod parsing. The `@fastify/env` JSON Schema approach would require converting Zod schemas to JSON Schema format — unnecessary complexity.
- **Fix:** Used `EnvSchema.safeParse(process.env)` directly in a fastify-plugin wrapper. Same fail-fast behavior, same typed output, simpler code.
- **Files modified:** `src/config/env.ts`

**2. typescript@5.8.3 instead of 5.9.0-beta**
- **Found during:** Package installation
- **Issue:** Plan specified `typescript@5.9.0-beta` — using a beta in a project scaffold is fragile.
- **Fix:** Used `5.8.3` (latest stable). No API differences relevant to this project.
- **Files modified:** `package.json`

---

## Known Stubs

None — all functionality is fully implemented and tested.

---

## Test Results

```
7 passed (7)
Duration: 504ms
```

All 5 plan-specified behaviors verified:
- Test 1: `buildApp()` creates Fastify instance without throwing
- Test 2: `GET /health` returns 200 `{ status: "ok" }`
- Test 3: `ok({ id: "1" })` returns `{ data: { id: "1" } }`
- Test 4: `list([1,2], 1, 10, 2)` returns correct pagination shape
- Test 5: `buildApp()` throws when `DATABASE_URL` missing

Plus 2 additional env validation tests (JWT_SECRET missing, JWT_SECRET too short).

---

## Self-Check: PASSED

- `Projeto/apps/api/src/app.ts` — FOUND
- `Projeto/apps/api/src/config/env.ts` — FOUND
- `Projeto/apps/api/src/routes/health.ts` — FOUND
- `Projeto/apps/api/src/lib/response.ts` — FOUND
- `Projeto/apps/api/tests/health.test.ts` — FOUND
- `Projeto/apps/api/tests/env.test.ts` — FOUND
- Commit `512ae02` — FOUND
