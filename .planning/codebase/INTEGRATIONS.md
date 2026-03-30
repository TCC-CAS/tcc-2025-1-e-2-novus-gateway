# External Integrations

**Analysis Date:** 2026-03-23

## APIs & External Services

**Backend REST API (VárzeaPro):**
- Custom backend API - All app data and business logic
  - SDK/Client: Custom typed fetch wrapper at `Projeto/apps/web/app/lib/api-client.ts`
  - Base URL: `VITE_API_URL` env var (defaults to `/api` on same origin)
  - Auth: Bearer token via `Authorization` header
  - API modules exposed: `authApi`, `playersApi`, `teamsApi`, `searchApi`, `messagingApi`, `adminUsersApi`, `adminModerationApi`, `subscriptionApi`

**API Endpoints (as defined in client):**
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/forgot-password` - Password reset
- `GET/PUT /players/me`, `GET /players/:id` - Player profiles
- `GET/PUT /teams/me`, `GET /teams/:id` - Team profiles
- `GET /search/players`, `GET /search/teams` - Search
- `GET/POST /conversations`, `GET/POST /conversations/:id/messages` - Messaging
- `GET /admin/users`, `GET /admin/users/:id`, `POST /admin/users/:id/ban` - Admin user management
- `GET /admin/moderation/reports`, `POST /admin/moderation/reports/:id` - Content moderation
- `GET /subscription/usage`, `POST /subscription/upgrade` - Subscription management

## Data Storage

**Databases:**
- Not applicable - Frontend-only app; backend database not visible in this codebase

**Client-side Session Storage:**
- `varzeapro_token` - JWT auth token (sessionStorage)
- `varzeapro_user` - Serialized user object (sessionStorage)
- `varzeapro_onboarding_done` - Onboarding flag (sessionStorage)
- Managed by `Projeto/apps/web/app/lib/auth/session.ts` and `Projeto/apps/web/app/lib/api-client.ts`

**File Storage:**
- Not detected

**Caching:**
- TanStack Query (`@tanstack/react-query` v5) - In-memory client-side cache for API responses

## Authentication & Identity

**Auth Provider:**
- Custom (backend-owned)
  - Implementation: JWT Bearer token flow
  - Login/signup endpoints on backend API
  - Token stored in `sessionStorage` via `Projeto/apps/web/app/lib/api-client.ts`
  - Session validation in `Projeto/apps/web/app/lib/auth/session.ts`
  - Route guards at `Projeto/apps/web/app/lib/auth/route-guards.ts`
  - Role-based permissions at `Projeto/apps/web/app/lib/auth/permissions.ts`
  - Roles observed: `player`, `team` (admin role implied by admin API routes)

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Datadog, or similar)

**Logs:**
- Browser console only; no structured logging library detected

## CI/CD & Deployment

**Hosting:**
- Docker container - `Projeto/apps/web/Dockerfile` defines a production multi-stage build
- Target runtime: `node:20-alpine`

**CI Pipeline:**
- Not detected in this codebase (no GitHub Actions, CircleCI, etc. found)

## Environment Configuration

**Required env vars:**
- `VITE_API_URL` - Backend API base URL (optional; defaults to `/api`)
- `VITE_USE_MOCK` - Enable/disable MSW mock API (`"true"` / `"false"`)

**Secrets location:**
- `.env` file at project root (gitignored; `.env.example` committed at `Projeto/apps/web/.env.example`)

## Mock API Layer

**Framework:** MSW (Mock Service Worker) v2.12

**Purpose:** Intercepts API calls in the browser during development or when `VITE_USE_MOCK=true`, allowing frontend development without a running backend.

**Mock handlers registered:**
- `Projeto/apps/web/mocks/handlers/auth.ts` - Auth endpoints
- `Projeto/apps/web/mocks/handlers/players.ts` - Player endpoints
- `Projeto/apps/web/mocks/handlers/teams.ts` - Team endpoints
- `Projeto/apps/web/mocks/handlers/search.ts` - Search endpoints
- `Projeto/apps/web/mocks/handlers/messaging.ts` - Messaging endpoints
- `Projeto/apps/web/mocks/handlers/admin.ts` - Admin endpoints
- `Projeto/apps/web/mocks/handlers/subscription.ts` - Subscription endpoints

**Mock fixtures:**
- `Projeto/apps/web/mocks/fixtures/` - Static test data for players, teams, users, messaging, moderation, auth, subscription

**Service worker registration:**
- `Projeto/apps/web/mocks/browser.ts` - Registers MSW browser worker
- `Projeto/apps/web/public/mockServiceWorker.js` - MSW service worker script

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected

## Shared Contracts

**Type contracts:**
- Shared type definitions imported from `~shared/contracts` alias
- Used throughout `Projeto/apps/web/app/lib/api-client.ts` for request/response typing
- Alias resolves to `Projeto/apps/web/shared/` per `tsconfig.json` paths

---

*Integration audit: 2026-03-23*
