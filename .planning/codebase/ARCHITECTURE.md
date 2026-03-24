# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Single-page application (SPA) with file-based routing, role-based access control, and a mock-first API layer.

**Key Characteristics:**
- React Router v7 (framework mode) with nested layouts and file-based route config
- Client-side auth via React Context + session cookie; no SSR-based auth
- MSW (Mock Service Worker) intercepts all API calls in dev/mock mode — same `api-client.ts` code paths used for both mock and real backend
- Shared typed contracts (`~shared/contracts`) define all API request/response shapes, consumed by both the API client and the MSW handlers

## Layers

**Route Layer:**
- Purpose: Pages and nested layout shells
- Location: `Projeto/apps/web/app/routes/`
- Contains: Page components, layout wrappers, route-level guards
- Depends on: Auth context, Plan context, API client
- Used by: React Router via `app/routes.ts`

**Shared Contracts Layer:**
- Purpose: Single source of truth for all data shapes exchanged with the API
- Location: `Projeto/apps/web/shared/contracts/`
- Contains: TypeScript types/interfaces for every domain (auth, players, teams, search, messaging, moderation, subscription)
- Depends on: Nothing (pure types)
- Used by: `api-client.ts`, MSW handlers, route components

**API Client Layer:**
- Purpose: Typed HTTP client — single `request()` function with domain-scoped exports
- Location: `Projeto/apps/web/app/lib/api-client.ts`
- Contains: `authApi`, `playersApi`, `teamsApi`, `searchApi`, `messagingApi`, `adminUsersApi`, `adminModerationApi`, `subscriptionApi`
- Depends on: `~shared/contracts`, `sessionStorage` for JWT token
- Used by: Route components, plan context

**Auth Layer:**
- Purpose: Session management, RBAC, and route protection
- Location: `Projeto/apps/web/app/lib/auth/`
- Contains:
  - `auth-context.tsx` — `AuthProvider`, `useAuth`, `useAuthState`, `useAuthActions`, `useRole`, `useNavItems`
  - `permissions.ts` — Pure functions: `canAccessRoute`, `getHomeForRole`, `getVisibleNavItems`, capability checks
  - `route-guards.ts` — `requireAuth`, `requireRole`, session cookie read/write
  - `session.ts` — `localStorage`/`sessionStorage` user persistence
  - `ClientAuthGuard.tsx` — Client-side redirect guard component
- Depends on: `~shared/contracts`, `api-client.ts`
- Used by: `root.tsx`, `_authenticated-layout.tsx`, individual route loaders

**Plan Layer:**
- Purpose: Subscription plan limits and feature gating
- Location: `Projeto/apps/web/app/lib/plan/`
- Contains:
  - `plan-context.tsx` — `PlanProvider`, `usePlan`, `usePlanState`, `usePlanActions`
  - `plan-gate.tsx` — Component for conditional rendering based on plan limits
- Depends on: Auth context, `subscriptionApi`, `~shared/contracts`
- Used by: Route components that gate features

**UI Components Layer:**
- Purpose: Reusable primitive UI components (shadcn/ui pattern)
- Location: `Projeto/apps/web/app/components/ui/`
- Contains: 50+ components (Button, Dialog, Form, Table, Sidebar, etc.)
- Depends on: Radix UI primitives, Tailwind CSS
- Used by: Route components, `app-shell.tsx`

**Mock Layer:**
- Purpose: In-browser API simulation via MSW; replaces backend in dev
- Location: `Projeto/apps/web/mocks/`
- Contains:
  - `handlers/` — Per-domain request handlers (auth, players, teams, search, messaging, admin, subscription)
  - `fixtures/` — Static seed data for all domains
  - `browser.ts` — MSW worker setup
- Depends on: `~shared/contracts`, fixtures
- Used by: `lib/mock-bootstrap.tsx` which activates MSW conditionally on `VITE_USE_MOCK`

## Data Flow

**Authenticated Page Request:**

1. User navigates to a route; React Router matches against `app/routes.ts`
2. `_authenticated-layout.tsx` renders `ClientAuthGuard` — checks `AuthContext` for a valid session
3. If no session: redirect to `/login?redirect=<path>`
4. If session present: `AppShell` renders with role-appropriate nav (from `getVisibleNavItems`)
5. Child route component mounts; calls API via `api-client.ts` (using `@tanstack/react-query` or direct call)
6. `api-client.ts` appends `Authorization: Bearer <token>` from `sessionStorage`
7. Request hits MSW handler (dev) or real backend (prod); response typed via `~shared/contracts`
8. Component renders with data; `PlanProvider` gates feature availability

**Login Flow:**

1. User submits login form on `routes/login.tsx`
2. `authApi.login()` called via `api-client.ts`
3. On success: `AuthContext.login(user, token)` called
4. Stores user in `localStorage` + token in `sessionStorage`; sets session cookie
5. Redirects to `getHomeForRole(role)` (`/jogador`, `/time`, or `/admin`)

**State Management:**
- Server state: `@tanstack/react-query` (QueryClient instantiated once in `root.tsx`)
- Auth state: React Context (`AuthStateContext` + `AuthActionsContext` split to avoid re-renders)
- Plan state: React Context (`PlanStateContext` + `PlanActionsContext` split)
- Theme state: `next-themes` ThemeProvider

## Key Abstractions

**SessionUser:**
- Purpose: The authenticated user shape used throughout the app
- Examples: `Projeto/apps/web/shared/contracts/auth.ts`
- Pattern: Imported from `~shared/contracts`; contains `id`, `email`, `name`, `role`, `planId`

**Role:**
- Purpose: Union type `"player" | "team" | "admin"` — drives all routing, nav, and feature access
- Examples: `Projeto/apps/web/app/lib/auth/permissions.ts`
- Pattern: Every permission check is a pure function taking `Role | null`

**ApiResponseEnvelope / ApiListResponse:**
- Purpose: Consistent API response shapes
- Examples: `Projeto/apps/web/app/lib/api-client.ts` lines 8-10
- Pattern: `{ data: T }` for single items; `{ data: T[], meta: { page, pageSize, total, totalPages } }` for lists

**Domain API objects (authApi, playersApi, etc.):**
- Purpose: Scoped, typed wrappers over the single `request()` function
- Examples: `Projeto/apps/web/app/lib/api-client.ts`
- Pattern: Each domain exported as a plain object of async functions; all types pulled from `~shared/contracts`

## Entry Points

**Application Root:**
- Location: `Projeto/apps/web/app/root.tsx`
- Triggers: React Router framework bootstrap
- Responsibilities: Mounts `QueryClientProvider`, `MockBootstrap`, `ThemeProvider`, `AuthProvider`, `PlanProvider`; global error boundary

**Route Config:**
- Location: `Projeto/apps/web/app/routes.ts`
- Triggers: React Router route matching
- Responsibilities: Declares full route tree — public routes, authenticated layout wrapper, role-scoped sub-trees (jogador/time/admin), catch-all 404

**Vite Entry:**
- Location: `Projeto/apps/web/vite.config.ts`
- Triggers: Dev server start and production build
- Responsibilities: Bundling, path alias `~shared` → `shared/`, `~/` → `app/`

## Error Handling

**Strategy:** React Router `ErrorBoundary` at root; no domain-level error boundaries detected.

**Patterns:**
- HTTP errors thrown as `ApiError` instances (status, code, message, details) from `api-client.ts`
- Route-level redirects thrown via React Router `redirect()` in `requireAuth` / `requireRole`
- Root `ErrorBoundary` in `root.tsx` catches unhandled route errors; shows 404 or generic error message

## Cross-Cutting Concerns

**Logging:** `console.*` only; no structured logging library detected.

**Validation:** Not detected at the form/API layer in shared contracts; form validation likely handled per-route.

**Authentication:** Client-side cookie (`varzeapro_session`) for loader-based auth; `sessionStorage` JWT token for API calls. `AuthProvider` is the single source of truth for auth state at runtime.

---

*Architecture analysis: 2026-03-23*
