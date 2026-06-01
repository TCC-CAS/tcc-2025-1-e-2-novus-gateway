# Architecture Patterns

**Domain:** E-sports social platform backend (Fastify + Node.js + TypeScript)
**Researched:** 2026-03-23
**Confidence:** HIGH (Fastify/Socket.io/Drizzle patterns) | MEDIUM (Better Auth RBAC specifics)

---

## Recommended Architecture

A layered plugin-based monolith running inside `apps/api/`. Fastify owns the HTTP lifecycle; Socket.io shares the same underlying Node.js `http.Server`; Better Auth attaches as a Fastify plugin and catch-all route; Drizzle ORM is injected as a Fastify decorator so every route and service sees a single typed `db` handle.

```
┌──────────────────────────────────────────────────────────┐
│                        apps/api/                         │
│                                                          │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │   Fastify HTTP       │   │     Socket.io Server     │  │
│  │   (REST routes)      │   │  (mounted on same http)  │  │
│  └─────────┬───────────┘   └────────────┬─────────────┘  │
│            │                            │                 │
│  ┌─────────▼──────────────────────────▼──────────────┐   │
│  │               Plugin Layer                         │   │
│  │  @fastify/cors  |  @fastify/rate-limit  |          │   │
│  │  fastify-better-auth  |  drizzle decorator         │   │
│  └─────────────────────┬──────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼──────────────────────────────┐   │
│  │               Route Handlers                        │   │
│  │  /auth/**  /players/**  /teams/**  /search/**       │   │
│  │  /conversations/**  /admin/**  /subscription/**     │   │
│  └─────────────────────┬──────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼──────────────────────────────┐   │
│  │               Service Layer                         │   │
│  │  PlayerService  TeamService  MessagingService       │   │
│  │  SearchService  SubscriptionService  AdminService   │   │
│  └─────────────────────┬──────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼──────────────────────────────┐   │
│  │            Drizzle ORM (db decorator)               │   │
│  └─────────────────────┬──────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼──────────────────────────────┐   │
│  │               PostgreSQL (Docker)                   │   │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/server.ts` | Bootstrap: creates `http.Server`, attaches Fastify + Socket.io, registers plugins, starts listening | All plugins, Socket.io gateway |
| `src/app.ts` | Fastify instance factory (testable, no `listen()` call) | Plugins, routes |
| `src/plugins/db.ts` | Creates Drizzle + pg Pool, decorates `fastify.db` | Nothing downstream — pulled by services |
| `src/plugins/auth.ts` | Registers `fastify-better-auth`; exposes `fastify.auth`, session middleware | Routes that require authentication |
| `src/plugins/socket.ts` | Registers `fastify-socket.io`; exports typed `io` accessor; sets up connection guards | Messaging gateway |
| `src/routes/` | Per-domain route files registered via `fastify.register()` with prefix | Services, `fastify.auth` |
| `src/services/` | Business logic, DB queries, response shaping | `fastify.db` (Drizzle), other services |
| `src/db/schema/` | Drizzle table definitions — single source of truth for DB shape | Migrations, services |
| `src/db/migrations/` | Drizzle Kit generated SQL migrations | PostgreSQL at deploy time |
| `src/gateways/messaging.gateway.ts` | Socket.io event handlers for chat, typing, presence | `MessagingService`, `fastify.auth` |
| `src/middleware/rbac.ts` | `preHandler` hook factories: `requireAuth`, `requireRole(role)` | All protected routes |
| `src/lib/response.ts` | Response envelope helpers: `ok(data)`, `list(data, meta)` | All route handlers |
| `src/lib/errors.ts` | Typed `AppError` subclasses; Fastify `setErrorHandler` | All layers |
| `src/config/env.ts` | `@fastify/env` schema + typed `Env` export | All layers (imported directly) |

---

## Data Flow

### Authenticated REST Request

```
Client
  │  Authorization: Bearer <jwt>
  ▼
Fastify HTTP listener
  │
  ├─ @fastify/cors         (preflight)
  ├─ @fastify/rate-limit   (per-IP counter)
  │
  ▼
Route match  →  preHandler hooks
                  └─ requireAuth()
                       └─ auth.api.getSession(fromNodeHeaders(req.headers))
                            ├─ invalid → 401 AppError
                            └─ valid   → req.user = SessionUser
  │
  ▼
Route handler
  └─ calls Service(fastify.db, req.user)
       └─ Drizzle query  →  PostgreSQL
            └─ result
  │
  ▼
response.ok(data)  or  response.list(data, meta)
  └─ { data: T }  or  { data: T[], meta: { page, pageSize, total, totalPages } }
```

### Real-Time Messaging (Socket.io)

```
Client
  │  WebSocket upgrade  (same origin, same port)
  ▼
Socket.io server (shared http.Server)
  │
  ├─ connection middleware
  │    └─ extract JWT from handshake.auth.token
  │         └─ auth.api.getSession(...)  → attach socket.data.user
  │              └─ invalid → socket.disconnect()
  │
  └─ socket joins room  conversation:<id>
       │
       ▼
  client emits  message:send  { conversationId, content }
       │
       ▼
  MessagingGateway handler
       └─ MessagingService.createMessage(db, user, payload)
            └─ INSERT into messages
                 └─ io.to(room).emit("message:new", messagePayload)
```

### Login Flow

```
POST /auth/login  { email, password }
  │
  ▼
fastify-better-auth catch-all handler
  └─ Better Auth internal: verify credentials → create session → sign JWT
       └─ response: { data: SessionUser, token: string }
            └─ frontend stores token in sessionStorage
```

---

## Patterns to Follow

### Pattern 1: Plugin-as-Decorator (Fastify idiom)

Every cross-cutting concern (db, auth, socket) is registered as a plugin and exposed as a `fastify.X` decorator. Route handlers receive `fastify` (or destructure `{ db, auth }`) — no globals, no module singletons.

```typescript
// src/plugins/db.ts
import fp from 'fastify-plugin'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'

export default fp(async (fastify) => {
  const pool = new Pool({ connectionString: fastify.config.DATABASE_URL })
  fastify.decorate('db', drizzle(pool, { schema }))
  fastify.addHook('onClose', async () => pool.end())
})

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>
  }
}
```

### Pattern 2: Domain Route Registration

Each domain is a self-contained Fastify plugin registered with a prefix. File = domain = prefix.

```typescript
// src/routes/players.ts
import { FastifyPluginAsync } from 'fastify'

const playersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me', { preHandler: [requireAuth()] }, async (req, reply) => {
    const player = await PlayerService.getByUserId(fastify.db, req.user.id)
    return reply.send(ok(player))
  })
}

export default playersRoutes

// registered in app.ts:
fastify.register(playersRoutes, { prefix: '/players' })
```

### Pattern 3: Response Envelope Helpers

Every route uses the same two helpers to guarantee contract fidelity with the frontend.

```typescript
// src/lib/response.ts
export const ok = <T>(data: T) => ({ data })

export const list = <T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
) => ({
  data,
  meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
})
```

### Pattern 4: Better Auth + RBAC preHandler

`requireAuth` validates the session; `requireRole` checks the user's role. Both are `preHandler` hook factories returning Fastify `preHandlerAsyncHookHandler`.

```typescript
// src/middleware/rbac.ts
import { fromNodeHeaders } from 'better-auth/node'

export const requireAuth = () => async (req, reply) => {
  const session = await req.server.auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })
  if (!session) return reply.status(401).send(new AppError('UNAUTHORIZED'))
  req.user = session.user as SessionUser
}

export const requireRole = (role: Role) => async (req, reply) => {
  await requireAuth()(req, reply)
  if (req.user.role !== role) reply.status(403).send(new AppError('FORBIDDEN'))
}
```

### Pattern 5: Socket.io Shares the HTTP Server

`fastify-socket.io` wraps Socket.io and mounts it on Fastify's underlying `http.Server` — no second port, no second process.

```typescript
// src/server.ts
import Fastify from 'fastify'
import socketioPlugin from 'fastify-socket.io'

const fastify = Fastify()
await fastify.register(socketioPlugin, {
  cors: { origin: process.env.WEB_URL, credentials: true },
})
// fastify.io is now the Socket.io Server instance
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Module-Level DB Singleton

**What:** `export const db = drizzle(pool)` at the top of a file imported everywhere.
**Why bad:** Bypasses Fastify's lifecycle; pool never closes cleanly; impossible to mock in tests.
**Instead:** Use the `fastify.db` decorator (Plugin-as-Decorator pattern above).

### Anti-Pattern 2: Inline Business Logic in Route Handlers

**What:** Drizzle queries written directly inside route handler functions.
**Why bad:** Untestable, leaks DB concerns into HTTP layer, duplicates across domains.
**Instead:** Route handler calls `Service.method(db, params)`; service owns all DB access.

### Anti-Pattern 3: Separate HTTP Port for Socket.io

**What:** `new Server(3001)` alongside Fastify on port 3000.
**Why bad:** Requires CORS configuration on two origins, complicates Docker Compose, breaks the VPS single-port deployment.
**Instead:** Use `fastify-socket.io` to mount Socket.io on the same `http.Server`.

### Anti-Pattern 4: Returning Raw DB Rows from Routes

**What:** `reply.send(rows[0])` without an envelope.
**Why bad:** Breaks the `{ data: T }` contract the frontend expects; causes silent type mismatches.
**Instead:** Always use `ok(data)` or `list(data, meta)` helpers.

### Anti-Pattern 5: JWT Stored in HttpOnly Cookie + Also Bearer Token Without Strategy Decision

**What:** Backend sets HttpOnly cookie AND accepts `Authorization: Bearer` without a clear precedence rule.
**Why bad:** Frontend uses `Authorization: Bearer` (from sessionStorage). Better Auth defaults to session cookies. These two modes can produce ghost auth states.
**Instead:** Configure Better Auth's `bearer` plugin so the library accepts `Authorization: Bearer <token>` header. Disable cookie-only mode or configure header precedence explicitly. The frontend contract is Bearer — the backend must honor it.

---

## Suggested Build Order

Dependencies flow upward; each phase unlocks the next.

```
Phase 1: Foundation
  ├─ Monorepo workspace setup (apps/api/ package.json, tsconfig)
  ├─ Fastify server bootstrap (app.ts + server.ts)
  ├─ @fastify/env — typed config/env validation
  └─ Health check route GET /healthz

Phase 2: Database
  ├─ Drizzle ORM + pg Pool plugin (fastify.db)
  ├─ Schema definitions (users, players, teams, conversations, messages,
  │   subscriptions, audit_logs)
  └─ Drizzle Kit migrations + seed script

Phase 3: Authentication
  ├─ Better Auth setup with bearer plugin + PostgreSQL adapter
  ├─ fastify-better-auth plugin registration
  ├─ POST /auth/login, POST /auth/signup, POST /auth/forgot-password
  ├─ requireAuth / requireRole middleware
  └─ RBAC enforcement verified end-to-end with frontend

Phase 4: Core REST Domains
  ├─ Players routes + PlayerService  (GET/PUT /players/me, GET /players/:id)
  ├─ Teams routes + TeamService      (GET/PUT /teams/me, GET /teams/:id)
  ├─ Search routes + SearchService   (GET /search/players, GET /search/teams)
  └─ Subscription routes + SubscriptionService

Phase 5: Real-Time Messaging
  ├─ fastify-socket.io plugin (shared http.Server)
  ├─ Socket.io auth middleware (JWT from handshake.auth.token)
  ├─ MessagingGateway (message:send, message:new, typing:start/stop, presence)
  ├─ REST messaging routes (GET/POST /conversations, GET/POST /conversations/:id/messages)
  └─ MessagingService (DB + emit)

Phase 6: Admin
  ├─ Admin routes (GET /admin/users, ban, moderation reports)
  └─ AdminService (user management, content moderation, audit_logs)

Phase 7: Security Hardening
  ├─ @fastify/rate-limit (per-IP, per-route)
  ├─ Zod input validation on all request bodies
  ├─ XSS/injection guards (@fastify/helmet)
  └─ Race condition guards (DB transactions on concurrent writes)

Phase 8: Testing + CI/CD
  ├─ Vitest unit tests (services)
  ├─ Integration tests (Fastify inject + test DB)
  └─ GitHub Actions (test.yml, build.yml, deploy.yml)

Phase 9: Docker Compose Deployment
  ├─ apps/api/Dockerfile (multi-stage, node:20-alpine)
  ├─ docker-compose.yml (web + api + postgres)
  └─ Nginx reverse proxy (optional but recommended for single VPS)
```

---

## Recommended Folder Structure — apps/api/

```
apps/api/
├── src/
│   ├── server.ts              # Entry: creates http.Server, attaches Fastify + Socket.io, listens
│   ├── app.ts                 # Fastify factory (exported for testing)
│   ├── config/
│   │   └── env.ts             # @fastify/env schema + typed Env interface
│   ├── plugins/
│   │   ├── db.ts              # Drizzle decorator (fastify.db)
│   │   ├── auth.ts            # fastify-better-auth registration
│   │   ├── socket.ts          # fastify-socket.io registration
│   │   ├── cors.ts            # @fastify/cors
│   │   └── rate-limit.ts      # @fastify/rate-limit
│   ├── routes/
│   │   ├── auth.ts            # /auth/** (catch-all → Better Auth handler)
│   │   ├── players.ts         # /players/**
│   │   ├── teams.ts           # /teams/**
│   │   ├── search.ts          # /search/**
│   │   ├── conversations.ts   # /conversations/**
│   │   ├── admin.ts           # /admin/**
│   │   └── subscription.ts    # /subscription/**
│   ├── services/
│   │   ├── player.service.ts
│   │   ├── team.service.ts
│   │   ├── search.service.ts
│   │   ├── messaging.service.ts
│   │   ├── subscription.service.ts
│   │   └── admin.service.ts
│   ├── gateways/
│   │   └── messaging.gateway.ts  # Socket.io event handlers
│   ├── middleware/
│   │   └── rbac.ts            # requireAuth, requireRole factories
│   ├── db/
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── players.ts
│   │   │   ├── teams.ts
│   │   │   ├── conversations.ts
│   │   │   ├── messages.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── audit-logs.ts
│   │   ├── migrations/        # Drizzle Kit generated SQL
│   │   └── seed.ts            # Dev seed data
│   └── lib/
│       ├── response.ts        # ok(), list() envelope helpers
│       └── errors.ts          # AppError subclasses + error handler
├── tests/
│   ├── unit/                  # Service-level Vitest tests
│   └── integration/           # Fastify inject tests
├── Dockerfile
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

---

## Scalability Considerations

| Concern | At current TCC scale (~100 users) | At 10K users |
|---------|-----------------------------------|--------------|
| DB connections | Single Pool (max 10) is fine | Use PgBouncer sidecar in Docker Compose |
| Socket.io rooms | Single-process in-memory — fine | Redis adapter (`@socket.io/redis-adapter`) |
| Search | `ILIKE` + GIN index on PostgreSQL — fine | Move to dedicated FTS or Meilisearch |
| Rate limiting | In-memory store — fine | Switch to Redis store |
| Auth sessions | Better Auth DB sessions — fine | Same, sessions are already DB-backed |

For the TCC single-VPS deployment, the in-process defaults are appropriate. Adding Redis and PgBouncer is a one-line Docker Compose change if needed post-TCC.

---

## Sources

- [Fastify TypeScript docs](https://fastify.dev/docs/latest/Reference/TypeScript/) — HIGH confidence
- [fastify-better-auth plugin (GitHub)](https://github.com/flaviodelgrosso/fastify-better-auth) — MEDIUM confidence (community plugin, official Better Auth docs reference it)
- [Better Auth Fastify Integration Guide](https://better-auth.com/docs/integrations/fastify) — HIGH confidence (official)
- [fastify-socket.io plugin (GitHub)](https://github.com/ducktors/fastify-socket.io) — HIGH confidence (official Fastify ecosystem)
- [Drizzle ORM PostgreSQL Get Started](https://orm.drizzle.team/docs/get-started-postgresql) — HIGH confidence (official)
- [Fastify API with Postgres and Drizzle ORM (DEV)](https://dev.to/vladimirvovk/fastify-api-with-postgres-and-drizzle-orm-a7j) — MEDIUM confidence
- [Socket.IO Server Initialization (shared http.Server)](https://socket.io/docs/v4/server-initialization/) — HIGH confidence (official)

---

*Architecture research: 2026-03-23*
