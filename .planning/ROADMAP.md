# Roadmap: VarzeaPro Backend

**Project:** VarzeaPro — e-sports social platform backend (apps/api)
**Milestone:** M1 — Backend v1
**Created:** 2026-03-23
**Granularity:** Fine
**Coverage:** 27/27 v1 requirements mapped

---

## Phases

- [x] **Phase 1: Foundation + Database Schema** - Fastify server running with full Drizzle schema and Docker environment (completed 2026-03-24)
- [ ] **Phase 2: Authentication + RBAC** - Users can securely log in, register, and all routes enforce role-based access
- [x] **Phase 3: Player + Team Profiles** - Players and teams can manage and view public profiles via real API (completed 2026-03-25)
- [x] **Phase 4: Search + Subscriptions** - Users can discover players/teams and manage subscription plans (completed 2026-03-25)
- [ ] **Phase 5: Real-Time Messaging** - Users can chat in real-time via WebSocket with typing indicators and presence
- [ ] **Phase 6: Admin Panel** - Admins can manage users, ban accounts, and resolve moderation reports
- [ ] **Phase 7: Security Hardening + Testing + CI/CD** - Platform passes security checklist and ships with automated tests and CI/CD

---

## Phase Details

### Phase 1: Foundation + Database Schema
**Goal**: A running Fastify server with a validated environment, full Drizzle ORM schema covering all tables, and a working Docker Compose stack
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. `GET /health` returns `200 OK` with `{ status: "ok" }` from the running API container
  2. Docker Compose brings up `web`, `api`, and `postgres` containers without errors
  3. Drizzle migrations run cleanly and all tables exist in the database (users, players, teams, conversations, messages, subscriptions, audit_logs)
  4. Invalid or missing environment variables cause the server to fail fast with a descriptive error on startup
**Plans:** 3/3 plans complete
Plans:
- [x] 01-01-PLAN.md — Fastify server scaffold with env validation, health endpoint, response helpers, and Vitest setup
- [x] 01-02-PLAN.md — Complete Drizzle ORM schema (8 tables) with enums, foreign keys, and indexes
- [x] 01-03-PLAN.md — DB plugin wiring, Docker Compose stack, API Dockerfile, and GitHub Actions CI/CD stubs

### Phase 2: Authentication + RBAC
**Goal**: Users can register, log in, and log out securely; all protected routes enforce role-based access server-side
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and choose a `player` or `team` role; profile row is created in the database
  2. User can log in and receive a secure session via HttpOnly cookie (not exposed in JSON body or sessionStorage)
  3. User can request a password reset; a token is logged to the server console (no live email)
  4. Requests to protected routes without a valid session return `401`; requests with a valid session but wrong role return `403`
  5. Auth routes (`/auth/login`, `/auth/signup`) are rate-limited to 5 requests per 15 minutes per IP
**Plans:** 2/3 plans executed
Plans:
- [x] 02-01-PLAN.md — Better Auth schema tables, auth instance, type augmentations, env config
- [x] 02-02-PLAN.md — Auth Fastify plugin, preHandler hooks, rate limiting, app.ts wiring
- [x] 02-03-PLAN.md — Integration tests for sign-up, sign-in, password reset, RBAC, rate limiting

### Phase 3: Player + Team Profiles
**Goal**: Players and teams can create, edit, and view profiles through real API endpoints that match the frontend contracts
**Depends on**: Phase 2
**Requirements**: PLAY-01, PLAY-02, PLAY-03, TEAM-01, TEAM-02, TEAM-03
**Success Criteria** (what must be TRUE):
  1. Authenticated player can `PUT /players/me` and the update persists; `GET /players/me` returns updated data
  2. Authenticated team user can `PUT /teams/me` and the update persists; `GET /teams/me` returns updated data
  3. Any authenticated user can `GET /players/:id` or `GET /teams/:id` and receive the public profile in `{ data: T }` shape
  4. Unauthenticated requests to profile endpoints return `401`
**Plans:** 3/3 plans complete
Plans:
- [x] 03-01-PLAN.md — Test scaffolding (Wave 0): profile helpers + 18 integration test cases (RED)
- [x] 03-02-PLAN.md — Player profile routes (GET/PUT /players/me, GET /players/:id) + app.ts registration
- [x] 03-03-PLAN.md — Team profile routes (GET/PUT /teams/me, GET /teams/:id) + app.ts registration

### Phase 4: Search + Subscriptions
**Goal**: Users can discover players and teams via filtered search, and subscription plan limits are enforced server-side
**Depends on**: Phase 3
**Requirements**: SRCH-01, SRCH-02, SUB-01, SUB-02, SUB-03
**Success Criteria** (what must be TRUE):
  1. `GET /search/players` with filter params returns paginated results in `{ data: T[], meta: { page, pageSize, total, totalPages } }` shape
  2. `GET /search/teams` with filter params returns paginated results in the same `meta` envelope
  3. `GET /subscription/usage` returns the authenticated user's current plan and usage counters
  4. `POST /subscription/upgrade` updates the user's plan in the database
  5. Plan-gated endpoints reject requests that exceed the user's plan limit with `403` — this check runs server-side, not client-side
**Plans:** 3/3 plans complete
Plans:
- [x] 04-01-PLAN.md — Test scaffolding (Wave 0): search.test.ts + subscription.test.ts RED stubs (SRCH-01, SRCH-02, SUB-01, SUB-02, SUB-03)
- [x] 04-02-PLAN.md — Search routes (GET /search/players, GET /search/teams) with filters, pagination, role gates, plan enforcement
- [x] 04-03-PLAN.md — Subscription routes (GET /subscription/usage, POST /subscription/upgrade) with upsert + role-plan validation

### Phase 5: Real-Time Messaging
**Goal**: Users can send and receive messages in real-time via WebSocket; typing indicators and online presence work without polling
**Depends on**: Phase 3
**Requirements**: MSG-01, MSG-02, MSG-03, MSG-04
**Success Criteria** (what must be TRUE):
  1. User can `POST /conversations` to start a conversation and `GET /conversations` to list their threads
  2. User can `GET /conversations/:id/messages` and `POST /conversations/:id/messages` to read and send messages
  3. When User A sends a message, User B receives it via Socket.io event without refreshing the page
  4. Typing indicator events fire when a user is composing; presence events reflect online/offline status
  5. Unauthenticated WebSocket connections are rejected before the connection is established (Socket.io `io.use()` middleware)
**Plans**: TBD

### Phase 6: Admin Panel
**Goal**: Admins can list users, ban accounts, view moderation reports, and take action — all gated behind role enforcement
**Depends on**: Phase 5
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04
**Success Criteria** (what must be TRUE):
  1. Admin can `GET /admin/users` to list all users and `GET /admin/users/:id` for individual detail
  2. Admin can `POST /admin/users/:id/ban` and the target account is immediately blocked from further API access
  3. Admin can `GET /admin/moderation/reports` to view the report queue
  4. Admin can `POST /admin/moderation/reports/:id` to dismiss or remove a report; the action is written to the audit_log table
  5. All `/admin/*` routes return `403` for non-admin sessions
**Plans**: TBD

### Phase 7: Security Hardening + Testing + CI/CD
**Goal**: Platform passes the full security checklist, has automated test coverage, and ships through a CI/CD pipeline
**Depends on**: Phase 6
**Requirements**: INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. Vitest integration tests cover all API domains (auth, profiles, search, messaging, subscriptions, admin) and pass in CI
  2. GitHub Actions runs `test.yml`, `build.yml`, and `deploy.yml` on push; a failing test blocks merge
  3. `@fastify/helmet`, `@fastify/rate-limit`, and `@fastify/cors` are active globally; authenticated routes use `userId` as the rate-limit key
  4. All request bodies are validated by Zod schemas; malformed requests return `400` with descriptive errors — not `500`
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Database Schema | 3/3 | Complete   | 2026-03-24 |
| 2. Authentication + RBAC | 2/3 | In Progress|  |
| 3. Player + Team Profiles | 3/3 | Complete   | 2026-03-25 |
| 4. Search + Subscriptions | 3/3 | Complete   | 2026-03-25 |
| 5. Real-Time Messaging | 0/? | Not started | - |
| 6. Admin Panel | 0/? | Not started | - |
| 7. Security Hardening + Testing + CI/CD | 0/? | Not started | - |

---

## Coverage

| Requirement | Phase |
|-------------|-------|
| INFRA-01 | Phase 1 |
| INFRA-02 | Phase 1 |
| AUTH-01 | Phase 2 |
| AUTH-02 | Phase 2 |
| AUTH-03 | Phase 2 |
| AUTH-04 | Phase 2 |
| PLAY-01 | Phase 3 |
| PLAY-02 | Phase 3 |
| PLAY-03 | Phase 3 |
| TEAM-01 | Phase 3 |
| TEAM-02 | Phase 3 |
| TEAM-03 | Phase 3 |
| SRCH-01 | Phase 4 |
| SRCH-02 | Phase 4 |
| SUB-01 | Phase 4 |
| SUB-02 | Phase 4 |
| SUB-03 | Phase 4 |
| MSG-01 | Phase 5 |
| MSG-02 | Phase 5 |
| MSG-03 | Phase 5 |
| MSG-04 | Phase 5 |
| ADM-01 | Phase 6 |
| ADM-02 | Phase 6 |
| ADM-03 | Phase 6 |
| ADM-04 | Phase 6 |
| INFRA-03 | Phase 7 |
| INFRA-04 | Phase 7 |

**Coverage: 27/27 v1 requirements mapped. No orphans.**

---
*Created: 2026-03-23*
