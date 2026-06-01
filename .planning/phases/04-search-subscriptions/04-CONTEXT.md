# Phase 4: Search + Subscriptions - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend API endpoints for player/team discovery and subscription plan management. Delivers:
- `GET /search/players` — authenticated team users search players with filters + pagination
- `GET /search/teams` — authenticated player users search teams with filters + pagination
- `GET /subscription/usage` — authenticated user's current plan, usage counters, and limits
- `POST /subscription/upgrade` — upgrade the authenticated user's subscription plan

The frontend is 100% complete. This phase does NOT touch frontend code. All response shapes must match `~shared/contracts` exactly.

</domain>

<decisions>
## Implementation Decisions

### Search Ordering
- **D-01:** `GET /search/players` sorts results by `updatedAt DESC` — most recently active profiles surface first, rewarding fresh profiles.
- **D-02:** `GET /search/teams` sorts results by `level DESC, updatedAt DESC` — higher-level teams (pro, semi-pro) surface first; ties broken by recent activity.

### Search Filter Behavior
- **D-03:** Skills filter (`skills` query param, comma-separated) uses **ANY match (OR)** — a player with at least one of the searched skills is included. This maximizes discovery results.
- **D-04:** Text filters (`region`, `availability`, `openPosition`) use **case-insensitive exact match** — e.g., `lower(column) = lower(param)`. Predictable behavior matching what the frontend sends.
- **D-05:** Age filters (`minAge`, `maxAge`) — Claude determines based on whether an age/birthdate column exists in the `players` table schema. If no column exists, the filters are accepted but silently ignored.

### Search Pagination
- **D-06:** Default `pageSize` = 10 when the client doesn't specify.
- **D-07:** Maximum `pageSize` = 50, enforced server-side regardless of what the client sends.

### Search Access Control
- **D-08:** Both search endpoints require `requireAuth` — unauthenticated requests return `401`.
- **D-09:** Role restriction is enforced: only `team` users may call `GET /search/players`; only `player` users may call `GET /search/teams`. Wrong-role callers receive `403 Forbidden`.
- **D-10:** Authenticated users are excluded from their own search results — the requesting user's own profile is filtered out by `userId`.

### Plan Limit Enforcement on Search
- **D-11:** `searchResultsLimit` is enforced server-side on both search endpoints. The effective page size is `min(requestedPageSize, plan.searchResultsLimit)`. Free team plan limit = 10.
- **D-12:** Results are silently capped to the plan limit — no `403` error is returned for search. The frontend already knows the user's limits from `GET /subscription/usage`.
- **D-13:** Plan info is resolved via a **DB lookup per request** — query the `subscriptions` table for `userId`. No caching or session-stored plan.
- **D-14:** Only search endpoints are plan-gated in Phase 4. Conversation, open-position, and favorites limits are enforced in Phase 5+.

### Subscription Bootstrap
- **D-15:** `GET /subscription/usage` **auto-creates a `free` subscription row** if none exists for the authenticated user. The row is inserted on first call (upsert by `userId`). Frontend never sees a missing-subscription state.
- **D-16:** Auto-created free row values: `planId = "free"`, `status = "active"`, `currentPeriodStart = now()`, `currentPeriodEnd = now() + 30 days`, `cancelAtPeriodEnd = false`.
- **D-17:** Usage counts are derived from DB row counts: `conversationsUsed` = count of conversation rows for the user; `openPositionsUsed` = 0 (no table yet — Phase 5+); `favoritesUsed` = 0 (no table yet — Phase 5+). `periodResetAt` = `currentPeriodEnd` from the subscription row.

### Subscription Upgrade
- **D-18:** `POST /subscription/upgrade` validates **role-plan compatibility** server-side. Player role may only upgrade to `"craque"`; team role may only upgrade to `"titular"` or `"campeao"`. Cross-role plan requests return `400 Bad Request`.
- **D-19:** On a valid upgrade, the existing subscription row is updated in-place: `planId = newPlanId`, `status = "active"`, `currentPeriodStart = now()`, `currentPeriodEnd = now() + 30 days`. No historical rows are kept (TCC scope).
- **D-20:** Upgrade response is wrapped in `{ data: T }` consistent with all other endpoints. `T = { success: boolean; planId: string; message: string }`.

### Claude's Discretion
- ID generation strategy for new subscription rows (e.g., `nanoid`, `crypto.randomUUID`)
- Drizzle query style for upserts (`.insert().onConflictDoUpdate()` vs. select-then-insert)
- Test structure (integration tests following the Phase 3 RED→GREEN pattern)
- Exact SQL for skills array matching (depends on whether `skills` column is `text[]` or `text`)
- Age filter implementation (depends on whether `players` table has a birthdate/age column)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shared Contracts (source of truth for all request/response shapes)
- `Projeto/apps/web/shared/contracts/search.ts` — `SearchPlayersQuerySchema`, `SearchTeamsQuerySchema`, `SearchPlayersResponseSchema`, `SearchTeamsResponseSchema`
- `Projeto/apps/web/shared/contracts/subscription.ts` — `UsageSchema`, `PlanInfoSchema`, `PlanIdSchema`, `PLAN_CONFIGS`, `getPlanLimits()`
- `Projeto/apps/web/shared/contracts/players.ts` — `PlayerSummarySchema` (search result shape)
- `Projeto/apps/web/shared/contracts/teams.ts` — `TeamSummarySchema` (search result shape)

### Database Schema
- `Projeto/apps/api/src/db/schema/subscriptions.ts` — `subscriptions` table definition, `subscriptionStatusEnum`
- `Projeto/apps/api/src/db/schema/players.ts` — `players` table (check for age/birthdate column, skills column type)
- `Projeto/apps/api/src/db/schema/teams.ts` — `teams` table + `teamLevelEnum` (needed for level-based sort)
- `Projeto/apps/api/src/db/schema/users.ts` — `planIdEnum` (referenced by subscriptions table)

### Existing Infrastructure to Reuse
- `Projeto/apps/api/src/hooks/require-auth.ts` — `requireAuth` preHandler (session validation)
- `Projeto/apps/api/src/lib/response.ts` — `ok()` helper for `{ data: T }` wrapping
- `Projeto/apps/api/src/lib/errors.ts` — error handling patterns and error factory
- `Projeto/apps/api/src/routes/health.ts` — existing route plugin pattern to replicate
- `Projeto/apps/api/src/app.ts` — where to register new route plugins

### API Client (verify endpoint signatures)
- `Projeto/apps/web/app/lib/api-client.ts` lines 132–200 — `searchApi` and `subscriptionApi` method signatures

### Requirements
- `.planning/REQUIREMENTS.md` §Search — SRCH-01, SRCH-02
- `.planning/REQUIREMENTS.md` §Subscriptions — SUB-01, SUB-02, SUB-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireAuth` hook: injects `request.session` with `userId` and `role` — use on all 4 endpoints
- `ok(data)` helper: wraps any value in `{ data }` — use for all success responses
- `players` and `teams` DB schemas: align with `PlayerSummarySchema` / `TeamSummarySchema`
- `subscriptions` DB table: `userId UNIQUE` constraint — natural fit for upsert via `.onConflictDoUpdate()`
- `PLAN_CONFIGS` in `subscription.ts`: contains `searchResultsLimit` per plan — import and use server-side

### Established Patterns
- Routes registered as Fastify plugins in `src/routes/` and imported in `src/app.ts`
- Zod validation via `fastify-type-provider-zod` — schema declared in route options
- Error responses through `src/lib/errors.ts` — use existing error factory
- Rate limiting applied globally — no per-endpoint config needed

### Integration Points
- New route files: `src/routes/search.ts` and `src/routes/subscription.ts`
- Register in `src/app.ts` with `/api` prefix (matching existing routes)
- Plan enforcement middleware or inline check using `request.session.userId` → DB lookup → `getPlanLimits(planId, role)`
- `request.session.role` used to enforce role restriction on search endpoints (`"player"` vs `"team"`)

</code_context>

<specifics>
## Specific Ideas

- Team search sorts pro/semi-pro teams first (level DESC) — this is an intentional discovery UX choice, not just a technical default.
- Skills filter intentionally uses OR logic to maximize discovery results — the platform's core value is "players and teams find each other fast."
- The free plan's `searchResultsLimit = 10` (for team role) is enforced by capping the effective page size, not by returning an error.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-search-subscriptions*
*Context gathered: 2026-03-25*
