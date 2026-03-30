---
phase: 03-player-team-profiles
plan: "03"
subsystem: backend-api
tags: [teams, profile, fastify, drizzle, routes]
dependency_graph:
  requires: [03-02]
  provides: [TEAM-01, TEAM-02, TEAM-03]
  affects: []
tech_stack:
  added: []
  patterns: [fastify-plugin, drizzle-upsert, requireRole, requireSession]
key_files:
  created:
    - Projeto/apps/api/src/routes/teams.ts
  modified:
    - Projeto/apps/api/src/app.ts
decisions:
  - "Mirrored players.ts exactly — same upsert pattern, same Date.toISOString() serialization, same error shapes"
  - "teams.userId used as upsert conflict target (unique constraint)"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 2
---

# Phase 03 Plan 03: Team Profile Routes Summary

**One-liner:** Fastify teams plugin with GET/PUT /me and GET /:id using Drizzle upsert and role-based auth guards.

## What Was Built

Three REST endpoints registered at `/api/teams`:

- `GET /api/teams/me` — requireRole("team"), returns `{ data: TeamProfile }` or 404
- `PUT /api/teams/me` — requireRole("team"), upsert via `onConflictDoUpdate({ target: teams.userId })`, returns `{ data: TeamProfile }`
- `GET /api/teams/:id` — requireSession (any auth role), returns `{ data: TeamProfile }` or 404

## Test Results

- teams.test.ts: **10/10 PASS**
- players.test.ts: unaffected (no regression)
- Pre-existing auth test failures (sign-in/sign-up token exposure) are out of scope — these existed before this plan

## Deviations from Plan

None — plan executed exactly as written. The players.ts mirror approach worked without modification.

## Known Stubs

None.

## Self-Check

- [x] `Projeto/apps/api/src/routes/teams.ts` exists
- [x] `Projeto/apps/api/src/app.ts` contains `routes/teams.js` registration
- [x] Commits 84636aa and cf912bf exist
- [x] 10 teams tests pass

## Self-Check: PASSED
