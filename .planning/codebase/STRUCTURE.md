# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
tcc-2025-1-e-2-novus-gateway/     # Repo root
├── Projeto/                       # All runnable code lives here
│   └── apps/
│       └── web/                   # Single web app (React Router v7 + Vite)
│           ├── app/               # Application source
│           │   ├── components/
│           │   │   └── ui/        # Primitive UI components (shadcn/ui)
│           │   ├── hooks/         # Shared React hooks
│           │   ├── lib/           # Cross-cutting logic
│           │   │   ├── auth/      # Auth context, permissions, guards, session
│           │   │   └── plan/      # Subscription plan context and gates
│           │   ├── routes/        # Page components and layout shells
│           │   │   ├── admin/     # Admin-role pages
│           │   │   ├── jogador/   # Player-role pages
│           │   │   └── time/      # Team-role pages
│           │   ├── root.tsx       # App root (providers + error boundary)
│           │   ├── routes.ts      # Route tree declaration
│           │   └── app.css        # Global styles
│           ├── mocks/             # MSW mock layer (dev/test only)
│           │   ├── fixtures/      # Static seed data per domain
│           │   ├── handlers/      # MSW request handlers per domain
│           │   └── browser.ts     # MSW service worker setup
│           ├── shared/
│           │   └── contracts/     # Shared TypeScript types (API shapes)
│           └── public/            # Static assets + MSW service worker JS
├── Documentacao/                  # Project documentation files
├── Imagens/                       # Screenshot/image assets
└── .planning/                     # GSD planning docs (not shipped)
```

## Directory Purposes

**`Projeto/apps/web/app/routes/`:**
- Purpose: All page-level React components and layout wrappers
- Contains: One `.tsx` file per page or layout; nested by role (`admin/`, `jogador/`, `time/`)
- Key files:
  - `Projeto/apps/web/app/routes.ts` — route tree config
  - `Projeto/apps/web/app/routes/_authenticated-layout.tsx` — auth gate + AppShell wrapper
  - `Projeto/apps/web/app/routes/_index.tsx` — landing/redirect page
  - `Projeto/apps/web/app/routes/login.tsx` — login page
  - `Projeto/apps/web/app/routes/cadastro.tsx` — registration
  - `Projeto/apps/web/app/routes/onboarding.tsx` — post-signup onboarding
  - `Projeto/apps/web/app/routes/404.tsx` — catch-all not-found

**`Projeto/apps/web/app/lib/auth/`:**
- Purpose: All authentication and authorization logic
- Contains:
  - `auth-context.tsx` — `AuthProvider` and all `useAuth*` hooks
  - `permissions.ts` — pure RBAC functions, nav definitions
  - `route-guards.ts` — `requireAuth`, `requireRole`, cookie helpers
  - `session.ts` — user persistence in storage
  - `ClientAuthGuard.tsx` — client-side redirect guard component
  - `index.ts` — public exports barrel

**`Projeto/apps/web/app/lib/plan/`:**
- Purpose: Subscription plan feature gating
- Contains:
  - `plan-context.tsx` — `PlanProvider`, `usePlan*` hooks, usage fetching
  - `plan-gate.tsx` — conditional rendering component
  - `index.ts` — public exports barrel

**`Projeto/apps/web/app/lib/`:**
- Purpose: Shared utilities and cross-cutting concerns
- Key files:
  - `Projeto/apps/web/app/lib/api-client.ts` — entire typed HTTP client
  - `Projeto/apps/web/app/lib/utils.ts` — generic utilities (e.g., `cn()` for Tailwind class merging)
  - `Projeto/apps/web/app/lib/mock-bootstrap.tsx` — conditionally activates MSW in dev

**`Projeto/apps/web/app/components/ui/`:**
- Purpose: Reusable primitive UI components following the shadcn/ui pattern
- Contains: 50+ components (accordion, button, dialog, form, sidebar, table, etc.)
- Key files:
  - `Projeto/apps/web/app/components/ui/button.tsx`
  - `Projeto/apps/web/app/components/ui/form.tsx`
  - `Projeto/apps/web/app/components/ui/sidebar.tsx`
- Components are not exported via a barrel — import directly by name

**`Projeto/apps/web/app/components/`:**
- Purpose: App-level composed components (not primitives)
- Key files:
  - `Projeto/apps/web/app/components/app-shell.tsx` — authenticated layout shell with sidebar/nav

**`Projeto/apps/web/shared/contracts/`:**
- Purpose: Shared TypeScript types for all API domains; no runtime code
- Contains: One file per domain, all re-exported from `index.ts`
- Key files:
  - `Projeto/apps/web/shared/contracts/auth.ts` — `SessionUser`, `Role`
  - `Projeto/apps/web/shared/contracts/players.ts` — `PlayerProfile`, `UpsertPlayerProfileRequest`
  - `Projeto/apps/web/shared/contracts/teams.ts` — `TeamProfile`, `UpsertTeamProfileRequest`
  - `Projeto/apps/web/shared/contracts/subscription.ts` — `PlanId`, `PlanLimits`, `Usage`, `getPlanLimits`
  - `Projeto/apps/web/shared/contracts/index.ts` — barrel export

**`Projeto/apps/web/mocks/`:**
- Purpose: MSW-based in-browser mock API for development
- Contains: Per-domain handlers and fixture data
- Key files:
  - `Projeto/apps/web/mocks/browser.ts` — MSW worker setup
  - `Projeto/apps/web/mocks/handlers/index.ts` — aggregates all handlers
  - `Projeto/apps/web/mocks/fixtures/index.ts` — aggregates all fixture data

**`Projeto/apps/web/app/hooks/`:**
- Purpose: Shared custom React hooks
- Key files:
  - `Projeto/apps/web/app/hooks/use-mobile.ts` — responsive breakpoint detection

## Key File Locations

**Entry Points:**
- `Projeto/apps/web/app/root.tsx`: Application root with all global providers
- `Projeto/apps/web/app/routes.ts`: Complete route tree declaration
- `Projeto/apps/web/vite.config.ts`: Build and dev server configuration

**Configuration:**
- `Projeto/apps/web/react-router.config.ts`: React Router framework config
- `Projeto/apps/web/tsconfig.json`: TypeScript config with path aliases
- `Projeto/apps/web/components.json`: shadcn/ui component config
- `Projeto/apps/web/.env.example`: Required environment variable template

**Core Logic:**
- `Projeto/apps/web/app/lib/api-client.ts`: All HTTP calls to backend
- `Projeto/apps/web/app/lib/auth/auth-context.tsx`: Auth state and actions
- `Projeto/apps/web/app/lib/auth/permissions.ts`: RBAC rules
- `Projeto/apps/web/app/lib/plan/plan-context.tsx`: Subscription feature gates

**Shared Types:**
- `Projeto/apps/web/shared/contracts/index.ts`: All API types (barrel)

## Naming Conventions

**Files:**
- Route pages: kebab-case matching the URL segment — `buscar-jogadores.tsx`, `perfil-editar.tsx`
- Layout files: prefixed with `_` + role + `-layout` — `_authenticated-layout.tsx`, `_player-layout.tsx`
- Dynamic route segments: use `.$id` suffix — `usuarios.$id.tsx`, `jogadores.$id.tsx`
- Context files: `<domain>-context.tsx`
- Guard files: `PascalCase` for components (`ClientAuthGuard.tsx`), `kebab-case` for utilities (`route-guards.ts`)

**Directories:**
- Role-scoped routes use Portuguese nouns matching URL — `jogador/`, `time/`, `admin/`
- Lib subdirectories named by concern — `auth/`, `plan/`

## Where to Add New Code

**New Page/Route:**
1. Create component in `Projeto/apps/web/app/routes/` (in the appropriate role folder if role-specific)
2. Register in `Projeto/apps/web/app/routes.ts` — add `route()` or `index()` call, nested inside the correct layout
3. Add nav item in `Projeto/apps/web/app/lib/auth/permissions.ts` if it should appear in sidebar
4. Add MSW handler in `Projeto/apps/web/mocks/handlers/<domain>.ts` and fixture data in `mocks/fixtures/<domain>.ts`

**New API Domain:**
1. Add types to `Projeto/apps/web/shared/contracts/<domain>.ts` and re-export from `shared/contracts/index.ts`
2. Add typed API object to `Projeto/apps/web/app/lib/api-client.ts`
3. Add MSW handler file at `Projeto/apps/web/mocks/handlers/<domain>.ts` and register in `mocks/handlers/index.ts`
4. Add fixture file at `Projeto/apps/web/mocks/fixtures/<domain>.ts` and register in `mocks/fixtures/index.ts`

**New UI Component (primitive):**
- Implementation: `Projeto/apps/web/app/components/ui/<component-name>.tsx`
- Follow shadcn/ui pattern: export named component(s), use `cn()` from `~/lib/utils`

**New App-Level Component:**
- Implementation: `Projeto/apps/web/app/components/<component-name>.tsx`

**Utilities:**
- Shared helpers: `Projeto/apps/web/app/lib/utils.ts`
- Domain-specific helpers: `Projeto/apps/web/app/lib/<domain>/`

**New Permission/Feature Gate:**
- Add pure function to `Projeto/apps/web/app/lib/auth/permissions.ts`
- Re-export from `Projeto/apps/web/app/lib/auth/auth-context.tsx` if needed as a hook

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents (ARCHITECTURE.md, STACK.md, etc.)
- Generated: No (written by map-codebase)
- Committed: Yes

**`public/`:**
- Purpose: Static assets served as-is; includes `mockServiceWorker.js` (MSW)
- Generated: `mockServiceWorker.js` is generated by MSW CLI (`npx msw init`)
- Committed: Yes (MSW worker must be in public)

**`mocks/`:**
- Purpose: Dev-only mock API layer; not included in production builds
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-23*
