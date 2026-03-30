# Phase 4: Search + Subscriptions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 04-search-subscriptions
**Areas discussed:** Search ordering, Plan limit enforcement, Subscription bootstrap, Upgrade validation

---

## Search Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| updatedAt DESC | Most recently active profiles first — rewards fresh profiles | ✓ (players) |
| createdAt DESC | Newest members first | |
| Alphabetical by name | Predictable A–Z | |
| You decide | Claude picks | |

**User's choice (players):** `updatedAt DESC`
**Notes:** Teams get a different sort order.

| Option | Description | Selected |
|--------|-------------|----------|
| Same for both | updatedAt DESC for players and teams | |
| Different for teams | Teams sorted by level or featured status | ✓ |
| You decide | Claude handles the distinction | |

**User's choice (teams sort):** Different — team level DESC then updatedAt DESC.

| Option | Description | Selected |
|--------|-------------|----------|
| Team level DESC then updatedAt | Pro/semi-pro teams surface first; ties broken by recent activity | ✓ |
| updatedAt DESC same as players | Simpler, most recently updated first | |
| You decide | Claude picks | |

**User's choice:** Team level DESC then updatedAt DESC.

| Option | Description | Selected |
|--------|-------------|----------|
| ANY match / OR | At least one of the searched skills | ✓ |
| ALL match / AND | Must have every searched skill | |
| You decide | | |

**User's choice (skills filter):** ANY match / OR

| Option | Description | Selected |
|--------|-------------|----------|
| Case-insensitive exact | "SP" matches "SP" but not "São Paulo" | ✓ |
| Case-insensitive contains | "SP" also matches "USP" | |
| You decide | | |

**User's choice (text filters):** Case-insensitive exact match

| Option | Description | Selected |
|--------|-------------|----------|
| 10 | Conservative default matching free team plan limit | ✓ |
| 20 | Common list default | |
| You decide | | |

**User's choice (default page size):** 10

| Option | Description | Selected |
|--------|-------------|----------|
| Require authentication / 401 | Only logged-in users can search | ✓ |
| Public search | Anyone can search without login | |

**User's choice:** Require authentication (401 for unauthenticated)

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude self from results | Filter out own profile — discovery is about finding others | ✓ |
| Include self | Own profile appears in own search | |

**User's choice:** Exclude self from results

| Option | Description | Selected |
|--------|-------------|----------|
| Cap at 50 | Prevents huge result sets | ✓ |
| Cap at 100 | More permissive | |
| No cap / You decide | | |

**User's choice (max page size):** Cap at 50

| Option | Description | Selected |
|--------|-------------|----------|
| Any authenticated role | No role restriction | |
| Enforce role restriction | team → /search/players, player → /search/teams | ✓ |

**User's choice (role restriction):** Enforce — only team users call /search/players; only player users call /search/teams.

| Option | Description | Selected |
|--------|-------------|----------|
| I'm not sure — you decide | Claude checks the schema | ✓ |
| There's an age/birthdate column | It exists | |
| No age column — ignore filter | | |

**User's choice (age filter):** Claude decides based on schema.

---

## Plan Limit Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — cap results by plan | searchResultsLimit enforced as hard cap on total results | ✓ |
| No — informational only | Enforcement deferred to Phase 7 | |
| You decide | | |

**User's choice:** Yes — enforce searchResultsLimit server-side.

| Option | Description | Selected |
|--------|-------------|----------|
| Return capped results silently | Return what the plan allows without error | ✓ |
| 403 Forbidden | Reject the entire request | |
| You decide | | |

**User's choice:** Return capped results silently (no 403 for search).

| Option | Description | Selected |
|--------|-------------|----------|
| No — only search gated in Phase 4 | Other limits belong to Phase 5+ | ✓ |
| Yes — also gate subscription/upgrade | Reject invalid/downgrade requests | |

**User's choice:** Only search is gated in Phase 4.

| Option | Description | Selected |
|--------|-------------|----------|
| DB lookup per request | Query subscriptions table on each gated request | ✓ |
| From session/token | Store planId in session | |
| You decide | | |

**User's choice:** DB lookup per request for plan info.

---

## Subscription Bootstrap

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create free row on first call | Insert 'free' row if none exists; user silently bootstrapped | ✓ |
| Return virtual free plan (no DB write) | Return free data without creating a row | |
| Return 404 | Frontend handles missing subscription | |

**User's choice:** Auto-create free row on first call to GET /subscription/usage.

| Option | Description | Selected |
|--------|-------------|----------|
| Now + 30 days | Standard monthly billing period | ✓ |
| Far future (2099) | Free plan never expires | |
| You decide | | |

**User's choice (period):** currentPeriodEnd = now + 30 days.

| Option | Description | Selected |
|--------|-------------|----------|
| Count from existing tables, return 0 for missing | conversations counted; others 0 | ✓ |
| All zeros for now | All usage counters = 0 | |
| You decide | | |

**User's choice (usage counts):** Count conversations from DB; return 0 for openPositions and favorites (tables don't exist yet).

---

## Upgrade Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — validate role-plan compatibility | Player → craque only; team → titular/campeao only; cross-role → 400 | ✓ |
| No — trust the client | Accept any planId | |

**User's choice:** Enforce role-plan compatibility — cross-role requests return 400.

| Option | Description | Selected |
|--------|-------------|----------|
| Update planId in-place, reset period to now + 30d | Update existing row; reset period | ✓ |
| Update planId only | Change planId, keep existing period dates | |
| You decide | | |

**User's choice:** Update planId in-place + reset period (now to now+30d), status='active'.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — wrap in { data: T } | Consistent with all other endpoints | ✓ |
| No — return flat object | Return object directly | |

**User's choice:** Wrap upgrade response in `{ data: T }`.

---

## Claude's Discretion

- ID generation strategy for new subscription rows
- Drizzle query style for upserts
- Test structure (integration tests following Phase 3 pattern)
- Exact SQL for skills matching (depends on column type)
- Age filter implementation (depends on schema)

## Deferred Ideas

None.
