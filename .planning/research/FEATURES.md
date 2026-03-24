# Feature Landscape

**Domain:** E-sports social platform backend (VarzeaPro)
**Researched:** 2026-03-23
**Stack context:** Fastify + Node.js + TypeScript, PostgreSQL, Better Auth, Socket.io

---

## Feature Domains

The backend must serve 8 API modules already defined by frontend contracts:
`authApi`, `playersApi`, `teamsApi`, `searchApi`, `messagingApi`, `adminUsersApi`, `adminModerationApi`, `subscriptionApi`

---

## Table Stakes

Features users expect. Missing = app breaks or is insecure.

### Authentication (authApi)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| POST /auth/login — issue JWT on valid credentials | Frontend sends Bearer token on every request | Low | Better Auth handles session creation |
| POST /auth/signup — create user + role assignment | Player vs Team role gates entire UI | Low | Role (`player`/`team`) stored in JWT claims |
| POST /auth/forgot-password — initiate reset flow | Frontend has full password reset UI | Low | Log token to console for TCC; no live email |
| JWT validation middleware on all protected routes | Every non-auth route requires auth | Medium | Better Auth middleware; reject with 401 |
| RBAC enforcement (player / team / admin) | Admin routes must be inaccessible to players | Medium | Role checked in route hooks, not just middleware |
| HttpOnly cookie + Bearer token dual support | Frontend stores token in sessionStorage as Bearer | Low | Frontend uses Bearer; backend can accept both |
| Password hashing (bcrypt/argon2) | Plaintext passwords = immediate fail on security audit | Low | Better Auth handles this internally |
| Rate limiting on /auth/* endpoints | Brute-force protection; TCC security requirement | Low | @fastify/rate-limit, stricter on auth routes |

### Player Profiles (playersApi)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GET /players/me — return own profile | Dashboard loads on login | Low | Auth-gated; returns profile or 404 if not created |
| PUT /players/me — update own profile | Profile edit form in UI | Low | Zod validation on all fields |
| GET /players/:id — public profile view | Search results link to profiles | Low | Public; no auth required |
| Profile creation on first login | Player role users need a profile record | Low | Can be auto-created on signup or on first GET |

### Team Profiles (teamsApi)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GET /teams/me — return own team profile | Team dashboard | Low | Same pattern as players/me |
| PUT /teams/me — update team profile | Team edit form | Low | Zod validation |
| GET /teams/:id — public team profile | Search and discovery | Low | Public endpoint |

### Search (searchApi)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GET /search/players — filtered player list | Core discovery feature | Medium | Pagination required: `{ data: T[], meta: { page, pageSize, total, totalPages } }` |
| GET /search/teams — filtered team list | Core discovery feature | Medium | Same pagination contract |
| Filter by query params (name, game, region, etc.) | Search UI has filter controls | Medium | PostgreSQL ILIKE or full-text search (pg_trgm) |
| Paginated responses matching contract shape | Frontend TanStack Query depends on meta object | Low | Non-negotiable contract fidelity |

### Real-Time Messaging (messagingApi)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GET /conversations — list user's conversations | Conversation list UI | Low | Filtered by authenticated user |
| POST /conversations — start new conversation | "Message" button on profiles | Low | Create conversation record + participants |
| GET /conversations/:id/messages — paginated messages | Message thread UI | Medium | Pagination with cursor or offset |
| POST /conversations/:id/messages — send message (REST fallback) | Message submission | Low | Also triggers Socket.io event |
| Socket.io: real-time message delivery to room | Live chat feel | Medium | Room per conversation ID |
| Socket.io: typing indicators (start/stop typing events) | Chat UX standard | Low | Debounced; broadcast to conversation room |
| Socket.io: presence (online/offline status) | Platform social feature | Medium | Track connected socket IDs per user |
| Auth on WebSocket connections | Prevent anonymous socket access | Medium | Verify JWT on connection handshake |

### Admin Panel (adminUsersApi + adminModerationApi)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GET /admin/users — paginated user list | Admin dashboard table | Low | Admin role only; pagination contract |
| GET /admin/users/:id — user detail | Admin user detail view | Low | Returns full user + profile data |
| POST /admin/users/:id/ban — ban a user | Moderation action | Low | Sets `banned_at` + `ban_reason`; blocks login |
| GET /admin/moderation/reports — list reports | Moderation queue | Low | Paginated |
| POST /admin/moderation/reports/:id — resolve report | Mark report as handled | Low | Status update + resolver ID |
| Admin-only middleware guard | All /admin/* routes are role-gated | Low | Return 403 to non-admin roles |
| Audit log writes on admin actions | TCC security demonstration | Medium | Write to `audit_logs` table on every ban/resolve |

### Subscriptions (subscriptionApi)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GET /subscription/usage — return plan + usage stats | Subscription dashboard | Low | Read from user's subscription record |
| POST /subscription/upgrade — change plan tier | Upgrade UI button | Low | No payment gateway; update plan in DB directly |
| Plan-gated feature enforcement | Some features blocked on free tier | Medium | Check subscription tier in route hooks |

---

## Differentiators

Features that make this TCC stand out. Not strictly required for the app to function, but demonstrate quality.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Audit log table with full admin action trail | Demonstrates security awareness explicitly | Medium | `action`, `actor_id`, `target_id`, `timestamp`, `metadata` JSON column |
| Zod schemas shared via contracts package | Single source of truth for request/response shapes | Medium | Validate backend input with same types as frontend |
| Rate limiting per-route (not just global) | Stricter on auth, looser on reads | Low | Different windows per endpoint class |
| Socket.io auth handshake with JWT validation | Prevents unauthenticated socket connections | Medium | Reject connection before establishing room |
| Structured Pino logging with request IDs | Fastify's built-in logger used properly | Low | Correlation IDs make debugging traceable |
| Search with PostgreSQL pg_trgm full-text | Better search quality than ILIKE alone | Medium | Create GIN index on searchable columns |
| Refresh token rotation | Short-lived access tokens + rotating refresh tokens | High | Better Auth JWT plugin supports this; opaque refresh tokens preferred |
| Ban enforcement on login | Banned users get 401 + reason on login attempt | Low | Check `banned_at` in login handler |
| Idempotent message sending (conversation dedup) | Prevents duplicate conversations on double-tap | Medium | Unique constraint on `(participant_a, participant_b)` |
| OpenAPI/Swagger docs via fastify-swagger | Academic project documentation asset | Low | Auto-generated from Zod schemas |

---

## Anti-Features

Things to deliberately NOT build for v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Live email delivery (SMTP/SendGrid) | Adds external service dependency; not needed for TCC | Log password reset tokens to console/DB |
| Payment gateway (Stripe, etc.) | Out of scope; no billing logic needed | Subscription upgrade = DB write, no payment |
| Redis for Socket.io scaling | Overkill for single-VPS TCC deployment | Single-node Socket.io without adapter |
| Full-text search engine (Elasticsearch/Meilisearch) | Separate service, operational burden | PostgreSQL pg_trgm covers TCC search needs |
| Mobile push notifications | No mobile app in scope | Ignore entirely |
| File/image upload (avatars) | Adds S3 / storage complexity | Accept URL string for avatar fields |
| OAuth / social login (Google, Discord) | Scope creep; adds integration surface | Username + password only via Better Auth |
| Message read receipts / delivery status | Adds real-time complexity with little TCC value | Typing indicators + presence are sufficient |
| Admin impersonation | Complex security surface, not in UI | Ban + report resolution is sufficient admin power |
| Game-specific data models | Platform is game-agnostic in v1 | Free-text game name field |

---

## Security Requirements Per Feature

| Feature Domain | Requirement | Implementation |
|----------------|-------------|----------------|
| Auth | Brute-force protection | @fastify/rate-limit: 5 attempts / 15 min on /auth/login |
| Auth | Password storage | bcrypt (cost 12) or argon2id — Better Auth default |
| Auth | Token signing | RS256 preferred; HS256 acceptable for TCC with strong secret |
| Auth | Short-lived access tokens | 15–60 min expiry; refresh token for renewal |
| Auth | Ban check on login | Query `banned_at` before issuing token |
| All protected routes | JWT validation | Verify signature + expiry + issuer on every request |
| All protected routes | RBAC enforcement | Role in JWT claims; checked per-route not per-middleware-only |
| Admin routes | Role gate | 403 if role !== 'admin'; log unauthorized attempts |
| Admin actions | Audit trail | Every ban/unban/report-resolve writes to `audit_logs` |
| Messaging | Socket auth | JWT verified on socket handshake; reject unauthenticated connections |
| Messaging | Room isolation | Users can only join their own conversation rooms |
| All input | Schema validation | Zod on every route body/query/params; reject malformed input with 400 |
| All routes | Rate limiting | Global: 100 req/min; Auth: 5 req/15 min; Search: 30 req/min |
| All routes | XSS prevention | Sanitize HTML in user-supplied text fields before storage |
| All routes | SQL injection | Use parameterized queries (Drizzle ORM or pg with $1 placeholders) |

---

## Feature Dependencies

```
Auth (login/signup) → Everything else (JWT required for all protected routes)

Player profile creation → Player dashboard, search results, messaging
Team profile creation  → Team dashboard, search results, messaging

Subscription record    → /subscription/usage, plan-gated features

Auth (ban check)       → Admin ban action (POST /admin/users/:id/ban)
Audit log table        → Admin actions (ban, report resolution)

Conversations          → Messages (conversation must exist before messages)
Socket.io rooms        → Real-time message delivery (REST creates, socket delivers)
```

---

## MVP Recommendation

Build in this order — each layer unblocks the next:

1. **Auth** (login, signup, JWT middleware, RBAC) — gates everything
2. **Player + Team profiles** (CRUD) — core data the platform runs on
3. **Search** (players + teams with pagination) — primary value proposition
4. **Messaging** (REST conversations + messages, then Socket.io layer)
5. **Subscriptions** (usage read + upgrade write)
6. **Admin panel** (users list + ban + moderation reports + audit log)

Defer (post-MVP within TCC scope):
- Refresh token rotation (implement basic JWT first, add rotation in hardening phase)
- OpenAPI docs (add after routes are stable)
- pg_trgm indexes (add after basic ILIKE search is working)

---

## Sources

- [Auth0 Token Best Practices](https://auth0.com/docs/secure/tokens/token-best-practices) — HIGH confidence
- [Better Auth official docs](https://better-auth.com/) — HIGH confidence
- [Better Auth JWT Plugin](https://better-auth.com/docs/plugins/jwt) — HIGH confidence
- [fastify/fastify-rate-limit](https://github.com/fastify/fastify-rate-limit) — HIGH confidence
- [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod) — HIGH confidence
- [Socket.IO real-time patterns 2026](https://dev.to/abanoubkerols/socketio-the-complete-guide-to-building-real-time-web-applications-2026-edition-c7h) — MEDIUM confidence
- [RBAC in Node.js](https://dev.to/young_gao/role-based-access-control-rbac-in-nodejs-beyond-simple-admin-checks-1ea9) — MEDIUM confidence
- [Better Auth + RBAC on Node.js](https://github.com/brunotp99/better-auth-and-rbac) — MEDIUM confidence
- [Node.js Auth Security Best Practices 2026](https://www.authgear.com/post/nodejs-security-best-practices) — MEDIUM confidence
