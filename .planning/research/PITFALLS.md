# Pitfalls Research

**Domain:** E-sports social platform — Fastify + Node.js + TypeScript + PostgreSQL + Socket.io + Better Auth + Docker Compose
**Researched:** 2026-03-23
**Confidence:** HIGH (stack-specific + confirmed by codebase analysis)

---

## Critical Pitfalls

### Pitfall 1: JWT Stored Client-Side (Already Present in This Codebase)

**What goes wrong:**
The existing frontend stores JWTs in `sessionStorage` (`varzeapro_token`) and also writes a non-HttpOnly cookie from JavaScript (`setSessionCookie` in `route-guards.ts`). The backend, when built naively to match this, will issue tokens that JavaScript can read. Any XSS payload — injected via user-provided content (e.g., a player bio, team name, chat message) — can `window.sessionStorage.getItem('varzeapro_token')` and exfiltrate the full JWT to an attacker-controlled server.

**Why it happens:**
The frontend was built against MSW mocks that don't enforce cookie semantics. Developers copy the auth pattern from the frontend contract without questioning the storage mechanism.

**How to avoid:**
- Issue JWTs exclusively as `HttpOnly; Secure; SameSite=Strict` cookies from the Fastify auth endpoint (`Set-Cookie` response header).
- Never return the raw JWT in the JSON body.
- The frontend `Authorization: Bearer <token>` header usage in `api-client.ts` must be replaced with cookie-based auth. This is the one frontend change that is non-negotiable for security.
- Use Better Auth's built-in cookie session mode — it handles this correctly out of the box.

**Warning signs:**
- Backend auth endpoint returns `{ token: "..." }` in the JSON body.
- Frontend `api-client.ts` still reads from `sessionStorage` after backend is built.
- Network tab shows `Authorization: Bearer` headers instead of `Cookie` headers on API requests.

**Phase to address:** Authentication phase (Phase 1 / earliest phase). Cannot retrofit later without frontend changes.

---

### Pitfall 2: WebSocket Connections Not Authenticated (JWT Bypass via Socket.io)

**What goes wrong:**
Socket.io connections are established via an HTTP upgrade handshake. Developers add JWT middleware to Fastify HTTP routes but forget that Socket.io's connection lifecycle is separate. Unauthenticated users can open a socket, join any room by guessing conversation IDs, and receive or send messages.

**Why it happens:**
Fastify plugins and hooks do not automatically apply to Socket.io's connection handler. The `fastify-socket.io` integration passes the raw `http.Server` to Socket.io — Fastify's `preHandler` hooks never run for WebSocket frames.

**How to avoid:**
- Add a Socket.io middleware (`io.use(async (socket, next) => {...})`) that extracts and validates the JWT (or session cookie) on every new connection before `next()` is called.
- Store the validated `userId` and `role` on `socket.data` for use in all event handlers.
- On every `joinRoom` or message event, verify that `socket.data.userId` is a participant in the requested conversation (query the DB).
- Reject and disconnect sockets that fail auth: `next(new Error('UNAUTHORIZED'))`.

**Warning signs:**
- A `curl` WebSocket upgrade with no credentials successfully connects.
- Socket.io event handlers access `socket.handshake.query.userId` (trusting client-supplied identity) instead of `socket.data.userId` (server-validated).
- No auth middleware registered with `io.use(...)`.

**Phase to address:** Real-time messaging phase. Must be in the same phase as Socket.io integration, not deferred.

---

### Pitfall 3: Race Conditions in Concurrent Message Delivery

**What goes wrong:**
Two users send messages to the same conversation simultaneously. Both API handlers `SELECT` the latest message sequence, both get the same value, and both `INSERT` with the same sequence number, causing a primary key or ordering conflict. Alternatively, "unread count" updates race and produce incorrect counts.

**Why it happens:**
Developers use `SELECT MAX(id) + 1` patterns or application-level counters rather than database-native sequences. PostgreSQL sequences are safe; application-level counters are not.

**How to avoid:**
- Use PostgreSQL `SERIAL` or `BIGSERIAL` for message IDs — never compute IDs in application code.
- For "last_read" / unread count tracking, use `UPDATE ... WHERE last_read_at < $newTimestamp` (conditional update) rather than read-then-write.
- For operations that must be atomic (e.g., create message + update conversation `updated_at`), wrap in a single `BEGIN ... COMMIT` transaction.
- For "mark conversation as read" under concurrent access, use `SELECT ... FOR UPDATE` on the conversation row to serialize.

**Warning signs:**
- Message insert logic contains `const maxId = await db.query('SELECT MAX(id) FROM messages')`.
- Unread count logic does a read followed by a separate write without a transaction.
- Integration tests that fire two concurrent requests show duplicate or missing data.

**Phase to address:** Database schema phase (define sequences correctly from the start) + messaging phase (transaction discipline).

---

### Pitfall 4: Role Escalation via Unsigned / Weakly Validated Session Cookie

**What goes wrong:**
The existing codebase already has this: `getSessionFromRequest` parses `varzeapro_session` as raw JSON and casts it to `SessionUser` without any HMAC/signature check. A user can craft a cookie `{"id":"1","role":"admin"}` and gain admin access. The backend must not replicate this pattern.

**Why it happens:**
Developers trust their own cookie format because "users can't see the cookie name." Signed cookies require a library; raw JSON is one line of code.

**How to avoid:**
- Never trust cookie content that is not cryptographically signed or encrypted by the server.
- Use Better Auth's session system — it stores a session token (opaque reference) in the cookie, looks up the full session record in the database on each request. Role is read from the DB row, not the cookie.
- If custom session middleware is needed, use `@fastify/cookie` + `fastify-csrf-protection` + a server-side secret for signing (`fastify.signCookie` / `fastify.unsignCookie`).
- In every protected route handler, re-read `role` from the database-backed session, not from a JWT claim that could be stale after a role change.

**Warning signs:**
- Route handlers call `request.cookies.varzeapro_session` and `JSON.parse(...)` it directly.
- JWT payload contains `role` and the handler trusts it without DB verification.
- No `cookieSecret` or equivalent configured in Fastify.

**Phase to address:** Authentication phase. Zero tolerance — must be correct from the first deployed route.

---

### Pitfall 5: CORS Misconfiguration Exposes Auth Endpoints

**What goes wrong:**
`@fastify/cors` is configured with `origin: true` (reflect any origin) or with a wildcard `*`. Browsers allow cross-origin requests from attacker-controlled sites to hit the API with the user's cookies, enabling CSRF attacks even when cookies are `SameSite=Lax` (since same-site is checked against the eTLD+1, not the exact origin).

**Why it happens:**
Developers set `origin: '*'` to make development easy and forget to restrict it before deployment. With `SameSite=None` (required for some cross-origin setups), this becomes critical.

**How to avoid:**
- Set `origin` to an explicit allowlist: `['https://varzeapro.com.br', 'http://localhost:5173']` — never a wildcard when credentials are involved.
- Set `credentials: true` only when the origin is explicitly listed.
- Add `@fastify/csrf-protection` for any state-mutating endpoints that are not strictly JSON APIs (form submissions, file uploads).
- In Docker Compose, set `CORS_ORIGIN` as an environment variable read at startup — no hardcoded origins in code.

**Warning signs:**
- `fastify.register(cors, { origin: true })` or `{ origin: '*' }` in production config.
- `credentials: true` combined with `origin: '*'` (browsers will block this, but it signals misconfiguration).
- No `CORS_ORIGIN` environment variable in `docker-compose.yml`.

**Phase to address:** Infrastructure / hardening phase, but CORS must be correctly configured in the first HTTP phase — misconfiguration is easy to miss at integration.

---

### Pitfall 6: Plan Enforcement Is Client-Side Only (Already Present)

**What goes wrong:**
The frontend `PlanProvider` and `PlanGate` components enforce subscription limits (search results, conversation counts, advanced filters). There is no server-side check. A user who removes the client-side guard with DevTools can perform unlimited actions regardless of their subscription plan.

**Why it happens:**
It's faster to implement in the frontend. The backend is being built after the frontend, making it tempting to skip re-implementing the same logic server-side.

**How to avoid:**
- Every plan-gated operation must have a middleware or service-layer check in the Fastify handler before any DB write or expensive query.
- Create a `checkPlanLimit(userId, feature)` service that queries `users.plan_id` and compares against the plan config table before proceeding.
- The plan config (limits per tier) must live in the database or a server-side constant — not in the frontend `subscription.ts` contract file alone.

**Warning signs:**
- A `POST /conversations` handler does not check `maxConversations` for the user's plan.
- `GET /search/players` returns unlimited results regardless of `plan_id`.
- No plan-check middleware or service exists in `apps/api/`.

**Phase to address:** Subscription / plan phase, but the service must be callable from Phase 1 (auth) so it can be wired in during each feature phase.

---

### Pitfall 7: SQL Injection via ORM Misuse (Drizzle / Prisma / Raw Queries)

**What goes wrong:**
Developers use template literals or string concatenation to build dynamic SQL — especially in search/filter endpoints where column names or sort directions come from query parameters. Example: `` `ORDER BY ${req.query.sortField} ${req.query.sortDir}` `` passed into a raw query.

**Why it happens:**
ORMs protect parameterized values but not identifiers (column names, table names, sort directions). Developers assume the ORM is safe for all inputs.

**How to avoid:**
- Never use user input as a SQL identifier. Use a server-side allowlist: `const ALLOWED_SORT_FIELDS = ['created_at', 'username', 'rank']` and reject anything not in the list.
- For parameterized values (WHERE clauses), always use the ORM's placeholder syntax — never string interpolation.
- Search endpoint filters (game, position, rank) must be mapped from validated enum values to SQL clauses, never passed through directly.
- Use Zod at the route level to validate all query parameters before they reach the DB layer.

**Warning signs:**
- Search endpoint handler contains string template literals building SQL.
- `sortField` or `sortDir` from query params used directly in a query without allowlist check.
- Raw `db.query(sql)` calls where `sql` is built with `+` or template literals.

**Phase to address:** Search / player-discovery phase. Also applies from Phase 1 wherever DB queries are written.

---

### Pitfall 8: Docker Secrets Exposed in Environment or Image Layers

**What goes wrong:**
`JWT_SECRET`, `DATABASE_URL` (with password), and `SESSION_SECRET` are hardcoded in `docker-compose.yml` or baked into the Docker image during `RUN npm install` / build steps. They appear in `docker history` and in committed `.env` files in the repository.

**Why it happens:**
Single-VPS TCC deployments feel "safe enough" — there's no CI/CD secret store, so developers put secrets in the compose file and commit it.

**How to avoid:**
- Use `docker-compose.yml` with `env_file: .env` pointing to a `.env` file that is in `.gitignore`.
- Provide `.env.example` with placeholder values in the repository.
- Use Docker Compose `secrets:` block for the most sensitive values (DB password, JWT secret).
- Never use `ARG` for secrets in `Dockerfile` — ARGs appear in `docker history`. Use runtime environment variables only.
- Rotate all secrets before the TCC presentation if they were ever committed.

**Warning signs:**
- `docker-compose.yml` contains literal passwords or JWT secrets.
- `.env` file is tracked by git (`git ls-files | grep .env`).
- `Dockerfile` contains `ARG JWT_SECRET`.

**Phase to address:** Infrastructure / Docker phase (earliest possible). Cannot be retrofitted without rotating secrets.

---

### Pitfall 9: Rate Limiting Bypass via IP Spoofing (X-Forwarded-For)

**What goes wrong:**
`@fastify/rate-limit` is configured to rate-limit by IP. Behind a reverse proxy (nginx in Docker Compose), all requests arrive from `172.x.x.x` (the Docker bridge network). The plugin sees every request as coming from the same IP and either rate-limits all users together or, if `trustProxy: true` is set naively, allows attackers to bypass limits by spoofing `X-Forwarded-For: 1.2.3.4` with a different IP on each request.

**Why it happens:**
The plugin's default behavior plus proxy setup creates this silently — it appears to work in local testing where there is no proxy.

**How to avoid:**
- Set `trustProxy` in Fastify to trust only the specific upstream proxy address (the nginx container IP range), not all proxies.
- Use `@fastify/rate-limit` with a `keyGenerator` that reads the validated real IP from `request.ip` after correct proxy trust configuration.
- For authenticated endpoints, rate-limit by `userId` (from the validated session) not by IP — this prevents both bypass and false positives for users behind NAT.
- Add rate limits at the nginx level as a defense-in-depth layer (separate from application-level limits).

**Warning signs:**
- `fastify({ trustProxy: true })` without specifying trusted proxy IPs.
- Rate limit key is `request.headers['x-forwarded-for']` directly.
- All requests in logs show the same source IP (the Docker gateway).

**Phase to address:** Security hardening phase. Must be verified in the Docker Compose environment, not just in local dev.

---

### Pitfall 10: Contract Mismatch Between Frontend Types and Backend Responses

**What goes wrong:**
The backend returns `{ user: {...} }` but the frontend contract expects `{ data: {...} }`. Or a list endpoint returns `{ items: [], count: 0 }` instead of `{ data: [], meta: { page, pageSize, total, totalPages } }`. The frontend silently shows empty states or crashes with a runtime type error rather than a clear integration error.

**Why it happens:**
Developers write the backend without running the frontend simultaneously. MSW mocks are the "ground truth" but the backend implements a slightly different shape.

**How to avoid:**
- The canonical contract is `Projeto/apps/web/shared/contracts/` — treat these TypeScript types as the API spec.
- Every response shape must be validated against these types using Zod schemas that mirror the shared contracts.
- Write at least one integration test per endpoint that asserts the response shape matches the shared contract type.
- Run the frontend against the real backend (not MSW) during the integration phase — use `VITE_USE_MOCK=false` and verify in the browser before considering any feature "done."
- Response envelope rules: single items → `{ data: T }`, lists → `{ data: T[], meta: { page, pageSize, total, totalPages } }`, mutations → `{ data: T }` or `{ success: true }`.

**Warning signs:**
- Frontend shows empty lists for endpoints that return data (shape mismatch).
- TypeScript compilation passes but runtime shows `Cannot read property 'data' of undefined`.
- MSW handlers return a shape different from what the backend returns.
- No integration test file exists that imports shared contract types.

**Phase to address:** Every feature phase. The contract check must be a definition-of-done criterion for each endpoint.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip HttpOnly cookies, use `Authorization: Bearer` | Simpler frontend, no cookie config | Full XSS token theft risk, must be retrofitted | Never — fix in auth phase |
| Trust `role` from JWT claim without DB check | One less DB query per request | Role changes don't take effect until token expires; stale privilege | Never for admin operations |
| Store secrets in `docker-compose.yml` | Easy local dev | Secrets leaked if repo is public or shared | Only in local dev with fake secrets; never in staging/prod |
| No transactions for multi-table writes | Simpler code | Partial writes on crash; inconsistent state | Never for financial or auth data |
| Application-level ID counters instead of DB sequences | Avoid DB roundtrip | Race conditions under concurrency | Never |
| `origin: '*'` in CORS | No CORS errors during dev | CSRF attack vector in production | Only in local dev; must be restricted before any shared deployment |
| Plan limits only in frontend | Faster to implement | Users bypass with DevTools | Never — always enforce server-side |
| Skip WebSocket auth middleware | Faster to prototype | Any user can join any chat room | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Better Auth + Fastify | Register Better Auth as an Express middleware wrapped with `middie` | Use `@better-auth/fastify` adapter or treat Better Auth as a request handler that Fastify proxies via `fastify.all('/api/auth/*', handler)` |
| Socket.io + Fastify | Access `fastify.server` before Fastify is listening | Use `fastify.ready()` hook before passing `fastify.server` to `new Server(fastify.server)` |
| PostgreSQL + Docker Compose | App container starts before DB is ready; connection fails at startup | Add `healthcheck` to the postgres service and `depends_on: { db: { condition: service_healthy } }` on the api service |
| Zod + Fastify schema validation | Use Zod schemas as Fastify JSON Schema (they are incompatible natively) | Use `fastify-type-provider-zod` package — converts Zod to JSON Schema for Fastify's serializer |
| Socket.io + nginx reverse proxy | WebSocket upgrades fail with `502` | Add `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` to nginx config |
| Better Auth session + frontend Bearer token | Frontend sends `Authorization: Bearer` but Better Auth expects cookies | Must change frontend `api-client.ts` to use `credentials: 'include'` for cookies — this is the one required frontend change |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 queries in conversation list (fetch all convos, then fetch last message per convo) | Slow `/conversations` endpoint; DB CPU spikes | Use a single JOIN or subquery to fetch last message with conversation list | ~50 concurrent users |
| Fetching all messages in a conversation without pagination | Memory spike; slow response for old chats | Cursor-based pagination from the start (`WHERE id < $cursor ORDER BY id DESC LIMIT 50`) | ~500 messages per conversation |
| Broadcasting every message to all connected sockets | High CPU on Socket.io server; wrong users see messages | Use Socket.io rooms — one room per `conversationId`; only send to participants | ~100 concurrent connections |
| No index on `messages.conversation_id` | Full table scan on message fetch | Add `CREATE INDEX idx_messages_conversation_id ON messages(conversation_id)` in initial migration | ~10,000 messages |
| Synchronous Zod parsing of large payloads in hot paths | Request latency spike | Parse only at boundary (route handler), not in every service function | High throughput search endpoint |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Returning full user object (including `password_hash`) in API responses | Password hash exposure, even hashed | Explicit response projection — never use `SELECT *` for user queries; use `SELECT id, username, email, role, plan_id` |
| XSS via stored chat message content | Script execution in victim's browser | Sanitize all stored HTML with `DOMPurify` equivalent on output, or store and transmit as plain text only and let the frontend render safely |
| Trusting `conversationId` from client without membership check | User reads other users' messages | Every message/conversation query must `JOIN conversation_participants WHERE user_id = $requestingUserId` |
| Admin endpoints lack server-side role check | Any authenticated user can call admin APIs | Fastify `preHandler` hook on all `/admin/*` routes that checks `request.session.role === 'admin'` — client-side guard alone is not sufficient |
| No audit log for admin actions | Cannot detect or investigate abuse | Insert to `audit_logs` table on every admin mutation (ban, delete, role change) as part of the same transaction |
| Weak JWT secret (short string, default value) | Offline JWT forgery | Generate a 256-bit random secret at deploy time (`openssl rand -hex 32`); never use "secret" or "changeme" |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| WebSocket reconnection not handled | Chat silently stops working after network hiccup; user thinks app is broken | Use Socket.io's built-in reconnection with `reconnection: true, reconnectionAttempts: 5` and show a "reconnecting..." indicator in the frontend |
| No optimistic UI for sent messages | Sending a message feels laggy (wait for server round-trip + socket echo) | Frontend already renders the sent message immediately; backend must NOT send the message back to the sender's socket (avoid double-render) |
| Search returns results but plan limit hit silently | User sees partial results with no explanation | Backend response for plan-limited search must include `meta.limited: true` and `meta.limitReason: "upgrade to see more"` |
| Session expiry causes blank page or infinite redirect loop | User is logged out silently mid-session | Backend returns `401` with a consistent error body; frontend intercepts 401s in `api-client.ts` and redirects to login |

---

## "Looks Done But Isn't" Checklist

- [ ] **JWT Auth:** Token is in an HttpOnly cookie — verify with DevTools that no JWT appears in `sessionStorage`, `localStorage`, or the response JSON body.
- [ ] **WebSocket Auth:** Open a WebSocket connection in the browser console without a valid session — it must be rejected with an error, not accepted.
- [ ] **Role Enforcement:** Send a request to `GET /admin/users` with a player-role JWT — it must return `403`, not `200`.
- [ ] **Plan Limits:** Call `POST /conversations` 11 times with a free-tier account — the 11th must be rejected, not accepted.
- [ ] **CORS:** From a different origin (e.g., a local HTML file), send a credentialed fetch to the API — it must be blocked by the browser.
- [ ] **Rate Limiting:** Send 101 requests to `POST /auth/login` in one minute from the same IP — the 101st must return `429`.
- [ ] **SQL Injection:** Send `sortField=id; DROP TABLE users--` to any search endpoint — it must return a validation error, not execute.
- [ ] **Contract Shape:** Run frontend with `VITE_USE_MOCK=false` and verify every list endpoint renders data (not empty state from shape mismatch).
- [ ] **Docker Secrets:** Run `git log --all -p | grep -i secret` — no real secrets in commit history.
- [ ] **Conversation Access:** Attempt to fetch messages from a conversation the current user is not a participant of — it must return `404` or `403`.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JWT exposed in sessionStorage (discovered post-deployment) | HIGH | Rotate JWT secret (invalidates all sessions), force re-login, move to HttpOnly cookies, redeploy |
| SQL injection in search endpoint | HIGH | Patch query, audit DB for exfiltration, reset compromised user passwords, review all raw queries |
| Race condition causes duplicate messages | MEDIUM | Add DB-level unique constraint on (conversation_id, client_generated_idempotency_key), deduplicate existing data, fix application logic |
| Secrets committed to git | HIGH | `git filter-branch` or BFG Repo Cleaner to purge history, rotate all exposed secrets immediately |
| Contract mismatch discovered in integration | LOW | Update Fastify route handler response shape to match shared contract, add regression test |
| WebSocket room not authenticated (discovered in testing) | MEDIUM | Add `io.use()` middleware, disconnect all existing connections, redeploy |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| JWT in sessionStorage / no HttpOnly cookie | Phase 1: Authentication | DevTools — no JWT in JS-accessible storage |
| WebSocket connections unauthenticated | Phase 3: Real-time messaging | Attempt unauthenticated WS connection — must fail |
| Race conditions in message delivery | Phase 3: Real-time messaging | Concurrent load test (10 simultaneous sends to same convo) |
| Role escalation via unsigned cookie | Phase 1: Authentication | Craft a `role: admin` cookie manually — must be rejected |
| CORS misconfiguration | Phase 2: HTTP routes / hardening | Cross-origin credentialed fetch from another origin — must be blocked |
| Plan enforcement server-side | Phase 4: Subscriptions | Call plan-gated endpoints beyond limit — must return 402/403 |
| SQL injection via dynamic sort | Phase 2: Search feature | Fuzz test sort/filter params with injection payloads |
| Docker secrets in environment | Phase 5: Deployment | `git log --all -p \| grep -i secret` — no matches |
| Rate limiting bypass | Phase 5: Hardening / Deployment | Test from behind nginx proxy — limits still enforced per real IP |
| Contract mismatch | Every feature phase | Run frontend against real API before marking any endpoint done |

---

## Sources

- CONCERNS.md codebase analysis — identified sessionStorage JWT, unsigned cookie, client-only role guard, client-only plan limits
- Fastify documentation: `trustProxy` configuration, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/cookie`
- Socket.io documentation: `io.use()` middleware, room management, reconnection configuration
- OWASP Top 10: A01 Broken Access Control (role escalation), A02 Cryptographic Failures (JWT storage), A03 Injection (SQL), A05 Security Misconfiguration (CORS, Docker)
- Better Auth documentation: session cookie mode, Fastify adapter
- PostgreSQL documentation: `SERIAL`/`BIGSERIAL` sequences, `SELECT FOR UPDATE`
- Docker documentation: `secrets:` block, `.env` file pattern, `ARG` vs `ENV` security

---
*Pitfalls research for: VarzeaPro — Fastify + Node.js + TypeScript + PostgreSQL + Socket.io social platform backend*
*Researched: 2026-03-23*
