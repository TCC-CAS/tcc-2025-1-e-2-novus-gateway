# Phase 2: Authentication + RBAC - Research

**Researched:** 2026-03-24
**Domain:** Better Auth 1.5.6 + Fastify 5 + Drizzle ORM + PostgreSQL — auth flows, RBAC, session cookies, rate limiting
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with email/password and receive a secure session (HttpOnly cookie + JWT via Better Auth) | Better Auth email/password plugin confirmed; `cookieCache` + HttpOnly cookie session documented; `toNodeHandler` Fastify bridge confirmed |
| AUTH-02 | User can sign up with email/password and choose a role (`player` or `team`) at registration | `additionalFields` + `databaseHooks.user.create.before` pattern confirmed for role injection at signup |
| AUTH-03 | User can request a password reset (stub/log — no live email delivery) | `sendResetPasswordEmail` callback logs token to console; no email provider required |
| AUTH-04 | All protected routes validate the session server-side and enforce RBAC by role | `auth.api.getSession` in Fastify `preHandler` hook confirmed; role check from session user object |
</phase_requirements>

---

## Summary

Better Auth 1.5.6 integrates with Fastify 5 via the `toNodeHandler` adapter, which bridges Better Auth's Web Standard Request/Response API to Node.js `IncomingMessage`/`ServerResponse`. Better Auth owns a catch-all route (typically `/*` prefixed under `/api/auth`) and handles all auth flows internally. The project already has a `users` table with a `role` enum column — Better Auth's Drizzle adapter is configured with `usePlural: true` to match existing plural table names.

RBAC is implemented in two layers: Better Auth's `admin` plugin adds a `role` field to the user table and exposes role-management APIs, and Fastify `preHandler` hooks on protected route groups call `auth.api.getSession` and check `session.user.role` to return 401/403. Custom role assignment at signup (player/team) requires a `databaseHooks.user.create.before` hook since Better Auth's admin plugin defaults roles to `"user"`.

Rate limiting on auth routes uses `@fastify/rate-limit` 10.3.0 with `global: false` and per-route config (`max: 5, timeWindow: '15 minutes'`). Password reset is stubbed by providing a `sendResetPasswordEmail` callback that logs the token to `console.log` — no email provider is needed.

**Primary recommendation:** Wire Better Auth 1.5.6 via `toNodeHandler`, use the `admin` plugin for role fields, inject role at signup via `databaseHooks`, protect routes with a reusable `preHandler` factory, and rate-limit auth routes with `@fastify/rate-limit` at route level.

---

## Standard Stack

### Core Auth

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.5.6 | Authentication framework | Locked decision; DB-backed sessions, email/password, admin plugin, Drizzle adapter |
| @fastify/rate-limit | 10.3.0 | Per-route rate limiting | Official Fastify plugin; per-route config with `global: false` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fastify-plugin | 5.1.0 | Already installed — break plugin encapsulation | Expose `auth` decorator to all routes |

### Already Installed (No New Deps Required)

| Library | Already At | Notes |
|---------|-----------|-------|
| drizzle-orm | 0.45.1 | Better Auth Drizzle adapter is bundled in `better-auth` |
| zod | 4.3.6 | Request body validation for RBAC-checked routes |
| @fastify/sensible | ^6.0.3 | `reply.unauthorized()`, `reply.forbidden()` |

**Installation:**
```bash
npm install better-auth @fastify/rate-limit
```

**Version verification (confirmed against npm registry 2026-03-24):**
- `better-auth`: 1.5.6 (published ~1 day ago)
- `@fastify/rate-limit`: 10.3.0

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── auth.ts              # Better Auth instance — single export, imported everywhere
├── plugins/
│   ├── auth.ts              # Fastify plugin: registers /api/auth/* handler + decorates fastify.auth
│   └── rate-limit.ts        # Registers @fastify/rate-limit with global: false
├── routes/
│   ├── auth/                # Auth sub-routes if needed (none — Better Auth owns these)
│   └── (other domains)/
└── hooks/
    └── require-auth.ts      # Reusable preHandler factories: requireSession, requireRole
```

### Pattern 1: Better Auth Instance (lib/auth.ts)

**What:** Single Better Auth config exported as `auth`. All plugins (email-password, admin) configured here. Drizzle adapter mapped to existing plural tables.
**When to use:** Import `auth` anywhere that calls `auth.api.getSession` or registers the handler.

```typescript
// Source: https://better-auth.com/docs/integrations/fastify + https://better-auth.com/docs/adapters/drizzle
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"
import { db } from "./db"
import * as schema from "./db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,           // matches existing plural table names (users, sessions, etc.)
    schema: {
      user: schema.users,      // explicit mapping because Better Auth expects "user" key
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      // AUTH-03: stub — log to console instead of sending email
      console.log(`[PASSWORD RESET] user=${user.email} token=${token} url=${url}`)
    },
  },
  plugins: [admin()],
  // Role injection at signup: player or team chosen by user
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => ({
          data: {
            ...user,
            role: (ctx?.body as { role?: string })?.role ?? "player",
          },
        }),
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },
  advanced: {
    cookiePrefix: "varzeapro",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
})
```

### Pattern 2: Fastify Auth Plugin (plugins/auth.ts)

**What:** Registers a catch-all route under `/api/auth/*` using `toNodeHandler`. Decorates `fastify.auth` so the instance is accessible in hooks.
**When to use:** Registered once in `app.ts` before any protected routes.

```typescript
// Source: https://better-auth.com/docs/integrations/fastify
import fp from "fastify-plugin"
import { toNodeHandler } from "better-auth/node"
import { auth } from "../lib/auth"

export default fp(async (fastify) => {
  fastify.decorate("auth", auth)

  // Better Auth handles ALL /api/auth/* routes internally
  fastify.all("/api/auth/*", async (request, reply) => {
    await toNodeHandler(auth)(request.raw, reply.raw)
  })
})
```

### Pattern 3: preHandler Factories (hooks/require-auth.ts)

**What:** Reusable `preHandler` hooks for session enforcement (401) and role enforcement (403). Attached to route groups, not globally.
**When to use:** Every protected route group registers `requireSession`. Role-specific groups also register `requireRole`.

```typescript
// Source: https://better-auth.com/docs/integrations/fastify + community pattern
import { FastifyRequest, FastifyReply } from "fastify"
import { fromNodeHeaders } from "better-auth/node"
import { auth } from "../lib/auth"

export async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  })
  if (!session) {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    })
  }
  request.session = session
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply)
    if (reply.sent) return
    const role = request.session?.user?.role
    if (!roles.includes(role)) {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      })
    }
  }
}
```

### Pattern 4: Rate Limiting Auth Routes

**What:** `@fastify/rate-limit` registered with `global: false`. Per-route config applied directly to Better Auth's `/api/auth/sign-in/email` and `/api/auth/sign-up/email`.
**When to use:** Auth routes only (SUCCESS CRITERION 5: 5 req / 15 min per IP).

```typescript
// Source: https://github.com/fastify/fastify-rate-limit
await fastify.register(import("@fastify/rate-limit"), { global: false })

// Applied as route-level config (inside the auth plugin or a wrapper):
fastify.addHook("onRoute", (routeOptions) => {
  const authRoutes = ["/api/auth/sign-in/email", "/api/auth/sign-up/email"]
  if (authRoutes.includes(routeOptions.url)) {
    routeOptions.config = {
      ...routeOptions.config,
      rateLimit: { max: 5, timeWindow: "15 minutes" },
    }
  }
})
```

### Pattern 5: Better Auth Tables — What Gets Added

Better Auth's `generate` CLI creates **4 additional tables** beyond `users`. These must be added to the Drizzle schema (Wave 0 of the plan):

| Table | Purpose |
|-------|---------|
| `sessions` | DB-backed session records (id, userId, token, expiresAt, ipAddress, userAgent) |
| `accounts` | OAuth/credential link (id, userId, providerId, accountId, password hash) |
| `verifications` | Email/password-reset verification tokens (id, identifier, value, expiresAt) |

The `admin` plugin adds fields to the `users` table:
- `role` (text, default "user") — conflicts with existing `role` enum; **must be handled by explicit schema mapping**
- `banned` (boolean) — already in existing schema as `banned text`
- `banReason` (text)
- `banExpires` (timestamp)

**Critical:** The existing `users` table uses a custom `roleEnum` (`player | team | admin`). Better Auth's admin plugin defaults role to string `"user"`. The `databaseHooks.user.create.before` pattern overrides this. The explicit `schema` mapping in `drizzleAdapter` ensures Better Auth uses our existing `users` table with our `role` enum column.

### Anti-Patterns to Avoid

- **Global rate limiting:** Applying `@fastify/rate-limit` globally adds overhead to every route. Use `global: false` and configure per auth route.
- **Returning session token in JSON body:** Better Auth's default is HttpOnly cookie. Do not add session data to JSON responses.
- **Storing JWT in sessionStorage on frontend:** HttpOnly cookie is the correct storage. Frontend `api-client.ts` must use `credentials: 'include'` (tracked in STATE.md todos).
- **Calling `auth.api.getSession` without `fromNodeHeaders`:** Fastify headers are plain objects; Better Auth expects a `Headers` instance. Always wrap with `fromNodeHeaders`.
- **Registering auth routes before CORS plugin:** CORS must be registered before Better Auth routes to correctly handle preflight requests with `credentials: true`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT sign/verify + session store | Better Auth sessions | Token rotation, expiry, DB cleanup are non-trivial |
| Password hashing | bcrypt wrapper | Better Auth (uses scrypt internally) | Salt rounds, timing attacks, hash upgrades are handled |
| CSRF protection | Custom CSRF middleware | Better Auth `advanced.crossSubDomainCookies` + SameSite | Already baked into cookie config |
| Password reset tokens | Custom UUID + expiry table | Better Auth `sendResetPassword` callback | Token generation, expiry (1h default), invalidation after use |
| Rate limiting | IP-based request counter | `@fastify/rate-limit` | Sliding window, Redis-ready, header injection |

**Key insight:** Better Auth handles the entire auth lifecycle. The integration surface is: configure `auth.ts`, register `toNodeHandler`, write `preHandler` hooks that call `auth.api.getSession`. Almost nothing needs to be built from scratch.

---

## Common Pitfalls

### Pitfall 1: Table Name Mismatch (usePlural + explicit schema mapping)
**What goes wrong:** Better Auth looks for a `user` table key in the Drizzle schema; our schema exports `users`. Without `usePlural: true` OR explicit `schema` mapping, Better Auth throws `TypeError: undefined is not an object (evaluating 'e._.fullSchema')`.
**Why it happens:** Better Auth's Drizzle adapter defaults to singular table names.
**How to avoid:** Set `usePlural: true` AND provide explicit `schema` mapping for tables where names differ from Better Auth's conventions.
**Warning signs:** Server startup throws on `drizzleAdapter` initialization.

### Pitfall 2: Role Enum vs. Better Auth Admin Plugin Default
**What goes wrong:** Better Auth's admin plugin defaults new users to role `"user"`. Our enum is `("player" | "team" | "admin")`. Inserting `"user"` into a `pgEnum("role", ["player","team","admin"])` column fails with a PostgreSQL enum violation.
**Why it happens:** Admin plugin is designed for a simple string role field, not a constrained enum.
**How to avoid:** Use `databaseHooks.user.create.before` to override the role to a valid enum value. Accept role as an additional field in the signup request body and validate it on the backend.
**Warning signs:** Signup returns 500 with PostgreSQL `invalid input value for enum role: "user"`.

### Pitfall 3: CORS Not Allowing Credentials
**What goes wrong:** Browser preflight fails for auth requests; cookies are not sent; `getSession` always returns null.
**Why it happens:** `credentials: 'include'` on the frontend requires `Access-Control-Allow-Credentials: true` and a specific (non-wildcard) origin on the backend.
**How to avoid:** Register `@fastify/cors` with `credentials: true` and `origin: [process.env.FRONTEND_URL]` BEFORE the Better Auth plugin.
**Warning signs:** Browser console shows CORS error on `/api/auth/*` preflight; network tab shows no `Set-Cookie` header.

### Pitfall 4: Rate Limiting Better Auth's Internal Routes
**What goes wrong:** `@fastify/rate-limit` with `global: true` rate-limits the Fastify handler that passes through to Better Auth. The rate limit applies to the wrapping route (`/api/auth/*`), not to individual auth operations.
**Why it happens:** Better Auth's `toNodeHandler` registers a single catch-all route.
**How to avoid:** Use the `onRoute` hook pattern to inject `rateLimit` config based on the resolved URL, or register two explicit Fastify routes (`POST /api/auth/sign-in/email`, `POST /api/auth/sign-up/email`) that proxy to `toNodeHandler` before the catch-all, each with their own rate limit config.
**Warning signs:** Rate limiting applies to all auth routes or none at all.

### Pitfall 5: Missing Better Auth Schema Tables
**What goes wrong:** Auth flows fail at runtime because `sessions`, `accounts`, or `verifications` tables don't exist.
**Why it happens:** Phase 1 schema was designed for application data, not auth infrastructure.
**How to avoid:** Wave 0 of Phase 2 must add Drizzle schema definitions for `sessions`, `accounts`, and `verifications` tables and run a migration before any auth code executes.
**Warning signs:** Better Auth throws `relation "sessions" does not exist` on first request.

### Pitfall 6: Fastify 5 + toNodeHandler Raw vs. Reply
**What goes wrong:** `reply.raw.end()` is called by Better Auth's handler, but Fastify 5 also tries to finalize the reply, causing "reply already sent" errors.
**Why it happens:** `toNodeHandler` writes directly to `reply.raw` (Node's `ServerResponse`). Fastify 5 monitors reply state.
**How to avoid:** After calling `toNodeHandler`, do NOT return or call `reply.send()`. The raw handler manages the response lifecycle. Mark reply as hijacked: `reply.hijack()` before passing to handler.
**Warning signs:** Fastify logs `Reply was already sent` or response is doubled.

---

## Code Examples

### Complete auth.ts (lib/auth.ts)
```typescript
// Source: https://better-auth.com/docs/integrations/fastify + https://better-auth.com/docs/adapters/drizzle
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"
import { db } from "../db"
import * as schema from "../db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      console.log(`[PASSWORD RESET] email=${user.email} token=${token} url=${url}`)
    },
  },
  plugins: [admin()],
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => ({
          data: {
            ...user,
            role: (ctx?.body as Record<string, unknown>)?.role ?? "player",
          },
        }),
      },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
})

export type Auth = typeof auth
```

### Fastify auth plugin (plugins/auth.ts)
```typescript
// Source: https://better-auth.com/docs/integrations/fastify
import fp from "fastify-plugin"
import { toNodeHandler } from "better-auth/node"
import { auth } from "../lib/auth"

export default fp(async (fastify) => {
  fastify.decorate("auth", auth)

  fastify.all("/api/auth/*", async (request, reply) => {
    reply.hijack()
    await toNodeHandler(auth)(request.raw, reply.raw)
  })
})
```

### Request type augmentation (types/fastify.d.ts)
```typescript
import { Session, User } from "better-auth/types"
import { Auth } from "../lib/auth"

declare module "fastify" {
  interface FastifyInstance {
    auth: Auth
  }
  interface FastifyRequest {
    session?: { session: Session; user: User }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JWT + bcrypt + session table | Better Auth integrated framework | 2024-2025 | Eliminates ~500 lines of auth boilerplate |
| `fastify-session` + `@fastify/cookie` | Better Auth HttpOnly cookie via `toNodeHandler` | 2025 | Better Auth owns cookie lifecycle |
| Passport.js strategies | Better Auth plugins (email-password, admin, OAuth) | 2024 | TypeScript-native, no strategy registry |

**Deprecated/outdated:**
- `fastify-better-auth` community wrapper (GitHub: flaviodelgrosso/fastify-better-auth): Low maintenance activity; official `toNodeHandler` approach is preferred for Fastify 5 compatibility.

---

## Open Questions

1. **`reply.hijack()` compatibility with Better Auth's `toNodeHandler` in Fastify 5**
   - What we know: `toNodeHandler` writes to `reply.raw`; Fastify 5 tracks reply state
   - What's unclear: Whether `reply.hijack()` is the correct way to avoid "reply already sent" conflicts
   - Recommendation: Test in Wave 1 with a smoke test; fall back to `fastify.addContentTypeParser` bypass if needed

2. **Rate limiting on Better Auth's internal catch-all vs. explicit routes**
   - What we know: `@fastify/rate-limit` works on Fastify route configs; Better Auth registers a single catch-all
   - What's unclear: Whether the `onRoute` hook can inject per-URL rate limit config on a catch-all route
   - Recommendation: Register explicit proxy routes for sign-in and sign-up BEFORE the catch-all; apply rate limit config there

3. **Role field conflict: Drizzle `roleEnum` vs. Better Auth admin plugin's string role**
   - What we know: `databaseHooks.user.create.before` overrides the default; explicit schema mapping uses our `users` table
   - What's unclear: Whether Better Auth's admin plugin's `setRole` API respects the pgEnum constraint
   - Recommendation: Test admin `setRole` call in integration tests; if enum violation occurs, patch with a raw Drizzle update instead

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 20.x (Docker) | — |
| PostgreSQL | Database | ✓ | 16 (Docker Compose) | — |
| Docker / Compose | Dev environment | ✓ | 29.x | — |
| better-auth | Auth framework | needs install | 1.5.6 | — |
| @fastify/rate-limit | Rate limiting | needs install | 10.3.0 | — |

**Missing dependencies with no fallback:**
- `better-auth` 1.5.6 — must be installed before any auth code runs
- `@fastify/rate-limit` 10.3.0 — must be installed for auth route rate limiting

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `Projeto/apps/api/vitest.config.ts` (exists from Phase 1) |
| Quick run command | `vitest run --reporter=verbose` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | POST /api/auth/sign-in/email returns HttpOnly cookie, no token in body | integration | `vitest run tests/auth/sign-in.test.ts` | Wave 0 |
| AUTH-01 | Session cookie is HttpOnly (not accessible via JS) | integration | `vitest run tests/auth/sign-in.test.ts` | Wave 0 |
| AUTH-02 | POST /api/auth/sign-up/email with role=player creates user + profile row | integration | `vitest run tests/auth/sign-up.test.ts` | Wave 0 |
| AUTH-02 | POST /api/auth/sign-up/email with role=team creates user + team profile row | integration | `vitest run tests/auth/sign-up.test.ts` | Wave 0 |
| AUTH-03 | POST /api/auth/forget-password logs token to console | integration | `vitest run tests/auth/password-reset.test.ts` | Wave 0 |
| AUTH-04 | GET /protected without session returns 401 | integration | `vitest run tests/auth/rbac.test.ts` | Wave 0 |
| AUTH-04 | GET /protected with valid session but wrong role returns 403 | integration | `vitest run tests/auth/rbac.test.ts` | Wave 0 |
| AUTH-04 | GET /protected with valid session + correct role returns 200 | integration | `vitest run tests/auth/rbac.test.ts` | Wave 0 |
| Rate limit | POST /api/auth/sign-in/email after 5 requests returns 429 | integration | `vitest run tests/auth/rate-limit.test.ts` | Wave 0 |

### Testing Strategy: Fastify `inject()`

Better Auth's `toNodeHandler` writes to `reply.raw`. Fastify's built-in `fastify.inject()` uses `light-my-request` which simulates the Node.js `IncomingMessage`/`ServerResponse` interfaces — this is compatible with `toNodeHandler`. No Supertest needed.

```typescript
// Pattern for auth integration tests
const response = await app.inject({
  method: "POST",
  url: "/api/auth/sign-up/email",
  payload: { email: "test@example.com", password: "Password123!", name: "Test", role: "player" },
})
expect(response.statusCode).toBe(200)
expect(response.headers["set-cookie"]).toMatch(/HttpOnly/)
```

### Sampling Rate
- **Per task commit:** `vitest run tests/auth/ --reporter=verbose`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/auth/sign-in.test.ts` — covers AUTH-01 (cookie, no token in body)
- [ ] `tests/auth/sign-up.test.ts` — covers AUTH-02 (player/team profile creation)
- [ ] `tests/auth/password-reset.test.ts` — covers AUTH-03 (console log stub)
- [ ] `tests/auth/rbac.test.ts` — covers AUTH-04 (401/403/200 matrix)
- [ ] `tests/auth/rate-limit.test.ts` — covers rate limit (429 after 5 requests)
- [ ] `src/db/schema/sessions.ts` — Better Auth sessions table (Drizzle schema)
- [ ] `src/db/schema/accounts.ts` — Better Auth accounts table (Drizzle schema)
- [ ] `src/db/schema/verifications.ts` — Better Auth verifications table (Drizzle schema)
- [ ] `src/types/fastify.d.ts` — Type augmentation for `fastify.auth` and `request.session`
- [ ] DB migration: generate + run after new tables added to schema

---

## Sources

### Primary (HIGH confidence)
- [Better Auth Fastify Integration](https://better-auth.com/docs/integrations/fastify) — `toNodeHandler`, route registration, `getSession` with `fromNodeHeaders`
- [Better Auth Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle) — `usePlural`, explicit schema mapping, `provider: "pg"`
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin) — role field, user management, `databaseHooks` pattern
- [Better Auth Email & Password](https://better-auth.com/docs/authentication/email-password) — `sendResetPassword` callback, password reset token lifecycle
- [npm: better-auth@1.5.6](https://www.npmjs.com/package/better-auth) — version confirmed 2026-03-24
- [npm: @fastify/rate-limit@10.3.0](https://www.npmjs.com/package/@fastify/rate-limit) — version confirmed 2026-03-24

### Secondary (MEDIUM confidence)
- [fastify-better-auth (community plugin)](https://github.com/flaviodelgrosso/fastify-better-auth) — reviewed but not recommended due to maintenance uncertainty (per STATE.md todo)
- [Fastify Testing Guide](https://fastify.dev/docs/v5.3.x/Guides/Testing/) — `inject()` pattern for auth integration tests
- [GitHub discussion: default roles in Better Auth](https://github.com/better-auth/better-auth/discussions/4239) — `databaseHooks.user.create.before` role injection pattern
- [Fastify rate-limit README](https://github.com/fastify/fastify-rate-limit/blob/main/README.md) — `global: false`, per-route `rateLimit` config

### Tertiary (LOW confidence — flag for validation)
- Pitfall 6 (`reply.hijack()` pattern): Based on Fastify 5 docs + community patterns; needs validation in Wave 1 smoke test

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry; Better Auth + Drizzle adapter is documented
- Architecture: HIGH — `toNodeHandler` pattern documented officially; `preHandler` hook pattern is standard Fastify
- Pitfalls: HIGH (1-5) / LOW (6) — table mismatch, enum conflict, CORS, rate limit scope, missing tables all verified; `reply.hijack()` behavior needs smoke test
- Testing: HIGH — Fastify `inject()` confirmed compatible with `toNodeHandler`

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (Better Auth releases frequently; re-check if > 30 days)

---

## Project Constraints (from CLAUDE.md)

These directives MUST be honored by the planner:

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| Fastify + Node.js + TypeScript — non-negotiable | Auth plugin must be a Fastify plugin registered in the plugin chain |
| Better Auth — non-negotiable auth library | No alternative auth libraries; no custom JWT implementation |
| PostgreSQL — relational DB | Sessions, accounts, verifications go in PostgreSQL via Drizzle |
| HttpOnly cookies for auth tokens | `advanced.defaultCookieAttributes.httpOnly: true`; NO token in JSON body |
| Rate limiting on all public endpoints | `@fastify/rate-limit` with 5 req/15min on `/api/auth/sign-in/email` and `/api/auth/sign-up/email` |
| Input validation via Zod | Signup/login request bodies validated with Zod schemas matching `~shared/contracts` |
| Backend responses match `~shared/contracts` exactly | Auth response shapes (`SessionUser`, `AuthResponse`) must match frontend contract types |
| Frontend is complete — do not modify | `api-client.ts` credential mode migration (`credentials: 'include'`) is a TRACKED TODO, not a Phase 2 task |
| Security in every phase | CORS credentials config, HttpOnly, rate limiting all required in this phase |
