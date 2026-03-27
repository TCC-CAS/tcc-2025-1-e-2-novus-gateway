# VarzeaPro

## What This Is

VarzeaPro is a social platform for e-sports that connects competitive players and teams — think "LinkedIn meets Discord" for the Brazilian competitive gaming scene. Users create public profiles, discover teammates and organizations through advanced search, communicate via real-time chat, and unlock features through tiered subscription plans.

## Core Value

**Players and teams find each other fast** — every other feature (subscriptions, moderation, admin) exists to make that discovery trustworthy and sustainable.

## Requirements

### Validated

- ✓ Complete UI/UX (landing, dashboards, all forms, dark/light theme) — existing
- ✓ Authentication UI (login, signup, password reset flows) — existing
- ✓ Role-based routing and navigation (`player`, `team`, `admin`) — existing
- ✓ Player profile management UI (create, view, edit) — existing
- ✓ Team profile management UI (create, view, edit) — existing
- ✓ Advanced search UI (players and teams with filters) — existing
- ✓ Messaging/conversations UI (conversation list + message thread) — existing
- ✓ Subscription management UI + plan-gated features — existing
- ✓ Admin panel UI (user management, content moderation) — existing
- ✓ Shared type contracts (`~shared/contracts`) covering all API domains — existing
- ✓ MSW mock layer covering every backend endpoint — existing
- ✓ React Router v7 framework mode with client-side auth — existing
- ✓ shadcn/ui component library (50+ components) — existing
- ✓ Fastify 5 server scaffold with Zod env validation, CORS, health endpoint, error handler — Validated in Phase 1
- ✓ PostgreSQL schema (8 Drizzle ORM tables: users, players, teams, conversations, messages, subscriptions, audit_logs, moderation_reports) — Validated in Phase 1
- ✓ Docker Compose stack (postgres + api + web with healthchecks) — Validated in Phase 1
- ✓ CI/CD pipeline stubs (test.yml, build.yml, deploy.yml) — Validated in Phase 1
- ✓ Vitest test infrastructure (28 passing tests across scaffold + schema) — Validated in Phase 1
- ✓ Better Auth integration — HttpOnly cookie sessions, email/password, admin plugin, role injection hook (AUTH-01–04) — Validated in Phase 2
- ✓ Fastify auth + rate-limit plugins, `requireAuth`/`requireRole` preHandler hooks, auth routes at `/api/auth/*` — Validated in Phase 2
- ✓ Integration test suite covering sign-up, sign-in, password reset stub, RBAC enforcement, rate limiting — Validated in Phase 2
- ✓ Player profile REST endpoints (GET/PUT /api/players/me, GET /api/players/:id) with RBAC, upsert, 404 handling — Validated in Phase 3
- ✓ Team profile REST endpoints (GET/PUT /api/teams/me, GET /api/teams/:id) with RBAC, upsert, 404 handling — Validated in Phase 3
- ✓ 20 profile integration tests passing (PLAY-01/02/03, TEAM-01/02/03) — Validated in Phase 3
- ✓ Search endpoints (`GET /api/search/players`, `GET /api/search/teams`) with role gates, plan limits, self-exclusion, filtering, pagination (SRCH-01, SRCH-02) — Validated in Phase 4
- ✓ Subscription endpoints (`GET /api/subscription/usage`, `POST /api/subscription/upgrade`) with upsert, role-plan validation (SUB-01, SUB-02) — Validated in Phase 4
- ✓ Plan-based search result limits enforced server-side (free team capped at 10) (SUB-03) — Validated in Phase 4
- ✓ Email-keyed rate limiting (preHandler hook) — avoids IP collisions in test suites — Validated in Phase 4
- ✓ Admin user management routes (list, detail, ban, unban) with RBAC and audit logging (ADM-01, ADM-02) — Validated in Phase 6
- ✓ Content moderation routes (list reports, dismiss/remove/warn actions) with soft-delete and warnCount (ADM-03, ADM-04) — Validated in Phase 6
- ✓ Ban enforcement in requireSession hook — banned users blocked on every request (D-02) — Validated in Phase 6

### Active

- [ ] Fastify + Node.js backend API (`apps/api/`) with all endpoints matching client contracts
- [ ] Real-time messaging via WebSockets (Socket.io) — live message delivery, typing indicators, presence
- [ ] Security hardening — rate limiting, DDoS protection, input validation, XSS prevention, race condition guards

### Out of Scope

- Mobile app — not mentioned, web-only for this TCC
- Email delivery — password reset can use a stub/log; live email delivery is post-TCC
- Video/streaming features — out of scope for v1
- Multiple games / game-specific data — platform is game-agnostic in v1
- Payments / real billing — subscription plans are enforced in code; no payment gateway for TCC

## Context

- **Frontend complete:** `Projeto/apps/web/` is 100% done. Do not change frontend code unless fixing an integration contract mismatch.
- **Shared contracts:** All API types live at `Projeto/apps/web/shared/contracts/`. The backend MUST match these shapes — `{ data: T }` for single items, `{ data: T[], meta: { page, pageSize, total, totalPages } }` for lists.
- **API surface:** Fully mapped in `api-client.ts`. Every exported module (`authApi`, `playersApi`, `teamsApi`, `searchApi`, `messagingApi`, `adminUsersApi`, `adminModerationApi`, `subscriptionApi`) needs a real handler.
- **Auth:** Frontend uses `Authorization: Bearer <token>` header + sessionStorage. Backend must issue JWTs and validate on every protected route.
- **Monorepo structure:** `Projeto/apps/web` (done), `Projeto/apps/api` (to build), `Projeto/packages/shared` (type contracts — move here eventually).
- **TCC context:** This is an academic final project (TCC). Production-ready means: deployed, tested, documented, and demonstrably secure.

## Constraints

- **Tech Stack**: Fastify + Node.js + TypeScript for backend — decided and non-negotiable
- **Database**: PostgreSQL — relational model fits the domain (users, teams, subscriptions, audit)
- **Auth**: Better Auth library — fresh choice, frontend auth flows will adapt to its session shape
- **Real-time**: WebSockets (Socket.io preferred for room management) — full live chat required
- **Deployment**: VPS via Docker Compose — single server, all services containerized
- **Contract Fidelity**: Backend response shapes must match `~shared/contracts` exactly — frontend is not getting rewritten
- **Security**: Rate limiting on all public endpoints, input validation (Zod), HttpOnly cookies for auth tokens, protection against DDoS/XSS/race conditions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fastify over Express/NestJS | Faster, leaner, TypeScript-native, good plugin ecosystem | ✓ Fastify 5 scaffold proven in Phase 1 — plugin system, ZodTypeProvider, env validation all working |
| Better Auth for backend auth | Modern library, built-in RBAC, session management, HttpOnly cookies | ✓ Drizzle adapter, email/password, admin plugin, role injection hook — all proven in Phase 2 |
| PostgreSQL over MongoDB | Relational data model (users↔teams↔subscriptions↔messages) | ✓ Drizzle ORM schema with 8 tables and initial migration proven in Phase 1 |
| Socket.io for WebSockets | Room management, reconnection, fallback — simplifies real-time chat | — Phase 5 |
| Docker Compose for deployment | Single-server TCC deployment, matches academic constraints | ✓ docker-compose.yml with healthchecks working in Phase 1 |
| Keep frontend contracts stable | Frontend is done — backend adapts to frontend types, not vice versa | ✓ Drizzle schema derived directly from shared contracts in Phase 1 |
| `messages.id` uses bigserial | Race condition prevention for message IDs (DB sequence, not app-generated) | ✓ Implemented in Phase 1 — PgBigSerial64 with mode: "bigint" |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 — Phase 6 (admin-panel) complete*
