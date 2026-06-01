# Codebase Concerns

**Analysis Date:** 2026-03-23

## Security Considerations

**Session token stored in sessionStorage (not HttpOnly cookie):**
- Risk: JWT token is accessible via JavaScript through `sessionStorage`, making it vulnerable to XSS attacks. Any injected script can read `varzeapro_token` and impersonate the user.
- Files: `Projeto/apps/web/app/lib/api-client.ts` (lines 54-67), `Projeto/apps/web/app/lib/auth/auth-context.tsx` (line 47)
- Current mitigation: None. sessionStorage is used explicitly.
- Recommendations: Move token to an HttpOnly, Secure, SameSite=Strict cookie managed server-side. Never expose the raw JWT to client JavaScript.

**Session cookie written insecurely from client JavaScript:**
- Risk: `setSessionCookie` in `route-guards.ts` writes a cookie containing both `user` and `token` JSON from the browser side. The cookie is not `HttpOnly`, meaning JavaScript can read and tamper with it. The user object inside is parsed directly without signature validation on the server loader.
- Files: `Projeto/apps/web/app/lib/auth/route-guards.ts` (lines 24-28)
- Current mitigation: SameSite=lax is set, which provides partial CSRF protection.
- Recommendations: Issue session cookies from the server (loader/action) using `Set-Cookie` headers with `HttpOnly` and `Secure` flags. Validate with a signed/encrypted session (e.g., `react-router` cookie sessions with a secret).

**Server-side auth guard reads cookie but does not validate signature:**
- Risk: `getSessionFromRequest` parses a JSON cookie directly as `SessionUser` without any HMAC or encryption verification. An attacker who can set or modify the `varzeapro_session` cookie gains arbitrary role escalation (e.g., setting `role: "admin"`).
- Files: `Projeto/apps/web/app/lib/auth/route-guards.ts` (lines 9-21)
- Current mitigation: None.
- Recommendations: Use a signed/encrypted cookie session (e.g., `createCookieSessionStorage` from react-router with a server-side secret) and verify the signature before trusting cookie contents.

**Admin route guard is client-only:**
- Risk: `_admin-layout.tsx` uses `ClientAuthGuard` with `requiredRole="admin"`. This is a client-side React effect redirect. A direct HTTP request (e.g., curl, SSR fetch) to `/admin/*` routes will render content before the guard fires. If the app ever serves sensitive data in loaders, this is a full authorization bypass.
- Files: `Projeto/apps/web/app/routes/admin/_admin-layout.tsx`, `Projeto/apps/web/app/lib/auth/ClientAuthGuard.tsx`
- Current mitigation: App is currently SPA-like and uses MSW mocks; server-side loaders do not yet exist.
- Recommendations: Add `requireAuth` + `requireRole` calls in every admin loader using `route-guards.ts`'s server-side helpers before any data is fetched.

**Plan enforcement is client-side only:**
- Risk: Plan limits (conversations, search results, advanced filters, etc.) are enforced exclusively in the frontend via `PlanProvider` and `PlanGate`. There is no server-side enforcement visible in the codebase. A user who removes or bypasses client-side checks can perform unlimited actions.
- Files: `Projeto/apps/web/app/lib/plan/plan-context.tsx`, `Projeto/apps/web/app/lib/plan/plan-gate.tsx`
- Current mitigation: None server-side.
- Recommendations: All plan-gated operations must be validated server-side in API handlers before returning data or persisting mutations.

**MSW mock layer enabled in DEV by default:**
- Risk: `MockBootstrap` activates MSW (Mock Service Worker) whenever `VITE_USE_MOCK` is not explicitly set to `"false"` in development. If a developer accidentally builds/deploys with `NODE_ENV=development` or leaves `VITE_USE_MOCK` unset in staging, the mock layer will intercept all API calls.
- Files: `Projeto/apps/web/app/lib/mock-bootstrap.tsx` (lines 5-7)
- Current mitigation: The condition requires `DEV` flag to also be true, which Vite sets only in dev server.
- Recommendations: Add an explicit check and document that production builds must always have `VITE_USE_MOCK=false`.

---

## Tech Debt

**Dual auth state: sessionStorage + cookie redundancy:**
- Issue: Auth state is persisted in three separate places simultaneously: `sessionStorage` (`varzeapro_token` + `varzeapro_user`), a browser cookie (`varzeapro_session`), and React state (`AuthProvider`). These can drift out of sync (e.g., cookie cleared but sessionStorage not, or vice versa). Logout clears all three, but only if `logout()` is called correctly.
- Files: `Projeto/apps/web/app/lib/api-client.ts`, `Projeto/apps/web/app/lib/auth/session.ts`, `Projeto/apps/web/app/lib/auth/route-guards.ts`, `Projeto/apps/web/app/lib/auth/auth-context.tsx`
- Impact: Inconsistent auth state across tabs, page refreshes, and SSR/CSR transitions. Race conditions possible.
- Fix approach: Pick one canonical auth storage strategy (server-managed HttpOnly cookie) and remove the others.

**`isLoading` flag unused in AuthProvider:**
- Issue: `AuthProvider` declares `isLoading: boolean` in its state and initializes it to `false`, but it is never set to `true`. The flag is exposed via `useAuth()` but carries no meaningful signal.
- Files: `Projeto/apps/web/app/lib/auth/auth-context.tsx` (lines 27, 40, 64)
- Impact: Consumers relying on `isLoading` for loading states will never see a loading state during auth operations.
- Fix approach: Either implement it properly around async auth calls, or remove it from the public API.

**`planId` read directly from `user.planId` without validation:**
- Issue: In `PlanProvider`, `planId` is derived as `(user?.planId as PlanId) ?? "free"`. This uses a TypeScript cast (`as PlanId`) rather than a schema validation. If the API returns an unexpected or stale plan ID, it silently defaults to behavior based on an unknown value.
- Files: `Projeto/apps/web/app/lib/plan/plan-context.tsx` (line 51)
- Impact: Silent wrong plan limits displayed to users.
- Fix approach: Use `PlanIdSchema.safeParse(user?.planId)` from `~shared/contracts` and fall back to `"free"` on parse failure.

**Admin role treated as "player" for plan limits:**
- Issue: `PlanProvider` resolves `effectiveRole` as `role === "admin" ? "player" : role`. Admins will silently get player-tier plan limits applied when they use the platform, which may hide bugs in team-role plan enforcement.
- Files: `Projeto/apps/web/app/lib/plan/plan-context.tsx` (line 52)
- Impact: Admins cannot test team-role plan-gated features.
- Fix approach: Either give admins unlimited access (bypass plan limits entirely) or provide an explicit admin plan config.

**`free` plan config shared between player and team roles:**
- Issue: `PLAN_CONFIGS.free` has `role: "player"` but is used for both players and teams via `getDefaultLimitsForRole`. The `getPlansForRole` function mutates the free plan object's display fields at runtime to fake a team version. This is fragile and the `PLAN_CONFIGS.free.limits` returned for `player` role (`getPlanLimits("free", "player")`) calls `PLAN_CONFIGS.free.limits` directly, giving free players `searchResults: UNLIMITED` while free teams get `searchResults: 10`.
- Files: `Projeto/apps/web/shared/contracts/subscription.ts` (lines 83-202)
- Impact: Plan limit inconsistencies, confusing code path, risk of regression when modifying free plan.
- Fix approach: Define separate `free_player` and `free_team` entries in `PLAN_CONFIGS`, or use a role-keyed free limits map.

**Password reset flow is incomplete:**
- Issue: `recuperar-senha.tsx` submits to `authApi.forgotPassword` which returns `{ success, message }`, but there is no route for the reset-password step (the page where users enter a new password after clicking the email link). The flow is half-implemented.
- Files: `Projeto/apps/web/app/routes/recuperar-senha.tsx`
- Impact: Users who request a password reset cannot complete it.
- Fix approach: Implement a `/redefinir-senha?token=...` route that calls a `resetPassword` API endpoint.

**No real-time messaging — polling not implemented:**
- Issue: The messaging UI fetches messages via `useQuery` with no `refetchInterval` set. New messages only appear when the user manually navigates away and back, or when `sendMutation.onSuccess` fires (which only refreshes after the current user sends).
- Files: `Projeto/apps/web/app/routes/jogador/mensagens.tsx` (lines 34-38), `Projeto/apps/web/app/routes/time/mensagens.tsx`
- Impact: Messages from other participants are never shown without a page reload.
- Fix approach: Add `refetchInterval: 5000` to the messages query as a minimal polling solution, or implement WebSocket/SSE for real-time updates.

---

## Test Coverage Gaps

**No test files exist:**
- What's not tested: Entire application — auth flows, plan gate logic, route guards, API client, form validation, component rendering.
- Files: Entire `Projeto/apps/web/app/` directory. No `*.test.*` or `*.spec.*` files found.
- Risk: Any refactor or bug fix has zero automated regression protection. Security-critical paths (auth, plan enforcement) are completely untested.
- Priority: High

**MSW handlers are the only "tests" for API contracts:**
- What's not tested: The mock handlers in `Projeto/apps/web/mocks/handlers/` define the expected API shape but are never asserted against. Contract drift between mock and real API is silent.
- Files: `Projeto/apps/web/mocks/handlers/`
- Risk: Real API integration failures will only be discovered at runtime.
- Priority: High

---

## Fragile Areas

**`ClientAuthGuard` renders `null` during navigation:**
- Files: `Projeto/apps/web/app/lib/auth/ClientAuthGuard.tsx` (lines 37-38)
- Why fragile: The guard returns `null` while the redirect effect is running. This causes a brief flash of empty content on every protected route load before the redirect completes, and any child component that renders immediately will throw if it depends on auth context values.
- Safe modification: Add a loading skeleton instead of returning `null`, or use React Router's `loader`-level redirects for server-side protection.
- Test coverage: None.

**`queryClient` instantiated as module-level singleton in `root.tsx`:**
- Files: `Projeto/apps/web/app/root.tsx` (line 19)
- Why fragile: `const queryClient = new QueryClient()` at module scope means the same instance is reused across all SSR requests in production (if SSR is used), causing cache poisoning between users. In a Vite dev server or pure SPA this is benign but will break if SSR is enabled.
- Safe modification: Instantiate `QueryClient` inside the component or use a ref: `const [queryClient] = useState(() => new QueryClient())`.
- Test coverage: None.

---

## Performance Bottlenecks

**No pagination or virtual scroll in conversation list:**
- Problem: `messagingApi.listConversations()` fetches all conversations without pagination. The list renders all items directly in the DOM.
- Files: `Projeto/apps/web/app/routes/jogador/mensagens.tsx` (lines 29-31, 84-118)
- Cause: No `params` passed to `listConversations`; no virtual scroll library used.
- Improvement path: Add server-side pagination to the conversations endpoint and implement cursor-based infinite scroll on the client.

**No query cache stale time configured:**
- Problem: `QueryClient` is instantiated with default settings (staleTime: 0). Every component mount triggers a background refetch, creating unnecessary API calls.
- Files: `Projeto/apps/web/app/root.tsx` (line 19)
- Cause: No `defaultOptions` passed to `QueryClient`.
- Improvement path: Set `defaultOptions: { queries: { staleTime: 30_000 } }` as a baseline.

---

## Missing Critical Features

**No real backend — entire app runs on MSW mocks:**
- Problem: There is no backend service, database, or real API in this repository. All data is served by MSW mock handlers with in-memory fixtures.
- Blocks: Production deployment, real user data persistence, actual payment/subscription processing.

**No payment integration for subscription upgrade:**
- Problem: `subscriptionApi.upgrade` POSTs to `/subscription/upgrade` which is a mock endpoint. There is no Stripe, MercadoPago, or any payment processor integration.
- Files: `Projeto/apps/web/app/lib/api-client.ts` (lines 195-200), `Projeto/apps/web/app/routes/planos.tsx`
- Blocks: Monetization.

---

*Concerns audit: 2026-03-23*
