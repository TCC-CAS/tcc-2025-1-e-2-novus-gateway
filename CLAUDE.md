<!-- GSD:project-start source:PROJECT.md -->
## Project

**VarzeaPro**

VarzeaPro is a social platform for e-sports that connects competitive players and teams — think "LinkedIn meets Discord" for the Brazilian competitive gaming scene. Users create public profiles, discover teammates and organizations through advanced search, communicate via real-time chat, and unlock features through tiered subscription plans.

**Core Value:** **Players and teams find each other fast** — every other feature (subscriptions, moderation, admin) exists to make that discovery trustworthy and sustainable.

### Constraints

- **Tech Stack**: Fastify + Node.js + TypeScript for backend — decided and non-negotiable
- **Database**: PostgreSQL — relational model fits the domain (users, teams, subscriptions, audit)
- **Auth**: Better Auth library — fresh choice, frontend auth flows will adapt to its session shape
- **Real-time**: WebSockets (Socket.io preferred for room management) — full live chat required
- **Deployment**: VPS via Docker Compose — single server, all services containerized
- **Contract Fidelity**: Backend response shapes must match `~shared/contracts` exactly — frontend is not getting rewritten
- **Security**: Rate limiting on all public endpoints, input validation (Zod), HttpOnly cookies for auth tokens, protection against DDoS/XSS/race conditions
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9 - All application code (`Projeto/apps/web/app/`, `Projeto/apps/web/mocks/`)
- CSS (via Tailwind CSS v4) - Styling, entry in `Projeto/apps/web/app/app.css`
## Runtime
- Node.js 20 (Alpine) - Specified in `Projeto/apps/web/Dockerfile`
- Bun (primary dev) - `Projeto/apps/web/bun.lock` present
- npm (Docker/CI) - Dockerfile uses `npm ci`
- Lockfile: `bun.lock` present (bun), `package-lock.json` referenced in Dockerfile
## Frameworks
- React 19.2 - UI component rendering (`Projeto/apps/web/app/`)
- React Router 7.12 - SSR-enabled full-stack routing framework (`Projeto/apps/web/react-router.config.ts`)
- Vite 7.1 - Dev server and bundler (`Projeto/apps/web/vite.config.ts`)
- `@react-router/dev` 7.12 - React Router Vite plugin
- `@tailwindcss/vite` 4.1 - Tailwind CSS Vite integration
- `vite-tsconfig-paths` 5.1 - TypeScript path alias resolution in Vite
- MSW (Mock Service Worker) 2.12 - Browser API mocking in dev/test (`Projeto/apps/web/mocks/`)
## Key Dependencies
- `shadcn` 3.8 (CLI) + `radix-ui` 1.4 + `@base-ui/react` 1.2 - Headless component primitives
- `lucide-react` 0.563 - Icon library
- `tailwind-merge` 3.4 + `clsx` 2.1 + `class-variance-authority` 0.7 - Conditional class utilities
- `tw-animate-css` 1.4 - Animation utilities
- `next-themes` 0.4 - Theme switching (light/dark)
- `react-hook-form` 7.71 - Form state management
- `@hookform/resolvers` 5.2 - Validation resolver bridge
- `zod` 4.3 - Schema validation and type inference
- `@tanstack/react-query` 5.90 - Server state management and caching
- `recharts` 2.15 - Charting and data visualization
- `embla-carousel-react` 8.6 - Carousel component
- `react-day-picker` 9.13 - Date picker
- `react-resizable-panels` 4 - Resizable panel layouts
- `vaul` 1.1 - Drawer/sheet component
- `cmdk` 1.1 - Command palette
- `input-otp` 1.4 - OTP input
- `sonner` 2.0 - Toast notifications
- `date-fns` 4.1 - Date utility library
- `isbot` 5.1 - Bot detection (SSR use)
## Configuration
- Configured via `.env` files (`.env.example` at `Projeto/apps/web/.env.example`)
- `VITE_API_URL` - Backend API base URL (defaults to `/api` if unset)
- `VITE_USE_MOCK` - Toggle MSW mock API (`"true"` to force mock, `"false"` to disable in dev)
- `Projeto/apps/web/vite.config.ts` - Vite build config
- `Projeto/apps/web/react-router.config.ts` - React Router SSR config
- `Projeto/apps/web/tsconfig.json` - TypeScript config
- `Projeto/apps/web/components.json` - shadcn/ui configuration
## Platform Requirements
- Node.js 20+ or Bun runtime
- Run: `bun run dev` (or `npm run dev`)
- Docker image based on `node:20-alpine`
- Multi-stage build: install deps → build → serve
- Serve command: `react-router-serve ./build/server/index.js`
- Container build defined at `Projeto/apps/web/Dockerfile`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Route files: kebab-case with Portuguese names matching URL segments (e.g., `buscar-jogadores.tsx`, `perfil-editar.tsx`)
- Layout files: prefixed with underscore + kebab-case descriptor (e.g., `_authenticated-layout.tsx`, `_player-layout.tsx`, `_admin-layout.tsx`)
- Dynamic route files: dot-separated param syntax (e.g., `jogadores.$id.tsx`, `usuarios.$id.tsx`)
- Component files: kebab-case (e.g., `app-shell.tsx`, `button-group.tsx`)
- Library/utility files: kebab-case (e.g., `auth-context.tsx`, `api-client.ts`, `route-guards.ts`)
- Hook files: `use-` prefix in kebab-case (e.g., `use-mobile.ts`)
- Contract files: domain-noun kebab-case (e.g., `auth.ts`, `players.ts`, `teams.ts`)
- React components: PascalCase (e.g., `AuthProvider`, `MockBootstrap`, `JogadorHome`)
- Custom hooks: camelCase with `use` prefix (e.g., `useAuth`, `useAuthState`, `useAuthActions`, `useRole`, `useNavItems`)
- Regular functions: camelCase (e.g., `onSubmit`, `authHeaders`, `getAuthToken`, `setAuthToken`)
- API namespace objects: camelCase with `Api` suffix (e.g., `authApi`, `playersApi`, `teamsApi`, `searchApi`, `messagingApi`)
- Handler arrays: camelCase with `Handlers` suffix (e.g., `authHandlers`, `playersHandlers`, `teamsHandlers`)
- Fixture objects: camelCase with `mock` prefix (e.g., `mockPlayerProfiles`, `mockTeamSummaries`, `mockUsers`)
- camelCase throughout
- Constants: SCREAMING_SNAKE_CASE for module-level fixed values (e.g., `const API = "/api"`, `const PROFILE_STEPS`, `const PROFILE_COMPLETED`)
- Zod schemas: PascalCase with `Schema` suffix (e.g., `LoginRequestSchema`, `RoleSchema`, `SessionUserSchema`)
- Inferred types: `type Foo = z.infer<typeof FooSchema>` — same name without `Schema` suffix
- Type aliases: PascalCase (e.g., `AuthState`, `AuthActions`, `Role`, `SessionUser`)
- Context split pattern: state context and actions context as separate named contexts (e.g., `AuthStateContext`, `AuthActionsContext`)
## Code Style
- No Prettier or ESLint config files detected — formatting appears consistent but not enforced by tooling config
- Semicolons: omitted (no trailing semicolons in most files; some files use them in imports)
- Quotes: double quotes for strings
- Indentation: 2 spaces
- Strict typing throughout; uses `z.infer` to derive types from Zod schemas
- `import type` used for type-only imports (e.g., `import type { SessionUser } from "~shared/contracts"`)
- Inline `import()` for type references inside function signatures when avoiding circular imports (e.g., in `api-client.ts`)
- Type assertions used carefully with `as` keyword where needed
## Import Organization
- `~/` — maps to `app/` directory (internal app code)
- `~shared/` — maps to `shared/` directory (contracts and shared types)
## Error Handling
- API calls wrapped in `try/catch/finally` blocks in form submit handlers
- `ApiError` class (from `~/lib/api-client`) checked with `instanceof` to distinguish API errors from generic errors
- User-facing error messages shown via `sonner` toast: `toast.error(message)`
- Fallback message string provided for non-ApiError cases
- `finally` block always used to reset loading state
## API Client Pattern
- Single `request<T>()` generic function in `app/lib/api-client.ts` handles all HTTP
- Domain-scoped API objects group related endpoints (e.g., `authApi`, `playersApi`)
- Auth header injected via `authHeaders()` helper on each call (not via interceptor)
- API error shape: `{ error: { code: string; message: string; details?: unknown[] } }`
- Response types imported inline from `~shared/contracts` to avoid top-level circular imports
## Forms
- `react-hook-form` with `zodResolver` for all form validation
- Zod schema imported from `~shared/contracts` (co-located with inferred type)
- Form errors rendered inline below each field with `form.formState.errors.fieldName?.message`
- Submit state tracked with local `useState<boolean>` (`isSubmitting`)
## Context Pattern
- State context and actions context created separately to allow consumers to subscribe only to what they need
- Both exposed via a combined `useAuth()` hook for convenience
- Context consumers throw `Error` with descriptive message if used outside provider
## Component Design
- Located in `app/components/ui/` — shadcn-style primitives
- Use `cn()` utility from `app/lib/utils.ts` for conditional Tailwind class merging
- Tailwind CSS v4 utility classes used exclusively — no CSS modules or styled-components
- Brutalist design system: `rounded-none`, heavy border/shadow patterns, uppercase typography
- Theme tokens referenced as CSS variables: `var(--color-foreground)`, `var(--color-primary)`
## Logging
## Comments
- JSDoc-style block comments on module files (e.g., top of `api-client.ts` explains purpose)
- Section comments in large components using `{/* SECTION NAME */}` JSX comments
- Inline `//` comments for non-obvious logic
## Module Design
- Named exports for everything except default route components
- Route components use `export default function ComponentName()`
- Barrel `index.ts` files used in lib subdirectories (e.g., `app/lib/auth/index.ts`, `app/lib/plan/index.ts`, `shared/contracts/index.ts`)
- Handler arrays spread into parent `handlers` array via barrel `mocks/handlers/index.ts`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- React Router v7 (framework mode) with nested layouts and file-based route config
- Client-side auth via React Context + session cookie; no SSR-based auth
- MSW (Mock Service Worker) intercepts all API calls in dev/mock mode — same `api-client.ts` code paths used for both mock and real backend
- Shared typed contracts (`~shared/contracts`) define all API request/response shapes, consumed by both the API client and the MSW handlers
## Layers
- Purpose: Pages and nested layout shells
- Location: `Projeto/apps/web/app/routes/`
- Contains: Page components, layout wrappers, route-level guards
- Depends on: Auth context, Plan context, API client
- Used by: React Router via `app/routes.ts`
- Purpose: Single source of truth for all data shapes exchanged with the API
- Location: `Projeto/apps/web/shared/contracts/`
- Contains: TypeScript types/interfaces for every domain (auth, players, teams, search, messaging, moderation, subscription)
- Depends on: Nothing (pure types)
- Used by: `api-client.ts`, MSW handlers, route components
- Purpose: Typed HTTP client — single `request()` function with domain-scoped exports
- Location: `Projeto/apps/web/app/lib/api-client.ts`
- Contains: `authApi`, `playersApi`, `teamsApi`, `searchApi`, `messagingApi`, `adminUsersApi`, `adminModerationApi`, `subscriptionApi`
- Depends on: `~shared/contracts`, `sessionStorage` for JWT token
- Used by: Route components, plan context
- Purpose: Session management, RBAC, and route protection
- Location: `Projeto/apps/web/app/lib/auth/`
- Contains:
- Depends on: `~shared/contracts`, `api-client.ts`
- Used by: `root.tsx`, `_authenticated-layout.tsx`, individual route loaders
- Purpose: Subscription plan limits and feature gating
- Location: `Projeto/apps/web/app/lib/plan/`
- Contains:
- Depends on: Auth context, `subscriptionApi`, `~shared/contracts`
- Used by: Route components that gate features
- Purpose: Reusable primitive UI components (shadcn/ui pattern)
- Location: `Projeto/apps/web/app/components/ui/`
- Contains: 50+ components (Button, Dialog, Form, Table, Sidebar, etc.)
- Depends on: Radix UI primitives, Tailwind CSS
- Used by: Route components, `app-shell.tsx`
- Purpose: In-browser API simulation via MSW; replaces backend in dev
- Location: `Projeto/apps/web/mocks/`
- Contains:
- Depends on: `~shared/contracts`, fixtures
- Used by: `lib/mock-bootstrap.tsx` which activates MSW conditionally on `VITE_USE_MOCK`
## Data Flow
- Server state: `@tanstack/react-query` (QueryClient instantiated once in `root.tsx`)
- Auth state: React Context (`AuthStateContext` + `AuthActionsContext` split to avoid re-renders)
- Plan state: React Context (`PlanStateContext` + `PlanActionsContext` split)
- Theme state: `next-themes` ThemeProvider
## Key Abstractions
- Purpose: The authenticated user shape used throughout the app
- Examples: `Projeto/apps/web/shared/contracts/auth.ts`
- Pattern: Imported from `~shared/contracts`; contains `id`, `email`, `name`, `role`, `planId`
- Purpose: Union type `"player" | "team" | "admin"` — drives all routing, nav, and feature access
- Examples: `Projeto/apps/web/app/lib/auth/permissions.ts`
- Pattern: Every permission check is a pure function taking `Role | null`
- Purpose: Consistent API response shapes
- Examples: `Projeto/apps/web/app/lib/api-client.ts` lines 8-10
- Pattern: `{ data: T }` for single items; `{ data: T[], meta: { page, pageSize, total, totalPages } }` for lists
- Purpose: Scoped, typed wrappers over the single `request()` function
- Examples: `Projeto/apps/web/app/lib/api-client.ts`
- Pattern: Each domain exported as a plain object of async functions; all types pulled from `~shared/contracts`
## Entry Points
- Location: `Projeto/apps/web/app/root.tsx`
- Triggers: React Router framework bootstrap
- Responsibilities: Mounts `QueryClientProvider`, `MockBootstrap`, `ThemeProvider`, `AuthProvider`, `PlanProvider`; global error boundary
- Location: `Projeto/apps/web/app/routes.ts`
- Triggers: React Router route matching
- Responsibilities: Declares full route tree — public routes, authenticated layout wrapper, role-scoped sub-trees (jogador/time/admin), catch-all 404
- Location: `Projeto/apps/web/vite.config.ts`
- Triggers: Dev server start and production build
- Responsibilities: Bundling, path alias `~shared` → `shared/`, `~/` → `app/`
## Error Handling
- HTTP errors thrown as `ApiError` instances (status, code, message, details) from `api-client.ts`
- Route-level redirects thrown via React Router `redirect()` in `requireAuth` / `requireRole`
- Root `ErrorBoundary` in `root.tsx` catches unhandled route errors; shows 404 or generic error message
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
