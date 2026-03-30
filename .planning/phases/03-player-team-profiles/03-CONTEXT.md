# Phase 3: Player + Team Profiles - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend API endpoints for player and team profile management. Delivers:
- `GET /players/me` — authenticated player reads own profile
- `PUT /players/me` — authenticated player creates or updates own profile
- `GET /players/:id` — any authenticated user reads a player's public profile
- `GET /teams/me` — authenticated team user reads own profile
- `PUT /teams/me` — authenticated team user creates or updates own profile
- `GET /teams/:id` — any authenticated user reads a team's public profile

The frontend is 100% complete. This phase does NOT touch frontend code. All response shapes must match `~shared/contracts` exactly.

</domain>

<decisions>
## Implementation Decisions

### Profile Not-Found Behavior
- **D-01:** `GET /players/me` returns `404` when no player profile row exists for the authenticated user (frontend handles via profile setup flow)
- **D-02:** `GET /teams/me` returns `404` when no team profile row exists for the authenticated team user
- **D-03:** `GET /players/:id` returns `404` when no player profile exists for the given ID
- **D-04:** `GET /teams/:id` returns `404` when no team profile exists for the given ID

### Role Enforcement
- **D-05:** Player own-profile endpoints (`GET /players/me`, `PUT /players/me`) require `requireRole('player')` — a team user calling these gets `403 Forbidden`
- **D-06:** Team own-profile endpoints (`GET /teams/me`, `PUT /teams/me`) require `requireRole('team')` — a player user calling these gets `403 Forbidden`
- **D-07:** Public read endpoints (`GET /players/:id`, `GET /teams/:id`) require only `requireAuth` — any authenticated role (player, team, admin) may view

### Upsert Strategy
- **D-08:** `PUT /players/me` and `PUT /teams/me` are both upsert operations — insert a new profile row if none exists for the authenticated user, update the existing row if one exists (keyed on `userId`). Matches the contract type name `UpsertPlayerProfileRequest` / `UpsertTeamProfileRequest`.

### updatedAt Maintenance
- **D-09:** Every PUT handler explicitly sets `updatedAt: new Date()` before writing to the database. Drizzle's `defaultNow()` only fires on INSERT; the handler is responsible for keeping `updatedAt` current on subsequent updates.

### Claude's Discretion
- ID generation strategy (e.g., `nanoid`, `crypto.randomUUID`) for new profile rows
- Test structure (unit vs. integration vs. both)
- Drizzle query style (`.insert().onConflictDoUpdate()` vs. select-then-insert/update)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shared Contracts (source of truth for all request/response shapes)
- `Projeto/apps/web/shared/contracts/players.ts` — `PlayerProfileSchema`, `PlayerSummarySchema`, `UpsertPlayerProfileRequestSchema`
- `Projeto/apps/web/shared/contracts/teams.ts` — `TeamProfileSchema`, `TeamSummarySchema`, `UpsertTeamProfileRequestSchema`

### Database Schema
- `Projeto/apps/api/src/db/schema/players.ts` — `players` table definition (all columns, types, constraints)
- `Projeto/apps/api/src/db/schema/teams.ts` — `teams` table definition + `teamLevelEnum`

### Existing Infrastructure to Reuse
- `Projeto/apps/api/src/hooks/require-auth.ts` — `requireAuth` preHandler (session validation, injects `request.session`)
- `Projeto/apps/api/src/lib/response.ts` — `ok()` helper for `{ data: T }` wrapping
- `Projeto/apps/api/src/lib/errors.ts` — error handling patterns and error factory
- `Projeto/apps/api/src/routes/health.ts` — existing route plugin pattern to replicate
- `Projeto/apps/api/src/app.ts` — where to register new route plugins

### Requirements
- `.planning/REQUIREMENTS.md` §Player Profiles — PLAY-01, PLAY-02, PLAY-03
- `.planning/REQUIREMENTS.md` §Team Profiles — TEAM-01, TEAM-02, TEAM-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireAuth` hook: validates Better Auth session via HttpOnly cookie, injects `request.session` (contains `userId`, `role`) — use as preHandler on all 6 endpoints
- `ok(data)` helper: wraps any value in `{ data }` — use for all success responses
- `players` and `teams` DB schemas: all fields align 1:1 with `PlayerProfileSchema` / `TeamProfileSchema`; `userId UNIQUE` constraint makes upsert natural via `.onConflictDoUpdate()`

### Established Patterns
- Routes are registered as Fastify plugins in `src/routes/` and imported in `src/app.ts`
- Zod validation uses `fastify-type-provider-zod` — schema declared in route options, not manually
- Error responses flow through `src/lib/errors.ts` — use existing error factory rather than throwing raw errors
- Rate limiting is applied globally — no per-endpoint configuration needed for basic profile endpoints

### Integration Points
- New route files: `src/routes/players.ts` and `src/routes/teams.ts`
- Register in `src/app.ts` with prefix `/api` (matching existing health route)
- `request.session.userId` identifies the authenticated user on own-profile endpoints
- `request.session.role` used to enforce `requireRole` (compare against `'player'` / `'team'`)

</code_context>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments from discussion — standard REST profile API following existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-player-team-profiles*
*Context gathered: 2026-03-25*
