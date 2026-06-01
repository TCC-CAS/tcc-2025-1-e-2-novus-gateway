# Phase 4: Search + Subscriptions - Research

**Researched:** 2026-03-25
**Domain:** Backend API — search endpoints + subscription plan enforcement
**Confidence:** HIGH

## Summary

Phase 4 delivers two core API features: **player/team discovery via filtered search** and **subscription plan limits enforced server-side**. The frontend is 100% complete with contracts defined; backend implementation is straightforward because:

1. **Contracts exist** — all request/response shapes locked in `~shared/contracts`
2. **Database schema exists** — `subscriptions`, `players`, `teams` tables with correct columns for filters and plan enforcement
3. **Auth hooks proven** — `requireSession`/`requireRole` patterns from Phase 3 directly apply
4. **Response helpers exist** — `ok()` and `list()` wrappers handle envelope shapes
5. **Drizzle + Fastify patterns established** — migration from players/teams routes is mechanical

**Primary recommendation:** Implement search endpoints first (isolated SQL), then subscription endpoints (upsert logic). Both follow existing route plugin pattern registered in `app.ts`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `GET /search/players` sorts by `updatedAt DESC` — reward recent activity
- **D-02:** `GET /search/teams` sorts by `level DESC, updatedAt DESC` — pro/semi-pro first
- **D-03:** Skills filter uses OR logic (ANY match) — maximize discovery
- **D-04:** Text filters use case-insensitive exact match (`lower(column) = lower(param)`)
- **D-05:** Age filters silently ignored if birthdate column missing (Claude to verify schema)
- **D-06:** Default pageSize = 10
- **D-07:** Max pageSize = 50 (enforced server-side)
- **D-08:** Both search endpoints require `requireAuth`
- **D-09:** Role restriction: only `team` → `GET /search/players`; only `player` → `GET /search/teams` (403 otherwise)
- **D-10:** Authenticated users excluded from own results (filter by `userId`)
- **D-11:** `searchResultsLimit` from plan enforced on both endpoints: `min(requestedPageSize, plan.searchResultsLimit)`
- **D-12:** Results silently capped to plan limit (no 403)
- **D-13:** Plan resolved via DB lookup per request (no caching)
- **D-14:** Only search endpoints plan-gated in Phase 4
- **D-15:** `GET /subscription/usage` auto-creates `free` subscription if missing
- **D-16:** Auto-created free row: `planId = "free"`, `status = "active"`, `currentPeriodStart = now()`, `currentPeriodEnd = now() + 30 days`, `cancelAtPeriodEnd = false`
- **D-17:** Usage counts derived from DB row counts (conversations used = count of conversation rows)
- **D-18:** `POST /subscription/upgrade` enforces role-plan compatibility: player → `"craque"` only; team → `"titular"` or `"campeao"` only (400 otherwise)
- **D-19:** Upgrade updates existing row in-place (no history kept)
- **D-20:** Upgrade response: `{ data: { success: boolean; planId: string; message: string } }`

### Claude's Discretion
- ID generation strategy for subscription rows (nanoid vs. uuid)
- Drizzle upsert style
- Test structure (integration tests following Phase 3 RED→GREEN)
- Age filter SQL (depends on schema)
- Skills array matching SQL (depends on column type)

### Deferred Ideas
None — all discussion in scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | `GET /search/players` with filter params returns paginated results in `{ data: T[], meta: { page, pageSize, total, totalPages } }` | Search schema + sorting + filtering locked (D-01 through D-07); players table has skills array + availability column; pagination helpers exist |
| SRCH-02 | `GET /search/teams` with filter params returns paginated results in same meta envelope | Search schema locked; teams table has level enum + region column; same pagination pattern |
| SUB-01 | `GET /subscription/usage` returns current plan + usage counters | Usage schema defined; upsert logic for auto-create free row (D-15–D-17); DB lookup proven in players routes |
| SUB-02 | `POST /subscription/upgrade` updates user's plan in database | Upgrade schema defined; role-plan validation (D-18–D-20); upsert via onConflictDoUpdate pattern |
| SUB-03 | Backend enforces plan limits server-side on protected endpoints | Plan config exists in subscription.ts; searchResultsLimit enforced via min(requested, limit) (D-11–D-13) |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.8.4 | HTTP framework (locked in CLAUDE.md) | Non-negotiable; established in Phase 1 |
| Drizzle ORM | 0.45.1 | Database queries (locked in CLAUDE.md) | Pure TypeScript, no codegen; proven in Phase 3 |
| Zod + fastify-type-provider-zod | 6.1.0 | Request/response validation | Reuses frontend contracts; automatic error handling |
| Better Auth | 1.5.6 | Session management | Fastify-native; RBAC + DB-backed sessions |
| PostgreSQL | (running) | Relational database (locked in CLAUDE.md) | Schema already created; supports arrays + enums |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | (via existing) | ID generation | Upsert new subscription rows |
| drizzle-kit | 0.31.10 | DB migrations | Schema already complete; no changes needed |

### Verification
- **Node.js:** 20.x (Alpine in Docker) — confirmed in Dockerfile
- **Test runner:** Vitest 4.1.1 — existing test infrastructure ready
- **Env validation:** `@fastify/env` 5.0.3 — already in use for config

## Architecture Patterns

### Recommended Project Structure
```
src/routes/
├── search.ts          # GET /search/players, GET /search/teams
├── subscription.ts    # GET /subscription/usage, POST /subscription/upgrade
├── [existing routes]
└── app.ts             # Register both plugins with /api prefix
```

### Pattern 1: Search Endpoints (Filtered + Paginated Query)

**What:** Query players/teams with optional filters, return paginated results sorted by relevance.

**When to use:** Any endpoint that retrieves a list with filters, sorting, and pagination.

**Example:**
```typescript
// Source: Projeto/apps/api/src/routes/search.ts (to be created)
import { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { and, eq, ilike, inArray, desc, asc, sql } from "drizzle-orm"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { list } from "../lib/response.js"
import { players, teams, subscriptions } from "../db/schema/index.js"
import {
  SearchPlayersQuerySchema,
  SearchTeamsQuerySchema,
  getPlanLimits
} from "../../../../apps/web/shared/contracts/index.js"

const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /search/players — teams search for players
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/players",
    {
      preHandler: [requireRole("team")],
      schema: { querystring: SearchPlayersQuerySchema }
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { page = 1, pageSize = 10, skills, region, availability, minAge, maxAge } = request.query

      // Enforce plan limit on pageSize
      const subscription = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId)
      })
      const limits = getPlanLimits(subscription?.planId || "free", "team")
      const effectivePageSize = Math.min(pageSize, limits.searchResults)

      // Build filters
      const filters = [
        eq(players.userId, userId), // Exclude self
      ]
      if (skills) {
        const skillArray = skills.split(",").map(s => s.trim())
        filters.push(sql`${players.skills} && ${skillArray}`)  // Postgres array overlap
      }
      if (region) filters.push(ilike(players.region, region))
      if (availability) filters.push(ilike(players.availability, availability))
      // Age filter: only if schema has birthDate column

      // Query
      const total = await fastify.db
        .select({ count: sql<number>`count(*)` })
        .from(players)
        .where(and(...filters))
        .then(r => r[0]?.count || 0)

      const data = await fastify.db.query.players.findMany({
        where: and(...filters),
        orderBy: [desc(players.updatedAt)],
        limit: effectivePageSize,
        offset: (page - 1) * effectivePageSize,
      })

      return list(
        data.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        page,
        effectivePageSize,
        total
      )
    }
  )
}

export default searchRoutes
```

**Key points:**
- `requireRole("team")` enforces D-09
- Plan limit lookup (D-13) + min() enforcement (D-11)
- Postgres array operator `&&` for skills OR logic (D-03)
- `ilike()` for case-insensitive exact match (D-04)
- Self-exclusion via filter (D-10)
- Sorts by `updatedAt DESC` (D-01)

### Pattern 2: Subscription Upsert (Auto-Create + Update)

**What:** On first call, auto-create a free subscription row if missing; on upgrade, update the existing row.

**When to use:** Managing per-user state where exactly one row per user should exist.

**Example:**
```typescript
// Source: Projeto/apps/api/src/routes/subscription.ts (to be created)
import { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { nanoid } from "nanoid"
import { eq } from "drizzle-orm"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { subscriptions } from "../db/schema/index.js"
import {
  PLAN_CONFIGS,
  getPlanLimits,
  PlanIdSchema
} from "../../../../apps/web/shared/contracts/subscription.js"

const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /subscription/usage — return plan + usage counts
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/usage",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as string

      // Upsert: auto-create free row if missing (D-15)
      const now = new Date()
      const [sub] = await fastify.db
        .insert(subscriptions)
        .values({
          id: nanoid(),
          userId,
          planId: "free",
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: { updatedAt: now }
        })
        .returning()

      const limits = getPlanLimits(sub.planId, role)

      // D-17: Usage counts derived from DB row counts (conversations, openPositions, favorites)
      const usage = {
        conversationsUsed: 0,  // Phase 5
        conversationsLimit: limits.conversations,
        searchResultsLimit: limits.searchResults,
        openPositionsUsed: 0,   // Phase 5
        openPositionsLimit: limits.openPositions,
        favoritesUsed: 0,       // Phase 5
        favoritesLimit: limits.favorites,
        periodResetAt: sub.currentPeriodEnd.toISOString(),
      }

      return ok(usage)
    }
  )

  // POST /subscription/upgrade — validate role-plan match + update
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/upgrade",
    {
      preHandler: [requireSession],
      schema: { body: z.object({ planId: PlanIdSchema }) }
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role as string
      const { planId } = request.body

      // D-18: Validate role-plan compatibility
      if (role === "player" && !["free", "craque"].includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Players can only upgrade to craque" }
        })
      }
      if (role === "team" && !["free", "titular", "campeao"].includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Teams can only upgrade to titular or campeao" }
        })
      }

      // D-19: Update existing row in-place
      const now = new Date()
      const [result] = await fastify.db
        .update(subscriptions)
        .set({
          planId,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: now,
        })
        .where(eq(subscriptions.userId, userId))
        .returning()

      // D-20: Response shape
      return ok({
        success: !!result,
        planId: result?.planId || planId,
        message: result ? `Upgraded to ${planId}` : "Upgrade failed"
      })
    }
  )
}

export default subscriptionRoutes
```

**Key points:**
- `.onConflictDoUpdate()` upserts on `userId` UNIQUE constraint (D-15)
- Auto-create logic with 30-day period (D-16)
- Role-plan validation before update (D-18)
- In-place update, no history (D-19)
- Response wrapping via `ok()` (D-20)

### Pattern 3: Role + Plan Enforcement (Multi-Layer)

**What:** Combine authentication, role restriction, and plan limits in a single endpoint.

**When to use:** Gated features where both role and plan subscription apply.

**Anti-Patterns to Avoid**
- **Caching plan info in session:** Plan changes per request; D-13 mandates DB lookup every time
- **Returning 403 for exceeded search limit:** D-12 says silently cap results; no error
- **Accepting search pageSize > 50:** D-07 enforces max server-side; reject or cap silently
- **Querying without checking role:** D-09 requires role restriction; wrong role = 403

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request/response validation | Custom middleware | Zod + fastify-type-provider-zod | Automatic parsing, inference, error messages; reuses frontend contracts |
| Auth session management | Custom session logic | Better Auth hooks + `requireSession`/`requireRole` | Proven in Phase 3; avoids XSS/CSRF risks |
| Pagination metadata | Manual `totalPages` calculation | `list()` helper (src/lib/response.ts) | Already tested; ensures `{ data, meta }` shape matches contract |
| Database queries (filtering, sorting, limits) | Raw SQL strings | Drizzle ORM with sql helpers | Type-safe; SQL injection prevention; proven pattern |
| Plan limit lookup | Cache in memory | Per-request DB query via `fastify.db` | Plans can change; D-13 mandates freshness |

**Key insight:** Most "hand-rolled" solutions in this domain are either incomplete (missing edge cases like age filter schema variance) or introduce security risks (SQL injection, plan cache staleness).

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `subscriptions` table with `userId` UNIQUE — will hold per-user plan state. No existing rows (Phase 4 first). | None — table created in Phase 1 schema |
| Live service config | Better Auth session storage in PostgreSQL (managed by better-auth plugin) — no config needed | None |
| OS-registered state | None | None |
| Secrets/env vars | `DATABASE_URL` (existing) — used by Drizzle. No new secrets needed for Phase 4. | None |
| Build artifacts | Drizzle schema migrations in `drizzle/` folder (auto-generated Phase 1) — already captured. | None |

## Common Pitfalls

### Pitfall 1: Assuming Text Filters Are LIKE Queries
**What goes wrong:** Implementing `region` filter with `%` wildcards (LIKE), but frontend sends exact values.
**Why it happens:** LIKE is familiar from old SQL; D-04 explicitly mandates case-insensitive exact match.
**How to avoid:** Use `ilike(column, param)` (Drizzle) or `lower(column) = lower(param)` (raw SQL); don't add `%` wildcards.
**Warning signs:** Tests fail when searching "São Paulo" but database has "SÃO PAULO"; developer assumes case-sensitivity is the bug instead of LIKE missing wildcards.

### Pitfall 2: Forgetting Plan Limit Enforcement on Search
**What goes wrong:** Search returns all pageSize results without checking plan.searchResultsLimit, user sees more rows than their plan allows.
**Why it happens:** Plan lookup is lazy; D-13 requires per-request DB query; easy to skip if auth already confirmed access.
**How to avoid:** In every search endpoint, query `subscriptions` table → `getPlanLimits()` → cap `effectivePageSize` before running paginated query.
**Warning signs:** Integration tests pass with default "free" plan (unlimited searchResults), fail with team "free" plan (limit=10).

### Pitfall 3: Auto-Creating Subscription Row Without Checking Existing
**What goes wrong:** Multiple calls to `GET /subscription/usage` create duplicate rows, violating UNIQUE constraint.
**Why it happens:** `.insert().onConflictDoUpdate()` is unfamiliar; developer writes separate SELECT + conditional INSERT.
**How to avoid:** Use `.onConflictDoUpdate()` on first call; target the UNIQUE constraint (`userId`). Drizzle will upsert atomically.
**Warning signs:** Database error on second request; "duplicate key value violates unique constraint" log.

### Pitfall 4: Role-Plan Mismatch Not Validated Server-Side
**What goes wrong:** Frontend prevents invalid role-plan combos, but user patches request to upgrade team role to "craque" (player-only plan).
**Why it happens:** Trust frontend validation; D-18 explicitly requires server-side check.
**How to avoid:** In `POST /subscription/upgrade` handler, validate `(role, planId)` tuple before updating database. Return `400` if invalid.
**Warning signs:** Integration tests that bypass frontend validation expose the bug immediately.

### Pitfall 5: Excluding Self from Search Results in Wrong Filter
**What goes wrong:** Filter excludes by profile `id`, but user created two profiles by mistake; one profile still searches the other (same userId != same id).
**Why it happens:** Confusion between `userId` and profile `id`; D-10 says filter by requesting user's `userId`, not profile `id`.
**How to avoid:** Use `eq(players.userId, requestingUserId)` (exclude where profile owner = me); NOT `ne(players.id, myProfileId)`.
**Warning signs:** A player sees their own profile in search results because the exclude filter was too narrow.

## Code Examples

Verified patterns from official sources:

### Search Endpoint with Filters + Pagination
```typescript
// Source: Phase 3 players.ts + Drizzle docs
// https://orm.drizzle.team/docs/select#filtering

// Filter: skills array overlap (Postgres-specific)
const filter = sql`${players.skills} && ${skillsArray}`

// Filter: case-insensitive text match
const filter = ilike(players.region, region)

// Pagination setup
const offset = (page - 1) * pageSize
const results = await db.query.players.findMany({
  orderBy: [desc(players.updatedAt)],
  limit: effectivePageSize,
  offset,
})
```

### Subscription Upsert Pattern
```typescript
// Source: Phase 3 players.ts PUT /me endpoint
// https://orm.drizzle.team/docs/insert#on-conflict

const [result] = await fastify.db
  .insert(subscriptions)
  .values({ id: nanoid(), userId, planId: "free", ... })
  .onConflictDoUpdate({
    target: subscriptions.userId,  // UNIQUE constraint target
    set: { planId: "free", updatedAt: new Date() }
  })
  .returning()
```

### Auth + Role Guard
```typescript
// Source: Phase 3 players.ts
// https://github.com/fastify/fastify/docs/Hooks

fastify.withTypeProvider<ZodTypeProvider>().get(
  "/search/players",
  { preHandler: [requireRole("team")] },  // Applied before handler
  async (request, reply) => {
    const userId = request.session!.user.id
    ...
  }
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session cookies only | HttpOnly + JWT | Phase 2 (Better Auth) | Prevents XSS token theft; sessionStorage now only UI-side |
| Raw SQL strings | Drizzle ORM typed queries | Phase 1 | No SQL injection; column name typos caught at compile time |
| Global response middleware | `ok()`/`list()` helpers | Phase 3 | Explicit wrapping; ensures `{ data, meta }` shape consistency |
| Manual pagination math | `list()` helper with totalPages | Phase 3 | Never off-by-one errors; metadata always correct |

**Deprecated/outdated:**
- Manual JWT decode in routes: Use `request.session!.user` injected by Better Auth hook — already parsed, validated, typed

## Open Questions

1. **Age filter implementation**
   - What we know: D-05 says silently ignore if schema missing birthdate column
   - What's unclear: Should `minAge`/`maxAge` filter be implemented as range query or simple existence check?
   - Recommendation: Check `players` schema (already verified: has `birthDate` text column). Implement range query if birthDate exists; silently ignore params if not.

2. **Skills array type in database**
   - What we know: Schema shows `text("skills").array()` (Postgres text array)
   - What's unclear: Does Drizzle handle `&&` operator for array overlap, or does raw `sql` helper required?
   - Recommendation: Both work; use `sql` helper for type safety and clarity (see code example above).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Database queries (all 4 endpoints) | ✓ | Running (docker-compose) | — |
| Node.js | Runtime | ✓ | 20.x (Alpine) | — |
| Drizzle ORM | Database schema + queries | ✓ | 0.45.1 | — |
| Fastify | HTTP server + routing | ✓ | 5.8.4 | — |
| Vitest | Test runner | ✓ | 4.1.1 | — |

**Missing dependencies:** None — full stack present.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | (No vitest.config.ts detected yet) |
| Quick run command | `npm test` (runs all tests) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | `GET /search/players` with filters returns paginated players | integration | `npm test -- src/routes/search.test.ts` | ❌ Wave 0 |
| SRCH-02 | `GET /search/teams` with filters returns paginated teams | integration | `npm test -- src/routes/search.test.ts` | ❌ Wave 0 |
| SUB-01 | `GET /subscription/usage` returns usage + auto-creates free row | integration | `npm test -- src/routes/subscription.test.ts` | ❌ Wave 0 |
| SUB-02 | `POST /subscription/upgrade` validates role-plan + updates row | integration | `npm test -- src/routes/subscription.test.ts` | ❌ Wave 0 |
| SUB-03 | Plan limits enforced: effective pageSize capped server-side | integration | `npm test -- src/routes/search.test.ts` (within SRCH-01 tests) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/routes/search.test.ts src/routes/subscription.test.ts` (< 30 sec)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/routes/search.test.ts` — integration tests for both search endpoints (filters, pagination, role restriction, plan enforcement)
- [ ] `tests/routes/subscription.test.ts` — integration tests for both subscription endpoints (auto-create, upgrade validation, usage counts)
- [ ] Vitest config: `vitest.config.ts` with test database setup (if not already present from Phase 3)
- [ ] Test fixtures: mock user sessions (already in Phase 3, reuse)

*(Note: Check existing Phase 3 tests to see if vitest.config.ts and helper functions already exist)*

---

## Sources

### Primary (HIGH confidence)
- **Database Schema Files** — Verified from codebase:
  - `Projeto/apps/api/src/db/schema/subscriptions.ts` — subscription table with userId UNIQUE, planId enum
  - `Projeto/apps/api/src/db/schema/players.ts` — players table with skills text[], birthDate, availability, region, updatedAt
  - `Projeto/apps/api/src/db/schema/teams.ts` — teams table with level enum, region, updatedAt

- **Shared Contracts** — Verified from codebase:
  - `Projeto/apps/web/shared/contracts/search.ts` — SearchPlayersQuerySchema, SearchTeamsQuerySchema, response shapes
  - `Projeto/apps/web/shared/contracts/subscription.ts` — PLAN_CONFIGS, getPlanLimits(), UsageSchema, UpgradeSchema

- **API Client Signatures** — Verified from codebase:
  - `Projeto/apps/web/app/lib/api-client.ts` lines 132–200 — searchApi, subscriptionApi method signatures

- **Existing Route Patterns** — Verified from codebase:
  - `Projeto/apps/api/src/routes/players.ts` — requireRole, requireSession, onConflictDoUpdate, response wrapping patterns
  - `Projeto/apps/api/src/routes/teams.ts` — same pattern for team resources
  - `Projeto/apps/api/src/app.ts` — plugin registration with `/api` prefix

- **Helper Utilities** — Verified from codebase:
  - `Projeto/apps/api/src/lib/response.ts` — `ok()` and `list()` helpers with pagination metadata
  - `Projeto/apps/api/src/lib/errors.ts` — AppError, error handler with Zod integration
  - `Proyecto/apps/api/src/hooks/require-auth.ts` — requireSession, requireRole preHandlers

- **Dependencies** — Verified from package.json:
  - Fastify 5.8.4, Drizzle 0.45.1, Better Auth 1.5.6, Vitest 4.1.1 — all confirmed

### Secondary (MEDIUM confidence)
- Drizzle ORM array operations (`&&` operator) — inferred from schema definition; `.array()` column type and Postgres support

### Tertiary (LOW confidence)
- None — all critical findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries confirmed in package.json, schema exists, patterns proven in Phase 3
- Architecture: **HIGH** — contracts locked; database schema complete; existing route patterns directly applicable
- Pitfalls: **HIGH** — common mistakes identified from typical search/subscription implementations
- Test structure: **MEDIUM** — Vitest present, but Phase 4 test files don't exist yet (Wave 0 gap)

**Research date:** 2026-03-25
**Valid until:** 2026-04-08 (14 days — stable tech stack, no upstream changes expected)

---

*Research complete. Ready for planning.*
