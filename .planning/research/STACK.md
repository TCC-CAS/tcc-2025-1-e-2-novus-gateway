# Technology Stack

**Project:** VarzeaPro Backend (apps/api)
**Researched:** 2026-03-23
**Overall confidence:** HIGH (all versions verified against npm registry; integrations verified against official docs)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Fastify | 5.8.4 | HTTP server | TypeScript-native, ~45k RPS, schema-based validation, plugin system that composes cleanly. Faster than Express by ~3x. Non-negotiable per project constraints. |
| Node.js | 20 LTS | Runtime | LTS line; matches existing frontend Dockerfile (`node:20-alpine`). Fastify 5 requires Node 18+. |
| TypeScript | 5.x (bundled with project) | Language | Strict mode; enables shared type contracts with `~shared/contracts`. Target: ES2022. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16 (Docker image) | Primary data store | Relational model required for users↔teams↔subscriptions↔messages. Non-negotiable. |
| Drizzle ORM | 0.45.1 | ORM + query builder | SQL-transparent API (~7.4 KB), no Rust binary (unlike Prisma pre-v7), zero codegen step, instant TS types on schema edit. Drizzle Kit 0.31.10 handles migrations. Use `postgres` driver (v3.4.8) for the connection. |
| drizzle-kit | 0.31.10 | Migration CLI | Generates and applies SQL migrations. `drizzle-kit generate` + `drizzle-kit migrate`. Ships its own migration log table (`__drizzle_migrations`). |

**Why Drizzle over Prisma:** Prisma v7 only recently dropped its Rust engine; Drizzle has always been pure TS. Drizzle is measurably faster in benchmarks, the schema-as-code approach fits a monorepo where contracts live in TypeScript, and there is no `prisma generate` step blocking hot reload in development.

**Why not raw SQL:** Drizzle compiles down to SQL anyway; the type-safe query builder eliminates a class of runtime errors at zero performance cost.

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Better Auth | 1.5.6 | Auth framework | Framework-agnostic, TypeScript-first, has an official Fastify integration guide and a community plugin (`fastify-better-auth`). Provides session management, JWT plugin, RBAC roles, and email/password out of the box. Non-negotiable per project constraints. |
| @fastify/jwt | 10.0.0 | JWT signing/verification | Used alongside Better Auth for issuing Bearer tokens that the frontend stores in `sessionStorage` as `varzeapro_token`. Frontend sends `Authorization: Bearer <token>`; this plugin verifies on every protected route. |

**Better Auth setup notes:**
- Register a catch-all route at `/api/auth/*` that forwards to `auth.handler`
- Use `fromNodeHeaders` helper to convert Fastify's header map to the Web Headers API format
- Better Auth issues sessions; the JWT plugin extracts a signed JWT from that session for the Bearer flow the frontend already uses
- RBAC roles map to: `player`, `team`, `admin`

### Real-time

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Socket.io | 4.8.3 | WebSocket server | Room management, auto-reconnection, fallback transports. Non-negotiable per project constraints. |
| fastify-socket.io | 5.1.0 | Fastify plugin wrapper | Decorates the Fastify instance with `server.io`; handles `preClose` and `onClose` hooks so graceful shutdown works correctly. Supports Socket.io v4 + Fastify v4/v5. |

**Setup note:** `server.io` is only available after `await server.ready()`. Handle connections in a post-ready hook, not at top level.

### Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | 4.3 (already in frontend) | Schema validation | The frontend already uses Zod 4 for `~shared/contracts` types. Reuse the same schemas on the backend. No duplication. |
| fastify-type-provider-zod | 6.1.0 | Fastify↔Zod bridge | Translates Zod schemas to JSON Schema for Fastify's validator compiler. Enables `schema: { body: z.object({...}) }` in route definitions with full TS inference. |

**Critical:** Install `fastify-type-provider-zod` and call `withTypeProvider<ZodTypeProvider>()` on the Fastify instance. Without this, Zod schemas are not wired into Fastify's validation pipeline.

### Security Middleware

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @fastify/helmet | 13.0.2 | Security headers (CSP, HSTS, X-Frame-Options, etc.) | Wraps `helmet` v8. One registration at app root covers all routes. |
| @fastify/rate-limit | 10.3.0 | Rate limiting | Apply globally on all public routes; tighten on auth endpoints (`/auth/login`, `/auth/signup`, `/auth/forgot-password`). Supports Redis for distributed deployments (not needed for single-VPS TCC). |
| @fastify/cors | 11.2.0 | CORS headers | Required because frontend (`apps/web`) and API (`apps/api`) run as separate containers. Configure `origin` to match `VITE_API_URL` domain. |

### Logging & Observability

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Pino | 10.3.1 (built into Fastify) | Structured logging | Fastify ships Pino as its logger. Zero additional setup. In production, pipe to stdout and let Docker/the VPS collect logs. Do not add Winston or Bunyan — redundant. |

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 4.1.1 | Unit + integration tests | Already used (implied by frontend tooling and `bun` runtime). Consistent with the monorepo. Fastify provides `inject()` for in-process HTTP testing without a live server — combine with Vitest for integration tests. |

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Docker | 20+ | Containerisation | `apps/api` Dockerfile mirrors `apps/web`: `node:20-alpine`, multi-stage build (install → build → run). |
| Docker Compose | v2 | Multi-service orchestration | Single `docker-compose.yml` at monorepo root: `web`, `api`, `postgres` services. `restart: unless-stopped` on all services. Services communicate over the default Docker bridge network using service names as hostnames (`postgres:5432`, `api:3000`). |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fastify/sensible` | latest | Adds HTTP error helpers (`reply.notFound()`, `reply.forbidden()`, etc.) | Register at app root; simplifies error throwing in route handlers |
| `@fastify/autoload` | latest | Auto-discovers and registers route files from a directory | Use to load `src/routes/**/*.ts` without manual imports |
| `fastify-plugin` | latest | Breaks plugin encapsulation so decorators/hooks are visible globally | Wrap any plugin that should decorate the root Fastify instance (e.g., database plugin, auth plugin) |
| `postgres` | 3.4.8 | PostgreSQL driver | The driver Drizzle recommends for Node.js. Lightweight, no native bindings. |
| `dotenv` / `@fastify/env` | latest | Env var loading + schema validation | Use `@fastify/env` with a Zod/JSON Schema to validate all required env vars at startup; fail fast on misconfiguration |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle ORM | Prisma | Prisma v7 only recently dropped its Rust engine; Drizzle has been pure TS always. Prisma's `generate` step breaks dev ergonomics. Performance is lower. |
| ORM | Drizzle ORM | TypeORM | TypeORM is effectively unmaintained as of 2025; decorator-based approach conflicts with strict TypeScript. |
| ORM | Drizzle ORM | Raw `pg` / SQL | Drizzle compiles to SQL with zero overhead; adds type safety for free. Raw SQL only makes sense if query patterns are unusual — they are not here. |
| Auth | Better Auth | Passport.js | Passport.js is a collection of strategies with no built-in session management, RBAC, or TypeScript types. Better Auth is a complete framework. |
| Auth | Better Auth | Auth.js (NextAuth) | Auth.js is optimised for Next.js; Fastify integration is not first-class. Better Auth has an official Fastify guide. |
| WebSockets | Socket.io | native `ws` / `@fastify/websocket` | `ws` has no room management or reconnection logic. Socket.io solves the exact problems needed (rooms, presence, typing indicators) out of the box. |
| Validation | Zod (shared) | Joi / Yup | Frontend already uses Zod v4 for `~shared/contracts`. Reusing the same library and schemas on the backend is strictly better — no schema duplication, no type translation. |
| Testing | Vitest | Jest | Vitest is faster (Vite-based), natively supports ESM, and is already implied by the monorepo's Bun/Vite setup. Jest requires additional ESM configuration. |
| Logging | Pino (built-in) | Winston / Bunyan | Pino is already embedded in Fastify. Adding a second logger is dead weight. |

---

## Installation

```bash
# Core
npm install fastify @fastify/sensible @fastify/autoload fastify-plugin

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Auth
npm install better-auth @fastify/jwt

# Real-time
npm install socket.io fastify-socket.io

# Validation
npm install fastify-type-provider-zod
# zod is already installed in the monorepo shared package

# Security
npm install @fastify/helmet @fastify/rate-limit @fastify/cors

# Config
npm install @fastify/env

# Dev
npm install -D vitest typescript tsx @types/node
```

---

## Key Configuration Notes

### Shared Contracts

The frontend's `~shared/contracts` types live at `Projeto/apps/web/shared/`. The backend must either:
1. Import directly from the web package (works in a monorepo with `Projeto/packages/shared` eventually), or
2. Duplicate the Zod schemas in `apps/api/src/schemas/` and keep them in sync

**Recommended path:** Move shared contracts to `Projeto/packages/shared` and have both `apps/web` and `apps/api` import from there. This is a refactor to do in Phase 1 of the backend build.

### Response Shape Contract

All backend responses MUST match the frontend's expected shapes:
- Single item: `{ data: T }`
- List: `{ data: T[], meta: { page, pageSize, total, totalPages } }`

Implement a `reply.send({ data: result })` wrapper or a Fastify reply decorator to enforce this globally.

### Auth Token Flow

Frontend stores `varzeapro_token` (JWT) in `sessionStorage` and sends `Authorization: Bearer <token>` on every request. Backend must:
1. Use Better Auth to create sessions on login/signup
2. Extract a JWT from the session using Better Auth's JWT plugin
3. Use `@fastify/jwt` to verify Bearer tokens on protected routes
4. Attach `request.user` via a Fastify `onRequest` hook

---

## Sources

- [Fastify TypeScript docs](https://fastify.dev/docs/latest/Reference/TypeScript/) — HIGH confidence
- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify) — HIGH confidence
- [fastify-better-auth plugin](https://github.com/flaviodelgrosso/fastify-better-auth) — MEDIUM confidence (community plugin, verify active maintenance before adopting)
- [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod) — HIGH confidence
- [Drizzle ORM PostgreSQL guide](https://orm.drizzle.team/docs/get-started/postgresql-new) — HIGH confidence
- [Drizzle vs Prisma 2026 comparison](https://www.bytebase.com/blog/drizzle-vs-prisma/) — MEDIUM confidence
- [fastify-socket.io](https://github.com/ducktors/fastify-socket.io) — HIGH confidence
- [Socket.IO server init docs](https://socket.io/docs/v4/server-initialization/) — HIGH confidence
- [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit) — HIGH confidence
- [@fastify/helmet](https://github.com/fastify/fastify-helmet) — HIGH confidence
- npm registry version checks (2026-03-23) — HIGH confidence
