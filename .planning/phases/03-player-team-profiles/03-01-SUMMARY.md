---
phase: 03-player-team-profiles
plan: "01"
subsystem: api-tests
tags: [testing, tdd, players, teams, wave-0]
dependency_graph:
  requires: []
  provides: [player-profile-tests, team-profile-tests, profile-test-helpers]
  affects: [03-02-PLAN, 03-03-PLAN]
tech_stack:
  added: []
  patterns: [vitest-integration-tests, fastify-inject, beforeAll-afterAll-lifecycle]
key_files:
  created:
    - Projeto/apps/api/tests/helpers/profile-helpers.ts
    - Projeto/apps/api/tests/routes/players.test.ts
    - Projeto/apps/api/tests/routes/teams.test.ts
  modified: []
decisions:
  - "Wave 0 test scaffolding written RED — routes absent, tests fail with exit code 1 as expected"
  - "signUpAndGetCookie wraps signUpUser with role override; returns cookie, email, password"
  - "upsertPlayerProfile and upsertTeamProfile accept overrides to support idempotency tests"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-24"
  tasks_completed: 3
  files_created: 3
---

# Phase 3 Plan 1: Profile Test Scaffolding (Wave 0) Summary

**One-liner:** RED integration test suite for player and team profile endpoints — 18 test cases covering PLAY-01/02/03 and TEAM-01/02/03 using Fastify inject + Vitest.

## What Was Built

Three files created as Wave 0 test scaffolding for Phase 3:

1. `tests/helpers/profile-helpers.ts` — Shared helpers: `signUpAndGetCookie`, `playerProfilePayload`, `teamProfilePayload`, `upsertPlayerProfile`, `upsertTeamProfile`.
2. `tests/routes/players.test.ts` — 9 test cases: PUT /api/players/me (4), GET /api/players/me (3), GET /api/players/:id (3).
3. `tests/routes/teams.test.ts` — 9 test cases: PUT /api/teams/me (4), GET /api/teams/me (3), GET /api/teams/:id (3).

## Test Coverage

| Requirement | Tests | Status |
|-------------|-------|--------|
| PLAY-01 PUT /players/me | PLAY-01a/b/c/d | RED |
| PLAY-02 GET /players/me | PLAY-02a/b/c | RED |
| PLAY-03 GET /players/:id | PLAY-03a/b/c | RED |
| TEAM-01 PUT /teams/me | TEAM-01a/b/c/d | RED |
| TEAM-02 GET /teams/me | TEAM-02a/b/c | RED |
| TEAM-03 GET /teams/:id | TEAM-03a/b/c | RED |

Tests will turn GREEN when Plans 02 and 03 implement the routes.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates test files only, no application code.

## Self-Check: PASSED
