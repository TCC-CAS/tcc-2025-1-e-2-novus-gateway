---
phase: 02-authentication-rbac
plan: "02"
subsystem: auth
tags: [better-auth, fastify, rate-limit, rbac, prehandler]
dependency_graph:
  requires: ["02-01"]
  provides: ["auth-routes", "require-session", "require-role"]
  affects: ["all-protected-routes"]
tech_stack:
  added: ["@fastify/rate-limit"]
  patterns: ["reply.hijack() before toNodeHandler", "preHandler factory pattern", "fastify-plugin dependency chain"]
key_files:
  created:
    - Projeto/apps/api/src/plugins/auth.ts
    - Projeto/apps/api/src/plugins/rate-limit.ts
    - Projeto/apps/api/src/hooks/require-auth.ts
  modified:
    - Projeto/apps/api/src/app.ts
decisions:
  - "Use reply.hijack() before toNodeHandler to prevent Fastify 5 double-send errors"
  - "Cast user to Record<string, unknown> to access admin plugin role field not in base User type"
  - "Register sign-in/sign-up as explicit routes before catch-all so rate limiting applies selectively"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 02 Plan 02: Auth Plugin Wiring Summary

**One-liner:** Better Auth wired into Fastify 5 via toNodeHandler with reply.hijack(), per-route rate limiting on sign-in/sign-up (5 req/15min), and reusable requireSession/requireRole preHandler factories.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create auth plugin, rate-limit plugin, and preHandler hooks | 56880db | plugins/auth.ts, plugins/rate-limit.ts, hooks/require-auth.ts |
| 2 | Wire plugins into app.ts and add protected test routes | 19c4d63 | app.ts, hooks/require-auth.ts (fix) |

---

## What Was Built

- **`src/plugins/rate-limit.ts`** — Registers `@fastify/rate-limit` with `global: false` so rate limits are opt-in per route.
- **`src/plugins/auth.ts`** — Decorates `fastify.auth`, registers rate-limited POST routes for sign-in/sign-up, and registers a catch-all `fastify.all("/api/auth/*")` for all other Better Auth routes. All handlers call `reply.hijack()` before `toNodeHandler(auth)`.
- **`src/hooks/require-auth.ts`** — Exports `requireSession` (returns 401 if no session) and `requireRole(...roles)` factory (returns 403 if role not in allowed list).
- **`src/app.ts`** — Plugin registration order: env → db → cors → sensible → rate-limit → auth → errorHandler → routes. Added `GET /api/me` (requireSession) and `GET /api/admin/test` (requireRole("admin")) for integration test verification.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: `role` not on base Better Auth `User` type**
- **Found during:** Task 2 TypeScript check
- **Issue:** `request.session?.user?.role` fails because `User` from `better-auth/types` does not include `role` — that field is added dynamically by the `admin()` plugin at runtime
- **Fix:** Cast `request.session?.user` to `Record<string, unknown>` when reading the role property in `requireRole`
- **Files modified:** `Projeto/apps/api/src/hooks/require-auth.ts`
- **Commit:** 19c4d63

---

## Known Stubs

None. All routes are wired to real Better Auth handlers.

---

## Self-Check: PASSED

- `Projeto/apps/api/src/plugins/auth.ts` — exists, contains toNodeHandler, reply.hijack, rate limit config
- `Projeto/apps/api/src/plugins/rate-limit.ts` — exists, contains global: false
- `Projeto/apps/api/src/hooks/require-auth.ts` — exists, exports requireSession and requireRole
- `Projeto/apps/api/src/app.ts` — modified, contains plugins/auth, plugins/rate-limit, /api/me, /api/admin/test
- Commits 56880db and 19c4d63 verified in git log
