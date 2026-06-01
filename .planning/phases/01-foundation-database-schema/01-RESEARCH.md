# Phase 1: Foundation + Database Schema - Research

**Researched:** 2026-03-23
**Domain:** Fastify 5 + Drizzle ORM + PostgreSQL + Docker Compose — project scaffold and full DB schema
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Application runs via Docker Compose — `web` + `api` + `postgres` containers on a single VPS | Docker 29.x confirmed available; Compose v2 pattern documented; postgres healthcheck pattern identified |
| INFRA-02 | GitHub Actions CI/CD pipelines for test, build, and deploy (`test.yml`, `build.yml`, `deploy.yml`) | Note: INFRA-02 as stated in REQUIREMENTS.md covers CI/CD pipelines; Phase 1 delivers the Docker Compose stack (INFRA-01 success criteria). CI/CD pipeline files are authored in Phase 1 scaffolding but not fully exercised until Phase 7. |
</phase_requirements>

---

## Summary

Phase 1 creates the entire backend scaffold from zero: the `apps/api/` directory, Fastify server wiring, environment validation, Drizzle ORM schema covering all 7 domain tables, migration tooling, Docker Compose integration, and a working health endpoint. No business logic is written here — every subsequent phase depends on these foundations being correct.

The full database schema must be authored in Phase 1 even though most tables are consumed in later phases. Retrofitting Drizzle schema mid-project disrupts migrations, service layer types, and downstream features simultaneously. Building the complete schema now costs one extra day but saves several painful refactors.

The existing prior research (STACK.md, ARCHITECTURE.md, PITFALLS.md) was conducted with HIGH confidence on 2026-03-23 and all package versions have been re-verified against npm. No conflicting information found. This RESEARCH.md synthesises that work into Phase 1-specific planning guidance.

**Primary recommendation:** Scaffold `apps/api/` with the layered plugin architecture, author the complete 7-table Drizzle schema derived from `~shared/contracts`, wire Docker Compose with a postgres healthcheck, and validate all env vars at startup via `@fastify/env`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.8.4 | HTTP server | Non-negotiable per CLAUDE.md; TypeScript-native, plugin system |
| typescript | 5.x | Language | Strict mode; shared contracts require TS |
| tsx | 4.21.0 | TS execution (dev) | Zero-config TS runner for Node; replaces ts-node |
| @types/node | latest | Node type definitions | Required for strict TS |

### Database

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | ORM + query builder | Pure TS, SQL-transparent, zero codegen — locked decision |
| drizzle-kit | 0.31.10 | Migration CLI | `drizzle-kit generate` + `drizzle-kit migrate` |
| postgres | 3.4.8 | PostgreSQL driver | Drizzle-recommended driver; no native bindings |

### Fastify Plugins (Phase 1 subset)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @fastify/env | 5.0.3 | Env var validation at startup | Fail-fast on missing/invalid env; typed `Env` export |
| fastify-type-provider-zod | 6.1.0 | Zod ↔ Fastify schema bridge | Reuses frontend Zod contracts; no schema duplication |
| fastify-plugin | 5.1.0 | Break plugin encapsulation | Required so `fastify.db` decorator is visible globally |
| @fastify/sensible | latest | HTTP error helpers | `reply.notFound()`, `reply.forbidden()` etc. |
| @fastify/cors | 11.2.0 | CORS headers | Register in Phase 1 with env-driven origin allowlist |
| zod | 4.3.6 | Schema validation | Already in frontend; reused on backend |

### Infrastructure

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Docker | 29.3.0 | Containerisation | Confirmed available on dev machine |
| Docker Compose v2 | bundled | Multi-service orchestration | `web` + `api` + `postgres` on single VPS |
| PostgreSQL | 16 (Docker image) | Primary data store | Non-negotiable per CLAUDE.md |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| drizzle-orm | Prisma | Prisma has codegen step; Drizzle is pure TS — locked |
| postgres driver | pg / node-postgres | `postgres` is lighter; Drizzle recommends it |
| @fastify/env | dotenv + manual validation | `@fastify/env` integrates with Fastify lifecycle, fails fast before routes register |
| tsx | ts-node | tsx is faster, no tsconfig path complications |

**Installation:**
```bash
# In apps/api/
npm install fastify fastify-plugin @fastify/sensible @fastify/cors @fastify/env
npm install drizzle-orm postgres
npm install fastify-type-provider-zod zod
npm install -D drizzle-kit typescript tsx @types/node
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/
├── src/
│   ├── server.ts              # Entry: listen() — not exported for tests
│   ├── app.ts                 # Fastify factory (exported, testable, no listen)
│   ├── config/
│   │   └── env.ts             # @fastify/env schema + typed Env interface
│   ├── plugins/
│   │   ├── db.ts              # Drizzle decorator — fastify.db
│   │   └── cors.ts            # @fastify/cors with env-driven origin
│   ├── routes/
│   │   └── health.ts          # GET /health → { status: "ok" }
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.ts       # Re-exports all tables
│   │   │   ├── users.ts
│   │   │   ├── players.ts
│   │   │   ├── teams.ts
│   │   │   ├── conversations.ts
│   │   │   ├── messages.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── audit-logs.ts
│   │   └── migrations/        # Drizzle Kit generated SQL
│   └── lib/
│       ├── response.ts        # ok(), list() envelope helpers
│       └── errors.ts          # AppError + Fastify error handler
├── tests/
│   └── health.test.ts         # Vitest smoke test
├── Dockerfile
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

### Pattern 1: Plugin-as-Decorator (Fastify idiom)

**What:** Cross-cutting concerns (db, auth, socket) are registered as Fastify plugins and exposed as `fastify.X` decorators. Route handlers receive the decorated instance — no global singletons.

**When to use:** Every shared resource that route handlers need access to.

```typescript
// Source: ARCHITECTURE.md + https://fastify.dev/docs/latest/Reference/Plugins/
// src/plugins/db.ts
import fp from "fastify-plugin"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../db/schema"

export default fp(async (fastify) => {
  const client = postgres(fastify.config.DATABASE_URL)
  const db = drizzle(client, { schema })
  fastify.decorate("db", db)
  fastify.addHook("onClose", async () => client.end())
})

declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>
  }
}
```

### Pattern 2: Environment Validation at Startup

**What:** `@fastify/env` validates all required env vars before any route is registered. Server refuses to start if vars are missing or wrong type.

**When to use:** Phase 1 only — register before all plugins.

```typescript
// Source: https://github.com/fastify/fastify-env
// src/config/env.ts
import { FastifyPluginAsync } from "fastify"
import fp from "fastify-plugin"
import { z } from "zod"

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
})

export type Env = z.infer<typeof EnvSchema>

declare module "fastify" {
  interface FastifyInstance {
    config: Env
  }
}
```

### Pattern 3: Response Envelope Helpers

**What:** Every route uses `ok()` or `list()` to guarantee the frontend contract shape.

**When to use:** Every route handler — enforced as a code convention.

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

### Pattern 4: app.ts / server.ts Split

**What:** `app.ts` is a factory function that creates and configures the Fastify instance without calling `listen()`. `server.ts` imports `app.ts` and calls `listen()`. Tests import `app.ts` only.

**When to use:** Always — enables Fastify's `inject()` for in-process testing.

```typescript
// src/app.ts
import Fastify from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"

export async function buildApp() {
  const fastify = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()
  await fastify.register(import("./config/env"))
  await fastify.register(import("./plugins/db"))
  await fastify.register(import("./plugins/cors"))
  await fastify.register(import("./routes/health"))
  return fastify
}
```

### Pattern 5: Docker Compose with Postgres Healthcheck

**What:** The `api` service uses `depends_on` with `condition: service_healthy` to wait for Postgres to be ready before starting. Prevents connection errors on cold start.

**When to use:** Always in Docker Compose — Postgres takes 2-5 seconds to initialize.

```yaml
# docker-compose.yml (Phase 1 relevant excerpt)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: varzeapro
      POSTGRES_USER: varzeapro
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U varzeapro"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./apps/api
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    ports:
      - "3000:3000"
```

### Anti-Patterns to Avoid

- **Module-level DB singleton:** `export const db = drizzle(pool)` at module top level — bypasses Fastify lifecycle, pool never closes cleanly, impossible to mock in tests. Use `fastify.db` decorator instead.
- **Calling `listen()` in `app.ts`:** Makes the server untestable. Always split `app.ts` (factory) from `server.ts` (entry point).
- **Hardcoding secrets in `docker-compose.yml`:** Use `env_file: .env` where `.env` is in `.gitignore`; provide `.env.example` in the repo.
- **No CORS origin restriction:** Never use `origin: '*'` or `origin: true` with credentials. Set `CORS_ORIGIN` env var from day one.
- **`ARG` for secrets in Dockerfile:** ARGs appear in `docker history`. Use runtime `ENV` only.

---

## Database Schema (Full — All 7 Tables)

The complete schema is derived directly from `Projeto/apps/web/shared/contracts/`. Every field maps to a contract type. Build all tables in Phase 1 to avoid migration disruption in later phases.

### Table: `users`

Source contracts: `auth.ts` (SessionUser, Role), `subscription.ts` (PlanId)

```typescript
// src/db/schema/users.ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core"

export const roleEnum = pgEnum("role", ["player", "team", "admin"])
export const planIdEnum = pgEnum("plan_id", ["free", "craque", "titular", "campeao"])

export const users = pgTable("users", {
  id: text("id").primaryKey(),           // Better Auth generates UUID/CUID
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  planId: planIdEnum("plan_id").notNull().default("free"),
  banned: text("banned"),                // null = active, reason string = banned
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

### Table: `players`

Source contracts: `players.ts` (PlayerProfile)

```typescript
// src/db/schema/players.ts — key columns
// id: text PK, userId: text FK→users.id, name, photoUrl, positions: text[],
// bio, skills: text[], height: integer, weight: integer,
// birthDate: text, phone: text, availability: text,
// createdAt, updatedAt: timestamp
```

### Table: `teams`

Source contracts: `teams.ts` (TeamProfile)

```typescript
// src/db/schema/teams.ts — key columns
// id: text PK, userId: text FK→users.id, name, logoUrl,
// level: pgEnum(["amador","recreativo","semi-profissional","outro"]),
// region, city, description, openPositions: text[], matchDays: text[],
// createdAt, updatedAt: timestamp
```

### Table: `conversations`

Source contracts: `messaging.ts` (Conversation, ConversationSummary)

```typescript
// src/db/schema/conversations.ts — key columns
// id: text PK, participantA: text FK→users.id, participantB: text FK→users.id,
// createdAt, updatedAt: timestamp
// Unique constraint: (participantA, participantB) — no duplicate conversations
```

### Table: `messages`

Source contracts: `messaging.ts` (Message)

```typescript
// src/db/schema/messages.ts — key columns
// id: bigserial PK (NOT text — use DB sequence to prevent race conditions)
// conversationId: text FK→conversations.id, senderId: text FK→users.id,
// content: text NOT NULL, readAt: timestamp nullable,
// createdAt: timestamp defaultNow()
// Index: (conversation_id) for efficient message fetching
```

### Table: `subscriptions`

Source contracts: `subscription.ts` (Subscription, SubscriptionStatus)

```typescript
// src/db/schema/subscriptions.ts — key columns
// id: text PK, userId: text FK→users.id (unique — one subscription per user),
// planId: planIdEnum, status: pgEnum(["active","canceled","past_due","trialing"]),
// currentPeriodStart: timestamp, currentPeriodEnd: timestamp,
// cancelAtPeriodEnd: boolean default false,
// createdAt, updatedAt: timestamp
```

### Table: `audit_logs`

Source contracts: `moderation.ts` (admin actions), inferred from requirements (ADM-04)

```typescript
// src/db/schema/audit-logs.ts — key columns
// id: bigserial PK, adminId: text FK→users.id, action: text NOT NULL,
// targetEntityType: text (e.g. "user", "report"), targetEntityId: text,
// note: text nullable, createdAt: timestamp defaultNow()
```

### Table: `moderation_reports`

Source contracts: `moderation.ts` (ReportSummary, ReportStatus, ReportReason)

```typescript
// src/db/schema/moderation-reports.ts — key columns
// id: text PK, reporterId: text FK→users.id,
// reportedEntityType: pgEnum(["player","team","message"]),
// reportedEntityId: text, reason: pgEnum([...ReportReason]),
// description: text nullable,
// status: pgEnum(["pending","dismissed","resolved"]) default "pending",
// createdAt: timestamp defaultNow()
```

**Note:** The success criteria lists 7 tables: users, players, teams, conversations, messages, subscriptions, audit_logs. `moderation_reports` is an 8th table derived from contracts. Include it in Phase 1 since Phase 6 (Admin) depends on it. Naming in success criteria is informal — include both `audit_logs` and `moderation_reports`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env var validation | Custom `process.env` checks | `@fastify/env` | Fastify lifecycle integration, typed output, fails before routes register |
| DB connection pool | Manual `pg.Pool` management | `postgres` driver + Drizzle decorator with `onClose` hook | Pool lifecycle tied to Fastify, clean shutdown guaranteed |
| Response shape enforcement | Ad-hoc `{ data: x }` in every handler | `ok()` / `list()` helpers in `lib/response.ts` | Single source of truth; any shape deviation is a one-line fix |
| Migration management | Manual SQL files | Drizzle Kit (`drizzle-kit generate`, `drizzle-kit migrate`) | Auto-diffing, migration log table, rollback awareness |
| TypeScript path aliases | Custom webpack/tsconfig hacks | `tsconfig.json` `paths` + Vite plugin (already in web) | Standard TS; tsx respects `tsconfig.json` paths natively |

**Key insight:** The Fastify plugin system exists precisely to avoid global state. Every singleton-shaped problem has a plugin-as-decorator solution.

---

## Common Pitfalls

### Pitfall 1: Postgres Container Starts Before API — Connection Refused

**What goes wrong:** `api` container starts in ~0.5s, tries to connect to postgres which takes 3-5s to initialize, crashes with `ECONNREFUSED`, Docker restarts it in a loop.

**Why it happens:** `depends_on` without a healthcheck only waits for the container to *start*, not for postgres to *accept connections*.

**How to avoid:** Add a `healthcheck` using `pg_isready` on the postgres service and set `depends_on: { postgres: { condition: service_healthy } }` on the api service.

**Warning signs:** API container shows "connection refused" in logs then restarts; `docker compose ps` shows api in restart loop.

### Pitfall 2: `@fastify/env` Registered After Plugins That Need Config

**What goes wrong:** `db.ts` plugin reads `fastify.config.DATABASE_URL` but env plugin wasn't registered first — `fastify.config` is undefined, server crashes obscurely.

**Why it happens:** Plugin registration order matters in Fastify; there is no automatic dependency resolution.

**How to avoid:** Register env plugin FIRST in `app.ts`, before any plugin that reads `fastify.config`. Test order: env → db → cors → routes.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'DATABASE_URL')` at startup.

### Pitfall 3: Drizzle Schema Uses `text` for Message IDs

**What goes wrong:** Messages use `text("id").primaryKey()` with application-generated IDs. Under concurrent inserts, two requests generate the same ID or ordering is non-deterministic.

**Why it happens:** Copying the ID pattern from other tables where application-generated UUIDs are fine.

**How to avoid:** Messages table uses `bigserial("id").primaryKey()` — the DB sequence is the only safe source of truth for message ordering. All other tables can use `text` PKs (application-generated UUID/CUID via Better Auth patterns).

**Warning signs:** Message ordering is inconsistent; duplicate key errors under load.

### Pitfall 4: Docker ARG Used for Secrets

**What goes wrong:** `Dockerfile` contains `ARG JWT_SECRET` then `ENV JWT_SECRET=$JWT_SECRET`. The secret appears in `docker history` and any image layer inspection tool.

**Why it happens:** Developers want to inject secrets at build time for convenience.

**How to avoid:** Never use `ARG` for secrets. Inject all secrets as runtime environment variables via `docker-compose.yml` `env_file: .env`. The Dockerfile needs no secret-related `ARG` or `ENV` entries.

**Warning signs:** `docker history <image>` shows `JWT_SECRET=...` in an ENV layer.

### Pitfall 5: `fastify-plugin` Not Used on `db.ts`

**What goes wrong:** The database plugin is registered without `fp()` wrapper. Fastify's plugin encapsulation means `fastify.db` is only visible inside that plugin's scope — route handlers can't see it.

**Why it happens:** Forgetting that Fastify plugins are scoped by default; encapsulation is the default, not the exception.

**How to avoid:** Wrap every plugin that decorates the root Fastify instance with `fp()` from `fastify-plugin`. Route plugins do NOT need `fp()`.

**Warning signs:** `TypeError: fastify.db is not a function` in route handlers.

---

## Code Examples

### Fastify App Factory

```typescript
// Source: https://fastify.dev/docs/latest/Reference/TypeScript/
// src/app.ts
import Fastify from "fastify"
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod"

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== "test",
  }).withTypeProvider<ZodTypeProvider>()

  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Order matters: env first, then db, then routes
  await fastify.register(import("./config/env"))
  await fastify.register(import("./plugins/db"))
  await fastify.register(import("./plugins/cors"))
  await fastify.register(import("./routes/health"), { prefix: "/health" })

  return fastify
}
```

### Health Route

```typescript
// src/routes/health.ts
import { FastifyPluginAsync } from "fastify"

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (_req, reply) => {
    return reply.send({ status: "ok" })
  })
}

export default healthRoutes
```

### Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### API Dockerfile (multi-stage)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Container orchestration | Yes | 29.3.0 | — |
| Docker Compose v2 | Multi-service stack | Yes | bundled with Docker 29 | — |
| Node.js | Runtime | Yes | 24.14.0 | — |
| npm | Package manager | Yes | 11.12.0 | — |
| PostgreSQL (Docker) | Database | Yes (via Docker) | 16 (image) | — |

**Note:** Node.js 24.14.0 is installed locally (newer than the Node 20 specified in the Dockerfile). The Dockerfile pins `node:20-alpine` — this is intentional and correct; local Node version doesn't matter since the app runs in the container.

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run tests/health.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | `GET /health` returns 200 `{ status: "ok" }` | integration (Fastify inject) | `npx vitest run tests/health.test.ts` | No — Wave 0 |
| INFRA-01 | Docker Compose brings up all 3 containers without errors | smoke (manual) | `docker compose up --wait` then `curl http://localhost:3000/health` | N/A — manual |
| INFRA-01 | Drizzle migrations run cleanly; all tables exist | integration (DB) | `npx vitest run tests/migrations.test.ts` | No — Wave 0 |
| INFRA-01 | Invalid env vars cause fail-fast startup error | unit | `npx vitest run tests/env.test.ts` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/health.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/vitest.config.ts` — Vitest config with test environment
- [ ] `apps/api/tests/health.test.ts` — covers INFRA-01 health endpoint
- [ ] `apps/api/tests/env.test.ts` — covers INFRA-01 env validation fail-fast
- [ ] `apps/api/tests/migrations.test.ts` — verifies all 8 tables exist after migration
- [ ] Framework install: `npm install -D vitest` in `apps/api/`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma (Rust engine) | Drizzle ORM (pure TS) | 2023-2024 | No codegen step, faster types, no binary |
| ts-node | tsx | 2023 | Zero config, faster startup, no compilation step |
| Express + body-parser | Fastify 5 with built-in JSON | 2023 | 3x faster, native TS support, plugin system |
| Separate Socket.io port | fastify-socket.io (shared http.Server) | 2022 | Single port, simpler Docker Compose |

**Deprecated/outdated:**
- `ts-node`: Superseded by `tsx` for development execution — no compilation step, no tsconfig path issues.
- `pg` (node-postgres): The `postgres` driver (postgres.js) is recommended by Drizzle and is lighter-weight.
- Prisma pre-v7 with Rust binary: Pure TS alternatives (Drizzle) are now standard for Node-only environments.

---

## Open Questions

1. **Shared contracts location: import directly from `apps/web/shared` or move to `packages/shared`?**
   - What we know: `STATE.md` lists this as a todo ("Decide whether to move shared contracts to `packages/shared` in Phase 1 or defer")
   - What's unclear: Monorepo workspace configuration — does the project use npm workspaces?
   - Recommendation: In Phase 1, configure `apps/api/tsconfig.json` with a path alias `~shared` pointing to `../../apps/web/shared` for immediate reuse. The `packages/shared` refactor can be deferred to post-Phase 1 since it doesn't change the contract types, only the import path.

2. **Better Auth session table compatibility with Drizzle schema**
   - What we know: Better Auth 1.5.6 requires specific session/account tables; it can create them automatically or use an existing Drizzle schema
   - What's unclear: Exact column names Better Auth expects when using the Drizzle adapter
   - Recommendation: In Phase 1, do NOT create auth tables manually. Let Better Auth create its own session/account tables during Phase 2. The `users` table defined in Phase 1 should be compatible — verify column names when wiring Better Auth in Phase 2.

---

## Project Constraints (from CLAUDE.md)

- **Tech Stack**: Fastify + Node.js + TypeScript — non-negotiable
- **Database**: PostgreSQL — non-negotiable
- **Auth**: Better Auth library — Phase 2, but schema must accommodate it in Phase 1
- **Real-time**: Socket.io preferred — Phase 5, not Phase 1
- **Deployment**: VPS via Docker Compose — Docker Compose scaffold is a Phase 1 deliverable
- **Contract Fidelity**: Backend responses must match `~shared/contracts` exactly — `ok()` / `list()` helpers enforce this
- **Security**: Rate limiting on all public endpoints, input validation (Zod), HttpOnly cookies — Phase 1 wires CORS; full security in Phase 7
- **Do not modify frontend code** unless fixing a contract mismatch
- **GSD Workflow**: All file changes go through a GSD command; no direct edits outside GSD

---

## Sources

### Primary (HIGH confidence)

- npm registry (2026-03-23) — fastify@5.8.4, drizzle-orm@0.45.1, drizzle-kit@0.31.10, postgres@3.4.8, @fastify/env@5.0.3, fastify-type-provider-zod@6.1.0, zod@4.3.6, vitest@4.1.1, tsx@4.21.0 — all versions verified live
- `.planning/research/STACK.md` — full stack decisions with rationale, researched 2026-03-23
- `.planning/research/ARCHITECTURE.md` — plugin patterns, folder structure, data flow
- `.planning/research/PITFALLS.md` — 10 critical pitfalls with prevention strategies
- `Projeto/apps/web/shared/contracts/` — auth.ts, players.ts, teams.ts, messaging.ts, subscription.ts, moderation.ts — exact field types for schema derivation

### Secondary (MEDIUM confidence)

- [Fastify TypeScript docs](https://fastify.dev/docs/latest/Reference/TypeScript/) — plugin patterns, type provider setup
- [Drizzle ORM PostgreSQL guide](https://orm.drizzle.team/docs/get-started/postgresql-new) — drizzle-kit config, migration workflow

### Tertiary (LOW confidence)

None — all critical claims verified against primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry live
- Architecture: HIGH — derived from official Fastify/Drizzle docs and prior research
- Schema design: HIGH — derived directly from shared contract files (source of truth)
- Pitfalls: HIGH — identified in prior research with codebase analysis, cross-referenced with official docs
- Docker/env: HIGH — Docker 29 confirmed available; patterns from official Docker docs

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable ecosystem; Drizzle and Fastify release frequently but APIs are stable)
