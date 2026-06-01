---
phase: 01-foundation-database-schema
plan: 03
subsystem: infrastructure
tags: [docker, drizzle, fastify, ci-cd, migrations]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [containerized-stack, db-plugin, initial-migration, ci-cd-stubs]
  affects: [all-phases]
tech_stack:
  added: [postgres:16-alpine, docker-compose, github-actions]
  patterns: [fastify-plugin-decorator, multi-stage-dockerfile, healthcheck-dependency]
key_files:
  created:
    - Projeto/apps/api/src/plugins/db.ts
    - Projeto/apps/api/Dockerfile
    - Projeto/apps/api/.env.example
    - Projeto/apps/api/src/db/migrations/0000_eminent_galactus.sql
    - Projeto/apps/api/src/db/migrations/meta/0000_snapshot.json
    - Projeto/apps/api/src/db/migrations/meta/_journal.json
    - Projeto/docker-compose.yml
    - Projeto/.env.example
    - Projeto/.gitignore
    - .github/workflows/test.yml
    - .github/workflows/build.yml
    - .github/workflows/deploy.yml
  modified:
    - Projeto/apps/api/src/app.ts
decisions:
  - Drizzle migration output to src/db/migrations per existing drizzle.config.ts
  - DB plugin registered after env, before cors — ensures fastify.config available
  - No ARG for secrets in Dockerfile — injected at runtime via env_file
  - Postgres healthcheck with pg_isready before api starts (service_healthy)
metrics:
  duration_minutes: 12
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_created: 12
  files_modified: 1
---

# Phase 01 Plan 03: Infrastructure Wiring Summary

**One-liner:** Drizzle DB plugin wired into Fastify via fastify-plugin decorator, multi-stage Dockerfile and 3-service Docker Compose stack with postgres healthcheck, initial SQL migration for 8 tables, and GitHub Actions CI/CD stubs.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB plugin, Dockerfile, Docker Compose, migration | 5208227 | db.ts, app.ts, Dockerfile, docker-compose.yml, .env.example, migration SQL |
| 2 | GitHub Actions CI/CD pipeline stubs | 1c50ae5 | test.yml, build.yml, deploy.yml |

---

## What Was Built

### DB Plugin (`src/plugins/db.ts`)
Creates a typed `fastify.db` decorator using `drizzle-orm/postgres-js` with the full 8-table schema. Wrapped with `fastify-plugin` so the decorator is visible outside plugin scope. Registers an `onClose` hook to gracefully end the postgres connection.

### app.ts Registration Order
```
env -> db -> cors -> sensible -> errorHandler -> routes
```
DB plugin comes after env (needs `fastify.config.DATABASE_URL`) and before routes (so handlers can access `fastify.db`).

### Dockerfile
Multi-stage build: `deps` (production deps only) → `builder` (full deps + tsc compile) → `runner` (copies node_modules from deps + dist from builder). No secrets in ARG layers.

### Docker Compose
- `postgres`: postgres:16-alpine with `pg_isready` healthcheck, named volume
- `api`: waits for `postgres` with `condition: service_healthy`, reads `.env` via `env_file`
- `web`: depends on `api`, exposes port 5173

### Initial Migration
`0000_eminent_galactus.sql` — 8 tables, all enums, FK constraints, and indexes generated from the Drizzle schema.

### CI/CD Stubs
- **test.yml**: Postgres service container, `drizzle-kit migrate`, `npm test` with full env
- **build.yml**: `npm run build` (TypeScript compile) + `docker compose build`
- **deploy.yml**: Placeholder stub — full VPS deployment configured in Phase 7

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

- `.github/workflows/deploy.yml`: Contains placeholder echo step. Intentional — full VPS deployment deferred to Phase 7 per plan design.

---

## Self-Check: PASSED

- [x] `Projeto/apps/api/src/plugins/db.ts` — created
- [x] `Projeto/apps/api/src/app.ts` — contains `plugins/db.js` registration
- [x] `Projeto/apps/api/Dockerfile` — created, no ARG secrets
- [x] `Projeto/docker-compose.yml` — created, contains `service_healthy`
- [x] `Projeto/apps/api/src/db/migrations/0000_eminent_galactus.sql` — generated
- [x] `.github/workflows/test.yml` — created
- [x] `.github/workflows/build.yml` — created
- [x] `.github/workflows/deploy.yml` — created
- [x] Commits 5208227 and 1c50ae5 exist
