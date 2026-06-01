# Phase 3: Player + Team Profiles - Research

**Researched:** 2026-03-25
**Domain:** Backend REST API for player and team profile management (CRUD)
**Confidence:** HIGH

## Summary

Phase 3 delivers 6 REST endpoints for authenticated profile management. All response shapes are already defined in shared contracts; database schema exists in Drizzle. The backend infrastructure (auth, error handling, response wrapping) is in place from Phase 2. This phase is primarily **endpoint implementation** — routing, upsert logic, and role enforcement following established patterns.

**Primary recommendation:** Create `src/routes/players.ts` and `src/routes/teams.ts` as Fastify plugins. Use Drizzle's `.onConflictDoUpdate()` for upserts (natural fit for `userId UNIQUE` constraint). Leverage existing `requireRole()` preHandler and `ok()` response wrapper.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-09)
- **D-01/D-02:** GET endpoints return 404 when no profile exists (frontend handles via setup flow)
- **D-03/D-04:** Public read endpoints return 404 for missing profiles
- **D-05/D-06:** Role enforcement: `requireRole('player')` for GET/PUT /players/me; `requireRole('team')` for GET/PUT /teams/me
- **D-07:** Public reads (`GET /players/:id`, `GET /teams/:id`) require only `requireAuth` (any role permitted)
- **D-08:** PUT endpoints are upserts — insert if no row exists, update if exists (keyed on `userId`)
- **D-09:** PUT handlers MUST explicitly set `updatedAt: new Date()` (Drizzle `defaultNow()` only fires on INSERT)

### Claude's Discretion
- ID generation strategy (nanoid vs crypto.randomUUID)
- Test structure (unit vs integration vs both)
- Drizzle query style (`.onConflictDoUpdate()` vs select-then-insert/update)

### Deferred Ideas (OUT OF SCOPE)
- None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | Player can create and edit their own profile (`PUT /players/me`) | ✓ Upsert pattern, DB schema, auth enforcement defined |
| PLAY-02 | Player can view their own profile (`GET /players/me`) | ✓ Role-based preHandler, 404 on missing profile |
| PLAY-03 | Anyone (authenticated) can view a player's public profile (`GET /players/:id`) | ✓ Public read pattern, `requireAuth` only |
| TEAM-01 | Team user can create and edit their own team profile (`PUT /teams/me`) | ✓ Upsert pattern, DB schema, team role enforcement |
| TEAM-02 | Team user can view their own profile (`GET /teams/me`) | ✓ Role-based preHandler, 404 on missing profile |
| TEAM-03 | Anyone (authenticated) can view a team's public profile (`GET /teams/:id`) | ✓ Public read pattern, `requireAuth` only |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.x | HTTP server with TypeScript support | Project non-negotiable; already integrated in Phase 2 |
| Drizzle ORM | Latest | Type-safe SQL query builder | Phase 1 decision; pure TS, no codegen |
| fastify-type-provider-zod | Latest | Zod schema validation in route handlers | Reuses frontend contracts without duplication |
| PostgreSQL | 15+ | Relational database | Schema complete in Phase 1; players and teams tables ready |
| Better Auth | 1.5.6+ | Session management and RBAC | Phase 2 integrated; provides `requireSession`, role extraction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | Latest | ID generation for new profiles | Preferred for short, URL-safe IDs (11 chars by default) |
| zod | 4.3+ | Schema validation (imported from shared contracts) | Already used in form validation; reuse same schemas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `.onConflictDoUpdate()` | Select-then-insert/update | Onflict is atomic; select-then-update introduces race condition risk |
| nanoid | crypto.randomUUID | nanoid is shorter (URL-friendly); UUID is std but longer |

## Architecture Patterns

### Recommended Project Structure
```
src/routes/
├── health.ts        # [existing] - example route plugin
├── players.ts       # [new] - GET/PUT /players/me, GET /players/:id
├── teams.ts         # [new] - GET/PUT /teams/me, GET /teams/:id
└── ...

src/hooks/
├── require-auth.ts  # [existing] - requireSession, requireRole preHandlers
```

### Pattern 1: Route Plugin with Zod Type Provider
**What:** Routes declared as Fastify plugins, schema validation via Zod (fastify-type-provider-zod)
**When to use:** All routes; integrates schema validation with Better Auth session injection
**Example:**
```typescript
// src/routes/players.ts
import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { PlayerProfileSchema, UpsertPlayerProfileRequestSchema } from "~shared/contracts"
import { requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { players } from "../db/schema/index.js"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

const playersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    {
      schema: {
        response: { 200: PlayerProfileSchema },
      },
      preHandler: [requireRole("player")],
    },
    async (request, reply) => {
      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.userId, request.session!.user.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }
      return ok(profile)
    }
  )

  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/me",
    {
      schema: {
        body: UpsertPlayerProfileRequestSchema,
        response: { 200: PlayerProfileSchema },
      },
      preHandler: [requireRole("player")],
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const input = request.body

      const result = await fastify.db
        .insert(players)
        .values({
          id: nanoid(),
          userId,
          name: input.name,
          photoUrl: input.photoUrl || null,
          positions: input.positions,
          bio: input.bio || null,
          skills: input.skills,
          height: input.height || null,
          weight: input.weight || null,
          birthDate: input.birthDate || null,
          phone: input.phone || null,
          availability: input.availability || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: players.userId,
          set: {
            name: input.name,
            photoUrl: input.photoUrl || null,
            positions: input.positions,
            bio: input.bio || null,
            skills: input.skills,
            height: input.height || null,
            weight: input.weight || null,
            birthDate: input.birthDate || null,
            phone: input.phone || null,
            availability: input.availability || null,
            updatedAt: new Date(), // CRITICAL: D-09
          },
        })
        .returning()

      return ok(result[0])
    }
  )

  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: PlayerProfileSchema },
      },
      preHandler: [requireSession],
    },
    async (request, reply) => {
      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.id, request.params.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }
      return ok(profile)
    }
  )
}

export default playersRoutes
```

### Pattern 2: Upsert with onConflictDoUpdate
**What:** Single INSERT ... ON CONFLICT DO UPDATE statement using Drizzle
**When to use:** Profile PUT endpoints where `userId` is unique and identifies the resource
**Why:** Atomic operation; eliminates race conditions from select-then-update
**Database constraint:** `userId UNIQUE` on both `players` and `teams` tables ensures natural upsert key

### Pattern 3: Role-Based Prehandler Stack
**What:** `requireRole('player')` or `requireRole('team')` preHandler injected per endpoint
**When to use:** Own-profile endpoints (GET/PUT /me) — enforce that player user cannot call team endpoints
**Existing:** `requireRole()` from `src/hooks/require-auth.ts` already implements 401/403 logic

### Anti-Patterns to Avoid
- **Manual ID collision detection:** Don't select-then-insert; use `.onConflictDoUpdate()`
- **Forgetting D-09:** Don't rely on `defaultNow()` for updates; set `updatedAt` in the upsert explicitly
- **Mixing auth patterns:** Don't create custom session validation; use `requireSession` or `requireRole` preHandlers
- **Response inconsistency:** Always wrap with `ok()` helper; never return bare data or custom shape
- **404 handling:** Don't throw errors for missing profiles; use `reply.status(404).send({error: {...}})` pattern

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session validation on each endpoint | Custom session parsing in handler | `requireSession` / `requireRole` preHandlers | Centralizes auth logic; prevents inconsistencies |
| Upsert logic (select-then-insert/update) | Custom conditional inserts | Drizzle `.onConflictDoUpdate()` | Atomic; handles race conditions; cleaner code |
| Response wrapping | Manual `{ data: T }` objects | `ok()` helper from `response.ts` | Consistent with existing routes; matches contracts |
| Error responses | Custom error objects | `AppError` class + `reply.status().send({error: {...}})` | Standardized error format; registered error handler |
| ID generation | Manual string concatenation or UUIDs | nanoid library | Shorter, URL-safe, standard in Node ecosystem |

**Key insight:** Phase 2 established all infrastructure (auth, errors, responses). Phase 3 is endpoint plumbing that reuses those abstractions. Custom code here is a red flag.

## Common Pitfalls

### Pitfall 1: Forgetting updatedAt in Upsert (D-09 Violation)
**What goes wrong:** Update request completes but `updatedAt` remains the original timestamp; frontend cache doesn't invalidate
**Why it happens:** Drizzle's `defaultNow()` only fires on INSERT; ORM doesn't auto-update on subsequent updates
**How to avoid:** Always explicitly set `updatedAt: new Date()` in the `set` clause of `.onConflictDoUpdate()`
**Warning signs:** Profile timestamps don't change after PUT; search results show stale "updatedAt"

### Pitfall 2: Role Enforcement Mistakes (D-05/D-06 Violation)
**What goes wrong:** Player calls `PUT /teams/me` or vice versa; gets unexpected 200 or 403
**Why it happens:** Using wrong `requireRole()` arg or forgetting preHandler entirely
**How to avoid:** Player endpoints use `requireRole('player')`, team endpoints use `requireRole('team')`, public reads use `requireSession` only
**Warning signs:** RBAC test fails; wrong role can modify wrong profile

### Pitfall 3: Missing 404 Handling on Reads (D-01/D-02/D-03/D-04 Violation)
**What goes wrong:** GET /players/me returns 200 with null/undefined; frontend crashes on missing profile
**Why it happens:** Not checking if profile row exists; defaulting to 200
**How to avoid:** Always `findFirst()` and check result; return `reply.status(404)` if null
**Warning signs:** Frontend error boundary fires on profile page; test assertions for 404 fail

### Pitfall 4: Trusting Frontend Contracts Without Verification
**What goes wrong:** Implement endpoint matching old contract shape; frontend gets unexpected field
**Why it happens:** Contract changed in Phase 2 or frontend; not verifying schema match
**How to avoid:** Before implementation, read `players.ts` and `teams.ts` contracts in `~shared/contracts`; ensure database fields match
**Warning signs:** Tests pass but frontend UI is blank or shows validation errors

## Code Examples

Verified patterns from existing codebase:

### GET Endpoint with 404 Handling
```typescript
// Source: Project pattern (require-auth.ts + app.ts)
fastify.get(
  "/",
  { preHandler: [requireSession] },
  async (request, reply) => {
    const item = await fastify.db.query.table.findFirst({
      where: eq(table.id, "some-id"),
    })
    if (!item) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Not found" },
      })
    }
    return ok(item)
  }
)
```

### Upsert with onConflictDoUpdate
```typescript
// Source: Drizzle documentation + Phase 3 CONTEXT.md (D-08)
const result = await fastify.db
  .insert(players)
  .values({
    id: nanoid(),
    userId: request.session!.user.id,
    name: input.name,
    // ... all fields
    updatedAt: new Date(), // D-09: Always set
  })
  .onConflictDoUpdate({
    target: players.userId, // Unique constraint
    set: {
      name: input.name,
      // ... updated fields
      updatedAt: new Date(), // D-09: Set again on update
    },
  })
  .returning()

return ok(result[0])
```

### Role-Enforced Endpoint
```typescript
// Source: require-auth.ts + app.ts (admin test route)
fastify.put(
  "/me",
  {
    schema: { body: UpsertPlayerProfileRequestSchema },
    preHandler: [requireRole("player")], // D-05
  },
  async (request, reply) => {
    // request.session!.user.role === "player" guaranteed here
    // returns 403 if called with team user
  }
)
```

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond PostgreSQL, which is confirmed deployed in Phase 1 with Drizzle integration)

## Validation Architecture

Test framework detection:
- **Framework:** Vitest (detected: `Projeto/apps/api/package.json` + Phase 2 execution metrics)
- **Config file:** `Projeto/apps/api/vitest.config.ts` or `vite.config.ts` with Vitest plugin
- **Quick run:** `npm run test` (dev mode)
- **Full suite:** `npm run test` (all tests)

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Status |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | PUT /players/me creates profile if not exists | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-01 | PUT /players/me updates profile if exists | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-02 | GET /players/me returns own profile with 200 | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-02 | GET /players/me returns 404 if no profile exists | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-02 | GET /players/me returns 401 if not authenticated | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-02 | GET /players/me returns 403 if user is team (not player) | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-03 | GET /players/:id returns public profile with 200 | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-03 | GET /players/:id returns 404 if profile not found | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| PLAY-03 | GET /players/:id returns 401 if not authenticated | integration | `npm run test -- players.test.ts` | ❌ Wave 0 |
| TEAM-01 | PUT /teams/me creates profile if not exists | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-01 | PUT /teams/me updates profile if exists | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-02 | GET /teams/me returns own profile with 200 | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-02 | GET /teams/me returns 404 if no profile exists | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-02 | GET /teams/me returns 401 if not authenticated | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-02 | GET /teams/me returns 403 if user is player (not team) | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-03 | GET /teams/:id returns public profile with 200 | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-03 | GET /teams/:id returns 404 if profile not found | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |
| TEAM-03 | GET /teams/:id returns 401 if not authenticated | integration | `npm run test -- teams.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run tests for the route being edited (e.g., `npm run test -- players.test.ts`)
- **Per wave merge:** Full suite `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/routes/players.test.ts` — covers PLAY-01, PLAY-02, PLAY-03
- [ ] `tests/routes/teams.test.ts` — covers TEAM-01, TEAM-02, TEAM-03
- [ ] `tests/helpers/test-db.ts` — shared fixtures (test user creation, session mocking, DB cleanup)
- [ ] Framework install: `npm install --save-dev vitest @testing-library/node` (if not already present)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom session parsing per route | Centralized `requireRole()` preHandler | Phase 2 | Eliminates auth boilerplate; single source of truth |
| Select-then-insert upserts | Drizzle `.onConflictDoUpdate()` | Phase 1 | Atomic operations; race-condition-free |
| Manual error wrapping | `AppError` class + `reply.status().send({error: {...}})` | Phase 2 | Consistent error shape; single error handler |
| UUID for IDs | nanoid | Phase 2+ | Shorter, URL-safe, standard in modern Node |

**Deprecated/outdated:**
- Manual Zod validation per route: Use fastify-type-provider-zod instead
- Custom response wrappers: Use `ok()` and `list()` helpers from `response.ts`

## Open Questions

1. **Drizzle Query Style: `.onConflictDoUpdate()` vs Select-then-Update**
   - What we know: `.onConflictDoUpdate()` is atomic and standard Drizzle pattern
   - What's unclear: Whether the team prefers explicit select-then-update for clarity
   - Recommendation: Use `.onConflictDoUpdate()` unless planner specifies otherwise (atomic > clarity in this domain)

2. **ID Generation: nanoid vs crypto.randomUUID**
   - What we know: nanoid is 11 chars by default; UUID is 36 chars; both available
   - What's unclear: Whether there's a preference for UUID standardization
   - Recommendation: Use nanoid (shorter, URL-safe); UUID available as fallback if constraint requires it

3. **Test Structure: Unit vs Integration**
   - What we know: Phase 2 used integration tests; routes interact with DB and auth
   - What's unclear: Whether unit tests with mocked DB are also desired
   - Recommendation: Use integration tests (match Phase 2 pattern); mocking complicates auth+DB interaction

## Sources

### Primary (HIGH confidence)
- **CONTEXT.md decisions (D-01 through D-09)** — locked endpoint behavior, upsert strategy, updatedAt handling
- **Shared contracts** (`shared/contracts/players.ts`, `shared/contracts/teams.ts`) — authoritative request/response shapes
- **Database schema** (`src/db/schema/players.ts`, `src/db/schema/teams.ts`) — column names, types, constraints
- **Existing infrastructure** (`src/hooks/require-auth.ts`, `src/lib/response.ts`, `src/lib/errors.ts`, `src/app.ts`) — patterns verified from codebase

### Secondary (MEDIUM confidence)
- **Drizzle ORM documentation** — `.onConflictDoUpdate()` pattern standard; `.returning()` for insert-returning
- **Fastify type provider pattern** — schema validation via Zod, preHandler composition

### Tertiary (LOW confidence)
- None — all critical findings verified against codebase or CONTEXT.md decisions

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries already integrated in Phase 2, versions confirmed
- Architecture: **HIGH** — Fastify plugin pattern, Drizzle query style, preHandler composition all demonstrated in existing code
- Pitfalls: **HIGH** — D-09 updatedAt issue, role enforcement, 404 handling all documented in CONTEXT.md or visible in patterns
- Validation: **MEDIUM** — test structure not yet established; framework detected but config not verified

**Research date:** 2026-03-25
**Valid until:** 2026-04-08 (14 days; stable tech, no breaking changes expected)

---

*Research phase 03-player-team-profiles complete.*
*Phase 3 is ready for planning.*
