---
phase: "06-admin-panel"
plan: "03"
subsystem: "admin-moderation"
tags: [moderation, admin, reports, soft-delete, audit-log]
dependency_graph:
  requires: ["06-01", "06-02"]
  provides: ["ADM-03", "ADM-04"]
  affects: ["players", "teams", "messages", "audit_logs", "moderation_reports"]
tech_stack:
  added: []
  patterns: ["soft-delete boolean column", "sql template increment", "left join for reporter name"]
key_files:
  created: []
  modified:
    - Projeto/apps/api/src/routes/admin.ts
    - Projeto/apps/api/src/db/schema/players.ts
    - Projeto/apps/api/src/db/schema/teams.ts
    - Projeto/apps/api/src/db/schema/messages.ts
decisions:
  - "Apply hidden/deleted columns directly via SQL ALTER TABLE (drizzle-kit push blocked by interactive TTY prompt for unrelated unique constraint)"
  - "messages.id is bigserial — cast reportedEntityId to BigInt for message soft-delete"
  - "targetUserId lookup returns null for non-existent test entities — warnCount silently skipped (correct behavior)"
metrics:
  duration_min: 20
  completed_date: "2026-03-27"
  tasks_completed: 1
  files_modified: 4
---

# Phase 06 Plan 03: Admin Moderation Routes Summary

**One-liner:** Content moderation endpoints (list reports, dismiss/remove/warn actions) with soft-delete and audit logging wired to existing admin plugin.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add moderation report routes to admin plugin | e0bcd83 | admin.ts, players.ts, teams.ts, messages.ts |

## What Was Built

- `GET /api/admin/moderation/reports` — paginated list of moderation reports joined with users for `reporterName`, supports `status` filter (ADM-03)
- `POST /api/admin/moderation/reports/:id` — three moderation actions:
  - `dismiss` → sets report status to `dismissed`, writes `dismiss_report` audit log (D-05, D-08)
  - `remove` → soft-deletes reported entity (`hidden=true` for player/team, `deleted=true` for message), sets report to `resolved`, writes `remove_report` audit log (D-06, D-08)
  - `warn` → finds entity owner userId, increments `warnCount` via `sql` template, sets report to `resolved`, writes `warn_user` audit log (D-07, D-08)

## Schema Changes

Added boolean columns per D-06 soft-delete pattern:
- `players.hidden boolean NOT NULL DEFAULT false`
- `teams.hidden boolean NOT NULL DEFAULT false`
- `messages.deleted boolean NOT NULL DEFAULT false`

Applied via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` directly against both `varzeapro` and `varzeapro_test` databases (drizzle-kit push was blocked by an interactive TTY prompt for an unrelated unique constraint on conversations).

## Verification

Full test suite: **144 tests across 15 test files — all GREEN**
Admin test file: **31 tests — all GREEN** (ADM-01 through ADM-04)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Schema Fields] Added hidden/deleted boolean columns to players, teams, messages**
- **Found during:** Task 1 — plan noted schema fields might not exist and to check
- **Issue:** players, teams, and messages tables had no `hidden` / `deleted` boolean columns required for D-06 soft-delete
- **Fix:** Added `hidden boolean NOT NULL DEFAULT false` to players and teams; `deleted boolean NOT NULL DEFAULT false` to messages; applied via direct SQL ALTER TABLE to both dev and test DBs
- **Files modified:** players.ts, teams.ts, messages.ts
- **Commit:** e0bcd83

**2. [Rule 3 - Blocking Issue] Applied migrations via direct SQL (drizzle-kit push blocked)**
- **Found during:** Task 1 — attempted `npx drizzle-kit push`
- **Issue:** drizzle-kit required interactive TTY for an unrelated unique constraint confirmation on conversations table
- **Fix:** Applied new columns directly via `psql ALTER TABLE` against both databases
- **Commit:** e0bcd83

## Known Stubs

None — all data is wired to live database queries.

## Self-Check: PASSED

- `Projeto/apps/api/src/routes/admin.ts` — exists, contains moderation routes
- Commit e0bcd83 — verified in git log
- 144/144 tests pass
