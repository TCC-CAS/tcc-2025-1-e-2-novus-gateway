# Project Research Summary

**Project:** VarzeaPro Backend (apps/api)
**Domain:** E-sports social platform — REST API + real-time messaging backend
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

VarzeaPro is an e-sports social platform that requires a TypeScript-first backend serving 8 API domains: authentication, player profiles, team profiles, search/discovery, real-time messaging, subscriptions, and admin moderation. The recommended approach is a layered plugin-based Fastify monolith where HTTP and Socket.io share the same Node.js `http.Server`, Drizzle ORM handles all database access as a Fastify decorator, and Better Auth manages sessions with bearer token support. This architecture is well-documented, avoids operational complexity, and fits a single-VPS TCC deployment without requiring Redis, Elasticsearch, or any additional infrastructure services.

The most important design constraint is that the existing frontend was built against MSW mocks and already encodes a specific API contract: all responses must use `{ data: T }` for single items and `{ data: T[], meta: { page, pageSize, total, totalPages } }` for lists; auth uses `Authorization: Bearer` headers with the JWT stored in `sessionStorage`. This contract is non-negotiable and must drive backend implementation from Phase 1. The one required frontend change is migrating from `sessionStorage` JWT to HttpOnly cookies — the current approach is a critical XSS vulnerability that cannot be deferred.

The top risks are all security-related and stem from the frontend's existing patterns being copied naively into the backend: JWT exposed in JavaScript-accessible storage, WebSocket connections accepted without authentication, roles trusted from cookie content without cryptographic verification, and plan limits enforced only client-side. All four of these must be corrected in the earliest applicable phase — they become exponentially harder to retrofit after integration.

---

## Key Findings

### Recommended Stack

The stack is fully determined by project constraints and verified against npm registry (2026-03-23). Fastify 5.x is the HTTP framework (non-negotiable), Node.js 20 LTS is the runtime, and TypeScript 5.x in strict mode is the language. For the database layer, Drizzle ORM 0.45.1 over PostgreSQL 16 is the clear choice: pure TypeScript (no Rust binary), SQL-transparent queries, zero codegen step, and instant type inference when the schema changes. Better Auth 1.5.6 handles authentication with an official Fastify integration guide; `@fastify/jwt` handles Bearer token verification for frontend compatibility. Socket.io 4.8.3 via `fastify-socket.io` provides real-time messaging on the same HTTP server port.

Zod is already used in the frontend's `~shared/contracts` package — the backend reuses the same schemas via `fastify-type-provider-zod`, eliminating schema duplication. Security middleware is covered by `@fastify/helmet`, `@fastify/rate-limit`, and `@fastify/cors`. Vitest handles testing with Fastify's `inject()` method enabling in-process integration tests without a live server.

**Core technologies:**
- Fastify 5.8.4: HTTP server — TypeScript-native, schema-based validation, plugin system
- Drizzle ORM 0.45.1: database access — pure TS, SQL-transparent, no codegen
- Better Auth 1.5.6: authentication — official Fastify integration, RBAC, sessions built-in
- Socket.io 4.8.3 + fastify-socket.io: real-time — room management, shared http.Server
- Zod 4.3 + fastify-type-provider-zod: validation — reuse frontend shared contracts
- PostgreSQL 16: primary data store — relational model required for data relationships

### Expected Features

The backend must serve 8 API modules already defined by the frontend. Auth is the root dependency — every other module requires JWT validation. Player and team profiles are the core data model. Search with pagination is the primary value proposition. Real-time messaging (REST + Socket.io) is the most technically complex module. Subscriptions and admin panel are supporting modules.

**Must have (table stakes):**
- Auth: login, signup, JWT middleware, RBAC (player/team/admin roles)
- Player + Team CRUD: `/players/me`, `/teams/me`, public profile views
- Search: paginated player and team lists with filter params, matching `meta` contract
- Messaging: conversation CRUD + Socket.io real-time delivery, typing indicators, presence
- Admin: user management, ban, moderation reports, audit log
- Subscriptions: usage read, plan upgrade write

**Should have (differentiators for TCC quality):**
- Audit log table with full admin action trail
- Socket.io JWT auth on connection handshake
- PostgreSQL `pg_trgm` full-text search (GIN index) for better search quality
- OpenAPI/Swagger docs via fastify-swagger (auto-generated from Zod schemas)
- Structured Pino logging with request correlation IDs
- Server-side plan limit enforcement (not just frontend gates)

**Defer (post-MVP / v2+):**
- Refresh token rotation (implement basic JWT first)
- Live email delivery (log reset tokens to console for TCC)
- Redis for Socket.io scaling (single-node is sufficient for TCC scale)
- File/image upload (accept URL strings for avatars)
- OAuth / social login
- Message read receipts

### Architecture Approach

The recommended architecture is a layered plugin-based monolith: Fastify owns the HTTP lifecycle, Socket.io shares the underlying `http.Server` via `fastify-socket.io`, Better Auth attaches as a catch-all route plugin, and Drizzle ORM is injected as a `fastify.db` decorator so all routes and services access a single typed database handle. Route handlers are thin — they call service functions, never contain DB queries directly. Response shaping uses two envelope helpers (`ok(data)` and `list(data, meta)`) applied consistently across all handlers.

**Major components:**
1. `src/app.ts` + `src/server.ts` — Fastify factory and HTTP server bootstrap (separated for testability)
2. `src/plugins/` — db decorator, auth registration, socket registration, cors, rate-limit
3. `src/routes/` — per-domain route files registered with prefixes via `@fastify/autoload`
4. `src/services/` — business logic and DB queries; one service per domain
5. `src/gateways/messaging.gateway.ts` — Socket.io event handlers for chat, typing, presence
6. `src/middleware/rbac.ts` — `requireAuth` and `requireRole` preHandler hook factories
7. `src/db/schema/` — Drizzle table definitions (single source of truth for DB shape)
8. `src/lib/response.ts` — `ok()` and `list()` envelope helpers enforced globally

### Critical Pitfalls

1. **JWT in sessionStorage (XSS risk, already in codebase)** — Issue JWT exclusively as HttpOnly; Secure; SameSite=Strict cookies. Never return raw JWT in JSON body. Requires one frontend change: replace `Authorization: Bearer` with `credentials: 'include'` in `api-client.ts`.

2. **WebSocket connections not authenticated** — Fastify `preHandler` hooks do not apply to Socket.io. Register `io.use(async (socket, next) => { ... })` middleware to validate JWT on every connection before `next()`. Reject unauthenticated sockets with `socket.disconnect()`.

3. **Role escalation via unsigned cookie (already in codebase)** — The existing frontend parses `varzeapro_session` as raw JSON without signature verification. Backend must use Better Auth's DB-backed sessions — role is read from the DB row, never trusted from cookie content.

4. **Plan enforcement is client-side only (already in codebase)** — `PlanProvider` and `PlanGate` in the frontend can be bypassed with DevTools. Every plan-gated endpoint needs a `checkPlanLimit(userId, feature)` service call before executing.

5. **Contract mismatch between frontend types and backend responses** — The frontend contract (`~shared/contracts`) is the API spec. Every response shape must match. Run the frontend against the real API with `VITE_USE_MOCK=false` before marking any endpoint done.

---

## Implications for Roadmap

Based on combined research, the build order follows a strict dependency chain. Auth gates everything; profiles gate search and messaging; the DB schema must be complete before any service is written. Security concerns identified in PITFALLS.md must be addressed in the phase where they first appear — not deferred to a "hardening" phase.

### Phase 1: Foundation + Database Schema
**Rationale:** Every other phase depends on the Fastify server being bootstrapped and the full DB schema existing. Drizzle migrations must cover all tables from the start — retrofitting schema is disruptive.
**Delivers:** Running Fastify server with health check, typed config validation, all Drizzle table definitions, initial migration, and seed script.
**Addresses:** Server bootstrap, env validation, schema definition for users, players, teams, conversations, messages, subscriptions, audit_logs.
**Avoids:** Pitfall 3 (race conditions) by using `BIGSERIAL` IDs from the start; Pitfall 8 (Docker secrets) by configuring `.env` + `.gitignore` from day one.

### Phase 2: Authentication + RBAC
**Rationale:** Auth is the root dependency. JWT middleware must exist before any protected route can be built. The security issues in the existing codebase (Pitfalls 1, 4) must be corrected here, not later.
**Delivers:** Better Auth with cookie session mode, `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `requireAuth`/`requireRole` preHandler factories, RBAC enforcement end-to-end.
**Addresses:** Auth table stakes, password hashing, ban check on login, rate limiting on auth routes (5 req/15 min).
**Avoids:** Pitfall 1 (JWT in sessionStorage — use HttpOnly cookie), Pitfall 4 (unsigned cookie role escalation — use Better Auth DB sessions), Pitfall 5 (CORS — configure explicit origin allowlist).

### Phase 3: Core REST Domains (Profiles + Search + Subscriptions)
**Rationale:** Player and team profiles are the data the platform runs on. Search is the primary value proposition. These three domains share the same service pattern and can be built together before introducing Socket.io complexity.
**Delivers:** Player + Team CRUD routes and services, Search with pagination matching the `{ data, meta }` contract, Subscription usage read and plan upgrade.
**Addresses:** playersApi, teamsApi, searchApi, subscriptionApi table stakes; paginated response contract; server-side plan limit enforcement (Pitfall 6).
**Avoids:** Pitfall 7 (SQL injection — allowlist sort fields), Pitfall 10 (contract mismatch — validate response shapes against shared contracts).

### Phase 4: Real-Time Messaging
**Rationale:** Messaging is the most technically complex module. It depends on auth (Phase 2) and conversation data model (Phase 1). Socket.io integration is isolated here to avoid complicating earlier phases.
**Delivers:** `fastify-socket.io` plugin, Socket.io JWT auth middleware, MessagingGateway (message:send, typing indicators, presence), REST conversation + message endpoints, MessagingService with DB transactions.
**Addresses:** messagingApi table stakes, real-time delivery, conversation room isolation.
**Avoids:** Pitfall 2 (unauthenticated WebSocket — `io.use()` middleware mandatory), Pitfall 3 (race conditions — wrap message insert + conversation update in a transaction), conversation membership check on every room join.

### Phase 5: Admin Panel
**Rationale:** Admin functionality depends on all other domains. It is lower priority than core user-facing features and can be built after the platform is functional.
**Delivers:** Admin user list, ban action, moderation report queue, report resolution, audit log writes on every admin mutation.
**Addresses:** adminUsersApi, adminModerationApi; 403 guard on all `/admin/*` routes; audit trail as TCC security demonstration.
**Avoids:** Pitfall 4 (role check from DB-backed session, not JWT claim) on admin routes specifically.

### Phase 6: Security Hardening + Testing + CI/CD
**Rationale:** After all features are wired, verify the full security surface and add automated tests. This phase validates the "Looks Done But Isn't" checklist from PITFALLS.md.
**Delivers:** Global + per-route rate limiting, `@fastify/helmet`, Zod validation on all request bodies, Vitest unit + integration tests, GitHub Actions CI, Docker Compose multi-stage production build.
**Addresses:** Pitfall 9 (rate limiting bypass via proxy — use `userId` as key on authenticated routes), Pitfall 5 (CORS verification in Docker Compose environment).
**Avoids:** All pitfalls via the 10-point verification checklist.

### Phase Ordering Rationale

- Auth before everything: JWT middleware is a prerequisite for every protected route.
- Full schema before services: Drizzle migrations must be stable before services query them; retrofitting schema disrupts all downstream code.
- REST before Socket.io: The messaging REST layer (conversation creation) must exist before the Socket.io gateway can reference conversation IDs.
- Admin last: Admin depends on all user-facing data existing and all security primitives being in place.
- Security in every phase, not just the last: The PITFALLS research is explicit that Pitfalls 1, 2, 4 cannot be retrofitted — they must be addressed in the phase where the feature is first built.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Auth):** Better Auth's bearer plugin + cookie session configuration with Fastify is community-documented; the `fastify-better-auth` plugin is a community plugin (MEDIUM confidence) — verify active maintenance and exact registration API before implementation.
- **Phase 4 (Real-Time Messaging):** Socket.io `io.use()` middleware interaction with `fastify-socket.io` decorator lifecycle needs verification; ensure `fastify.io` is only accessed after `await fastify.ready()`.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Fastify bootstrap, Drizzle ORM setup, and `@fastify/env` config are HIGH confidence with official documentation.
- **Phase 3 (REST Domains):** Route/service/Drizzle query pattern is well-established; Zod + `fastify-type-provider-zod` integration is HIGH confidence.
- **Phase 6 (Hardening):** `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors` are all official Fastify plugins with HIGH confidence documentation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry 2026-03-23; integrations verified against official docs |
| Features | HIGH | Frontend contracts define the exact API surface; no ambiguity about what must be built |
| Architecture | HIGH | Fastify plugin patterns, Drizzle decorator, Socket.io shared server — all from official docs |
| Pitfalls | HIGH | Several pitfalls identified from direct codebase analysis (sessionStorage JWT, unsigned cookie, client-only plan gates) — not theoretical |

**Overall confidence:** HIGH

### Gaps to Address

- **fastify-better-auth community plugin:** Verify active maintenance status and exact Fastify 5 compatibility before adopting. Fallback: implement Better Auth as a manual catch-all route handler (`fastify.all('/api/auth/*', auth.handler)`).
- **Shared contracts package location:** Frontend contracts live in `apps/web/shared/contracts/`. The recommended approach is moving them to a `packages/shared` monorepo package shared by both `apps/web` and `apps/api`. This refactor should happen in Phase 1 — if deferred, schema duplication risk grows.
- **Frontend migration to cookie auth:** One change is required in the frontend (`api-client.ts`: replace `Authorization: Bearer` with `credentials: 'include'`). This must be coordinated with Phase 2 delivery — the backend cookie auth and frontend cookie consumption must be deployed together.

---

## Sources

### Primary (HIGH confidence)
- [Fastify TypeScript docs](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify)
- [Drizzle ORM PostgreSQL guide](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [fastify-socket.io plugin](https://github.com/ducktors/fastify-socket.io)
- [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod)
- [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit)
- [@fastify/helmet](https://github.com/fastify/fastify-helmet)
- [Socket.IO server initialization](https://socket.io/docs/v4/server-initialization/)
- npm registry version verification — 2026-03-23
- OWASP Top 10 — A01, A02, A03, A05 (pitfalls mapping)
- Direct codebase analysis (CONCERNS.md, existing frontend patterns)

### Secondary (MEDIUM confidence)
- [fastify-better-auth community plugin](https://github.com/flaviodelgrosso/fastify-better-auth) — community plugin, verify maintenance
- [Socket.IO real-time patterns 2026](https://dev.to/abanoubkerols/socketio-the-complete-guide-to-building-real-time-web-applications-2026-edition-c7h)
- [RBAC in Node.js](https://dev.to/young_gao/role-based-access-control-rbac-in-nodejs-beyond-simple-admin-checks-1ea9)
- [Drizzle vs Prisma 2026 comparison](https://www.bytebase.com/blog/drizzle-vs-prisma/)

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
