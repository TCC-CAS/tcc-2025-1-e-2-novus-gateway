# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**
- No test runner configured. No `jest.config.*`, `vitest.config.*`, or equivalent found.
- No test scripts in `Projeto/apps/web/package.json` (`scripts` only contains `build`, `dev`, `start`, `typecheck`).

**Assertion Library:**
- Not applicable — no automated test suite present.

**Run Commands:**
```bash
# No test commands available in package.json
npm run typecheck   # Type checking only: react-router typegen && tsc
```

## Mock Infrastructure (MSW)

Although no automated tests exist, the project has a complete **MSW (Mock Service Worker) v2** infrastructure used for development-time API mocking.

**MSW Version:** `^2.12.10` (devDependency)

**Configuration:**
- Worker file: `Projeto/apps/web/public/` (MSW service worker installed here)
- `package.json` MSW config: `{ "workerDirectory": ["public"] }`

**Bootstrap:**
- `Projeto/apps/web/app/lib/mock-bootstrap.tsx` — `MockBootstrap` component conditionally starts the worker
- Activated when `VITE_USE_MOCK=true` OR when running in dev mode and `VITE_USE_MOCK` is not explicitly `false`
- Worker started with `onUnhandledRequest: "bypass"` — unmatched requests pass through to the real network

```typescript
// app/lib/mock-bootstrap.tsx
const useMock =
  typeof window !== "undefined" &&
  (import.meta.env.VITE_USE_MOCK === "true" ||
    (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== "false"));

worker.start({ onUnhandledRequest: "bypass", quiet: true })
```

## Mock Structure

```
Projeto/apps/web/mocks/
├── browser.ts                # MSW worker setup: setupWorker(...handlers)
├── handlers/
│   ├── index.ts              # Barrel: spreads all domain handler arrays
│   ├── auth.ts               # POST /api/auth/login, /signup, /forgot-password
│   ├── players.ts            # Player CRUD endpoints
│   ├── teams.ts              # Team CRUD endpoints
│   ├── search.ts             # GET /api/search/players and /teams
│   ├── messaging.ts          # Conversation and message endpoints
│   ├── admin.ts              # Admin user management endpoints
│   └── subscription.ts      # Subscription usage and upgrade endpoints
└── fixtures/
    ├── index.ts              # Barrel for all fixture exports
    ├── auth.ts               # mockUsers, mockTokens, mockCredentials
    ├── players.ts            # mockPlayerProfiles, mockPlayerSummaries
    ├── teams.ts              # mockTeamSummaries
    ├── messaging.ts          # Conversation/message fixture data
    ├── moderation.ts         # Report fixture data
    ├── subscription.ts       # Subscription/usage fixture data
    └── users.ts              # User fixture data
```

## Handler Pattern

Each domain has its own handler file exporting a `*Handlers` array. All handlers are assembled in `mocks/handlers/index.ts`.

```typescript
// mocks/handlers/auth.ts
import { http, HttpResponse } from "msw";
import { mockUsers, mockTokens, mockCredentials } from "../fixtures/auth";

const API = "/api";

export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const cred = mockCredentials.find(
      (c) => c.email === body.email && c.password === body.password
    );
    if (!cred) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." } },
        { status: 401 }
      );
    }
    return HttpResponse.json({ user, token: token ?? "mock-token" });
  }),
];
```

```typescript
// mocks/handlers/index.ts
import { authHandlers } from "./auth";
// ... other imports
export const handlers = [
  ...authHandlers,
  ...playersHandlers,
  ...teamsHandlers,
  // etc.
];
```

## Fixture Pattern

Fixtures are typed static arrays exported from domain files. Types are imported from `~shared/contracts`.

```typescript
// mocks/fixtures/players.ts
import type { PlayerProfile, PlayerSummary } from "~shared/contracts";

export const mockPlayerProfiles: PlayerProfile[] = [
  {
    id: "player-1",
    userId: "user-player-1",
    name: "João Silva",
    // ... full typed object
  },
];

// Derived summaries mapped from full profiles
export const mockPlayerSummaries: PlayerSummary[] = mockPlayerProfiles.map((p) => ({
  id: p.id,
  name: p.name,
  // ... subset fields
}));
```

**Key fixture conventions:**
- IDs follow pattern: `"{domain}-{number}"` (e.g., `"player-1"`, `"user-player-1"`)
- Dates use ISO 8601 strings (e.g., `"2024-01-01T00:00:00Z"`)
- Optional fields (`photoUrl`) set to `undefined` explicitly
- Derived fixtures (summaries) are `.map()` transformations of full profile arrays
- Fixture data is in Portuguese (matching the app's locale)

## Direct Fixture Usage in Routes

Some route files import mock fixtures directly (bypassing MSW), used for static placeholder data during development:

```typescript
// app/routes/jogador/index.tsx
import { mockTeamSummaries } from "../../../mocks/fixtures/teams";
const suggested = mockTeamSummaries.slice(0, 4);
```

This pattern uses relative imports from inside `app/routes/` to `mocks/fixtures/` — a development shortcut that bypasses the API client.

## MSW Error Response Convention

Error responses follow the same shape as `ApiErrorBody` in `app/lib/api-client.ts`:

```typescript
return HttpResponse.json(
  { error: { code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." } },
  { status: 401 }
);
```

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

**Development Mocking:** MSW v2 browser worker — full HTTP interception for manual/visual testing in browser during development.

## Coverage

**Requirements:** None enforced — no coverage tooling configured.

## Adding New Mock Handlers

To mock a new API domain:

1. Create `mocks/fixtures/{domain}.ts` — export typed fixture arrays using `~shared/contracts` types
2. Create `mocks/handlers/{domain}.ts` — export `{domain}Handlers` array using `http.*` from `msw`
3. Import and spread handler array in `mocks/handlers/index.ts`
4. Use `HttpResponse.json(data)` for success, `HttpResponse.json(errorBody, { status: N })` for errors
5. Error body shape must match: `{ error: { code: string; message: string } }`

---

*Testing analysis: 2026-03-23*
