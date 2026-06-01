# Phase 3: Player + Team Profiles - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 03-player-team-profiles
**Areas discussed:** Profile not-found behavior, Role mismatch on own-profile endpoints, Upsert strategy, updatedAt maintenance

---

## Profile Not-Found Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| 404 Not Found | Return standard 404 error. Frontend already handles this — the profile setup flow guides the user to create their profile via PUT /players/me. | ✓ |
| 200 with null data | Return `{ data: null }`. Frontend can detect an uninitialized profile without needing to handle a 404 error case. | |

**User's choice:** 404 Not Found
**Notes:** Applied consistently to GET /players/me, GET /teams/me, GET /players/:id, and GET /teams/:id.

---

## Role Mismatch on Own-Profile Endpoints

| Option | Description | Selected |
|--------|-------------|----------|
| 403 Forbidden | Explicitly reject with 403 — makes it clear the user lacks permission to operate on this profile type. Use requireRole('player') on player endpoints. | ✓ |
| 404 Not Found | Return 404 — less explicit but avoids revealing role information to the caller. | |

**User's choice:** 403 Forbidden
**Notes:** Player endpoints use `requireRole('player')`, team endpoints use `requireRole('team')`. Public read endpoints (GET /players/:id, GET /teams/:id) use `requireAuth` only — any role may read.

---

## Upsert Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Upsert — insert if missing, update if exists | Single PUT endpoint handles both creation and update. Contract already calls it 'Upsert'. Simplest flow — frontend never needs to check if profile exists before saving. | ✓ |
| Separate create vs update paths | Return 404 if no profile exists on PUT, requiring the frontend to POST first and then PUT. More REST-strict but adds complexity. | |

**User's choice:** Upsert — insert if missing, update if exists
**Notes:** Implemented via Drizzle `.insert().onConflictDoUpdate()` keyed on `userId`.

---

## updatedAt Maintenance

| Option | Description | Selected |
|--------|-------------|----------|
| Handler sets it explicitly on every PUT | Each PUT /players/me and PUT /teams/me manually sets `updatedAt: new Date()` before writing. Simple and correct. | ✓ |
| Leave to Claude's discretion | Claude decides whether to use a DB trigger, Drizzle hook, or handler-level logic. | |

**User's choice:** Handler sets it explicitly on every PUT
**Notes:** Drizzle's `defaultNow()` only fires on INSERT; manual `updatedAt: new Date()` required in every update path.

---

## Claude's Discretion

- ID generation strategy for new profile rows
- Test structure (unit vs. integration vs. both)
- Drizzle query style for upsert

## Deferred Ideas

None — discussion stayed within phase scope.
