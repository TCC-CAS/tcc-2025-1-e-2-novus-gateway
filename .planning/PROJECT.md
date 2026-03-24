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

### Active

- [ ] Fastify + Node.js backend API (`apps/api/`) with all endpoints matching client contracts
- [ ] PostgreSQL database with schema for users, players, teams, conversations, messages, subscriptions, audit_logs
- [ ] Better Auth integration — JWT sessions, RBAC enforcement (`player` / `team` / `admin`), HttpOnly cookies
- [ ] Real-time messaging via WebSockets (Socket.io) — live message delivery, typing indicators, presence
- [ ] Security hardening — rate limiting, DDoS protection, input validation, XSS prevention, race condition guards
- [ ] Automated test suite — backend unit + integration tests (Vitest or Jest)
- [ ] CI/CD pipeline — GitHub Actions (test.yml, build.yml, deploy.yml)
- [ ] Docker Compose deployment — `apps/web` + `apps/api` + PostgreSQL on a single VPS

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
| Fastify over Express/NestJS | Faster, leaner, TypeScript-native, good plugin ecosystem | — Pending |
| Better Auth for backend auth | Modern library, built-in RBAC, JWT + session management | — Pending |
| PostgreSQL over MongoDB | Relational data model (users↔teams↔subscriptions↔messages) | — Pending |
| Socket.io for WebSockets | Room management, reconnection, fallback — simplifies real-time chat | — Pending |
| Docker Compose for deployment | Single-server TCC deployment, matches academic constraints | — Pending |
| Keep frontend contracts stable | Frontend is done — backend adapts to frontend types, not vice versa | — Pending |

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
*Last updated: 2026-03-23 after initialization*
