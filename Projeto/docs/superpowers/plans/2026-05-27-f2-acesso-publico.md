# F2 — Acesso Público (Landing Vitrine + Perfis sem Auth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make team and player profile pages accessible without login, add a real-data showcase section to the landing page, and create a public team listing page.

**Architecture:** Three changes: (1) remove `requireSession` from existing GET /:id endpoints in players.ts and teams.ts; (2) new `public.ts` route file with `/api/public/showcase` and `/api/public/teams`; (3) frontend routing — move `times.$id`, `jogadores.$id`, and new `times` routes outside the `_authenticated-layout` wrapper.

**Tech Stack:** Fastify (routes), Drizzle ORM (queries), React Router v7 (layout/routing), React Query (data fetching), Tailwind CSS

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/api/src/routes/players.ts` — remove requireSession from GET /:id |
| Modify | `apps/api/src/routes/teams.ts` — remove requireSession from GET /:id |
| Create | `apps/api/src/routes/public.ts` — showcase + public teams listing |
| Modify | `apps/api/src/app.ts` — register public routes |
| Modify | `apps/web/app/routes.ts` — move routes outside authenticated layout |
| Modify | `apps/web/app/routes/_index.tsx` — add real showcase data |
| Create | `apps/web/app/routes/times.tsx` — public team listing page |
| Modify | `apps/web/app/routes/times.$id.tsx` — remove hard auth dependency |
| Modify | `apps/web/app/routes/jogadores.$id.tsx` — remove hard auth dependency |
| Modify | `apps/web/app/lib/api-client.ts` — add publicApi |
| Modify or create | `apps/api/tests/routes/public.test.ts` |

---

### Task 1: Remove requireSession from GET /:id endpoints

**Files:**
- Modify: `apps/api/src/routes/players.ts`
- Modify: `apps/api/src/routes/teams.ts`

- [ ] **Step 1: Read current GET /:id handler in players.ts**

```bash
grep -n "requireSession\|preHandler\|GET.*/:id\|getById" apps/api/src/routes/players.ts | head -20
```

- [ ] **Step 2: In `apps/api/src/routes/players.ts`, find the GET `/:id` route and remove `preHandler: [requireSession]`**

The current handler looks like:

```typescript
fastify.withTypeProvider<ZodTypeProvider>().get(
  "/:id",
  { preHandler: [requireSession] },
  async (request, reply) => { ... }
)
```

Change to:

```typescript
fastify.withTypeProvider<ZodTypeProvider>().get(
  "/:id",
  {},
  async (request, reply) => { ... }
)
```

The handler body is unchanged — keep all the profile data logic.

- [ ] **Step 3: Do the same for `apps/api/src/routes/teams.ts` GET `/:id`**

```typescript
// Before
fastify.withTypeProvider<ZodTypeProvider>().get(
  "/:id",
  { preHandler: [requireSession] },
  async (request, reply) => { ... }
)

// After
fastify.withTypeProvider<ZodTypeProvider>().get(
  "/:id",
  {},
  async (request, reply) => { ... }
)
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/players.ts apps/api/src/routes/teams.ts
git commit -m "feat(api): make GET /players/:id and GET /teams/:id public (no auth required)"
```

---

### Task 2: Create public routes file

**Files:**
- Create: `apps/api/src/routes/public.ts`

- [ ] **Step 1: Write the public routes file**

Create `apps/api/src/routes/public.ts`:

```typescript
import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { desc, eq } from "drizzle-orm"
import { ok } from "../lib/response.js"
import { teams, players, users } from "../db/schema/index.js"

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /showcase — 6 recent teams + 6 recent players for landing page vitrine
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/showcase",
    {},
    async (_request, reply) => {
      const [recentTeams, recentPlayers] = await Promise.all([
        fastify.db
          .select({
            id: teams.id,
            name: teams.name,
            logoUrl: teams.logoUrl,
            level: teams.level,
            region: teams.region,
            city: teams.city,
          })
          .from(teams)
          .where(eq(teams.hidden, false))
          .orderBy(desc(teams.createdAt))
          .limit(6),
        fastify.db
          .select({
            id: players.id,
            name: players.name,
            photoUrl: players.photoUrl,
            positions: players.positions,
            level: players.level,
            region: players.region,
            city: players.city,
          })
          .from(players)
          .where(eq(players.hidden, false))
          .orderBy(desc(players.createdAt))
          .limit(6),
      ])

      return ok({ teams: recentTeams, players: recentPlayers })
    }
  )

  // GET /teams — paginated public team listing
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams",
    {},
    async (request, reply) => {
      const { page = "1", pageSize = "12", region } = request.query as {
        page?: string
        pageSize?: string
        region?: string
      }
      const pageNum = Math.max(1, parseInt(page, 10))
      const size = Math.min(50, Math.max(1, parseInt(pageSize, 10)))
      const offset = (pageNum - 1) * size

      const conditions = [eq(teams.hidden, false)]
      if (region) {
        const { ilike } = await import("drizzle-orm")
        conditions.push(ilike(teams.region, `%${region}%`))
      }

      const { and, count, sql } = await import("drizzle-orm")

      const [rows, [countRow]] = await Promise.all([
        fastify.db
          .select({
            id: teams.id,
            name: teams.name,
            logoUrl: teams.logoUrl,
            level: teams.level,
            region: teams.region,
            city: teams.city,
            openPositions: teams.openPositions,
          })
          .from(teams)
          .where(and(...conditions))
          .orderBy(desc(teams.createdAt))
          .limit(size)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(teams)
          .where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows,
        meta: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      })
    }
  )
}

export default publicRoutes
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/public.ts
git commit -m "feat(api): add GET /api/public/showcase and GET /api/public/teams"
```

---

### Task 3: Register public routes in app.ts

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Add public routes registration after search routes**

In `apps/api/src/app.ts`, add after the existing route registrations:

```typescript
  await fastify.register(import("./routes/public.js"), { prefix: "/api/public" })
```

Place it after `search.js` registration (line ~52).

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat(api): register public routes at /api/public"
```

---

### Task 4: Add publicApi to the frontend API client

**Files:**
- Modify: `apps/web/app/lib/api-client.ts`

- [ ] **Step 1: Add the publicApi object at the end of api-client.ts**

```typescript
// --- Public (no auth) ---
export type ShowcasePlayer = {
  id: string
  name: string
  photoUrl: string | null
  positions: string[]
  level: string | null
  region: string | null
  city: string | null
}
export type ShowcaseTeam = {
  id: string
  name: string
  logoUrl: string | null
  level: string
  region: string | null
  city: string | null
}
export type ShowcaseResponse = { teams: ShowcaseTeam[]; players: ShowcasePlayer[] }
export type PublicTeam = ShowcaseTeam & { openPositions: string[] }

export const publicApi = {
  showcase: () =>
    request<ShowcaseResponse>("/public/showcase"),
  teams: (params?: { page?: number; pageSize?: number; region?: string }) =>
    request<import("~shared/contracts").ApiListResponse<PublicTeam>>(
      "/public/teams",
      { params: params as Record<string, string | number | undefined> }
    ),
}
```

Note: `ApiListResponse` is already exported from api-client.ts as `ApiListResponse<T>`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/lib/api-client.ts
git commit -m "feat(web): add publicApi for showcase and public team listing"
```

---

### Task 5: Move profile routes outside authenticated layout

**Files:**
- Modify: `apps/web/app/routes.ts`

- [ ] **Step 1: Read the current routes.ts**

```bash
cat apps/web/app/routes.ts
```

- [ ] **Step 2: Move `jogadores/:id`, `times/:id` outside the `layout()` and add `times` route**

In `apps/web/app/routes.ts`, the current layout block has `jogadores/:id` and `times/:id` inside `layout("routes/_authenticated-layout.tsx", [...])`. Move them outside and add the new `times` route:

```typescript
import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes"

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("cadastro", "routes/cadastro.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("recuperar-senha", "routes/recuperar-senha.tsx"),
  route("planos", "routes/planos.tsx"),
  route("pagamento-sucesso", "routes/pagamento-sucesso.tsx"),
  // Public profile routes — accessible without login
  route("jogadores/:id", "routes/jogadores.$id.tsx"),
  route("times/:id", "routes/times.$id.tsx"),
  route("times", "routes/times.tsx"),
  layout("routes/_authenticated-layout.tsx", [
    route("jogador", "routes/jogador/_player-layout.tsx", [
      index("routes/jogador/index.tsx"),
      route("perfil", "routes/jogador/perfil.tsx"),
      route("perfil/editar", "routes/jogador/perfil-editar.tsx"),
      route("buscar-times", "routes/jogador/buscar-times.tsx"),
      route("mensagens", "routes/jogador/mensagens.tsx"),
    ]),
    route("time", "routes/time/_team-layout.tsx", [
      index("routes/time/index.tsx"),
      route("perfil", "routes/time/perfil.tsx"),
      route("perfil/editar", "routes/time/perfil-editar.tsx"),
      route("buscar-jogadores", "routes/time/buscar-jogadores.tsx"),
      route("mensagens", "routes/time/mensagens.tsx"),
    ]),
    route("admin", "routes/admin/_admin-layout.tsx", [
      index("routes/admin/index.tsx"),
      route("usuarios", "routes/admin/usuarios.tsx"),
      route("usuarios/:id", "routes/admin/usuarios.$id.tsx"),
      route("moderation", "routes/admin/moderation.tsx"),
    ]),
    route("configuracoes", "routes/configuracoes.tsx"),
  ]),
] satisfies RouteConfig
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes.ts
git commit -m "feat(web): move jogadores/:id and times/:id outside auth layout, add /times route"
```

---

### Task 6: Update times.$id.tsx and jogadores.$id.tsx — guard contact CTA

**Files:**
- Modify: `apps/web/app/routes/times.$id.tsx`
- Modify: `apps/web/app/routes/jogadores.$id.tsx`

- [ ] **Step 1: In `times.$id.tsx`, make the contact/message button conditional on auth**

The file already uses `useAuth()` and checks `canContact`. Moving out of the authenticated layout means `useAuth()` may return null user. Verify the existing guard:

```typescript
const { user, role } = useAuth()
const canContact = canSearchTeams(role)
```

`canSearchTeams(null)` should return false (verify in `~/lib/auth/permissions.ts`). If it does, the contact button is already hidden for non-authenticated users. No code changes needed if the guard works.

If `canSearchTeams(null)` would throw or return true, add a null check:

```typescript
const canContact = !!user && canSearchTeams(role)
```

- [ ] **Step 2: Do the same check and fix for `jogadores.$id.tsx`**

```typescript
const canContact = !!user && canSearchPlayers(role)
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/times.\$id.tsx apps/web/app/routes/jogadores.\$id.tsx
git commit -m "fix(web): guard contact CTA for unauthenticated users on public profile pages"
```

---

### Task 7: Create the public team listing page

**Files:**
- Create: `apps/web/app/routes/times.tsx`

- [ ] **Step 1: Create the page**

Create `apps/web/app/routes/times.tsx`:

```typescript
import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { OptimizedImage } from "~/components/optimized-image"
import { MapPin, Shield, ArrowRight, Search as SearchIcon } from "lucide-react"

export function meta() {
  return [{ title: "Times - VárzeaPro" }]
}

export default function TimesPublicos() {
  const [region, setRegion] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["public", "teams", { page, region: regionFilter }],
    queryFn: () => publicApi.teams({ page, pageSize: 12, region: regionFilter || undefined }),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setRegionFilter(region)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b-4 border-foreground bg-foreground text-background py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black uppercase tracking-tight">TIMES</h1>
          <p className="text-sm mt-1 opacity-80">Encontre times para jogar na sua região</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <Input
            placeholder="Filtrar por região..."
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline" size="icon">
            <SearchIcon className="size-4" />
          </Button>
        </form>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted border-2 border-foreground animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((team) => (
                <div key={team.id} className="border-2 border-foreground p-4 flex gap-3 items-start">
                  <div className="size-12 border-2 border-foreground overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                    {team.logoUrl ? (
                      <OptimizedImage src={team.logoUrl} alt={team.name} className="size-full object-cover" />
                    ) : (
                      <Shield className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase text-sm truncate">{team.name}</p>
                    {(team.region || team.city) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3" />
                        {[team.city, team.region].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <Link to={`/times/${team.id}`}>
                      <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1">
                        VER PERFIL <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ANTERIOR
                </Button>
                <span className="text-sm self-center">
                  {page} / {data.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  PRÓXIMA
                </Button>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-8 border-2 border-foreground p-6 text-center">
          <p className="font-black uppercase text-lg">CADASTRE SEU TIME</p>
          <p className="text-sm text-muted-foreground mt-1">Junte-se a centenas de times na plataforma</p>
          <Link to="/cadastro">
            <Button className="mt-4">CRIAR CONTA</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/routes/times.tsx
git commit -m "feat(web): add public team listing page at /times"
```

---

### Task 8: Update the landing page (_index.tsx) with real showcase data

**Files:**
- Modify: `apps/web/app/routes/_index.tsx`

- [ ] **Step 1: Read the current landing page to understand its structure**

```bash
wc -l apps/web/app/routes/_index.tsx
```

Then read the first ~60 lines to find where static numbers and existing sections are:

```bash
head -60 apps/web/app/routes/_index.tsx
```

- [ ] **Step 2: Add showcase query at the top of the component function**

Import `publicApi` and `useQuery` at the top of the file (if not already imported):

```typescript
import { useQuery } from "@tanstack/react-query"
import { publicApi, type ShowcaseTeam, type ShowcasePlayer } from "~/lib/api-client"
import { OptimizedImage } from "~/components/optimized-image"
import { Link } from "react-router"
```

Inside the component function, add:

```typescript
  const { data: showcase } = useQuery({
    queryKey: ["public", "showcase"],
    queryFn: () => publicApi.showcase(),
  })
```

- [ ] **Step 3: Add the "TIMES EM DESTAQUE" section**

Find the section with static numbers (like "2.5K jogadores") and add after it (or near the hero section) a new showcase section:

```tsx
{/* Times em destaque */}
{showcase?.teams && showcase.teams.length > 0 && (
  <section className="py-12 px-4 border-t-4 border-foreground">
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black uppercase">TIMES EM DESTAQUE</h2>
        <Link to="/times" className="text-sm font-bold uppercase underline">
          VER TODOS →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {showcase.teams.map((team) => (
          <Link key={team.id} to={`/times/${team.id}`} className="border-2 border-foreground p-3 flex flex-col items-center gap-2 hover:bg-accent transition-colors">
            <div className="size-12 border border-foreground bg-muted flex items-center justify-center overflow-hidden">
              {team.logoUrl ? (
                <OptimizedImage src={team.logoUrl} alt={team.name} className="size-full object-cover" />
              ) : (
                <Shield className="size-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs font-black uppercase text-center leading-tight line-clamp-2">{team.name}</p>
          </Link>
        ))}
      </div>
    </div>
  </section>
)}

{/* Jogadores em destaque */}
{showcase?.players && showcase.players.length > 0 && (
  <section className="py-12 px-4 border-t-4 border-foreground">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-black uppercase mb-6">JOGADORES EM DESTAQUE</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {showcase.players.map((player) => (
          <Link key={player.id} to={`/jogadores/${player.id}`} className="border-2 border-foreground p-3 flex flex-col items-center gap-2 hover:bg-accent transition-colors">
            <div className="size-12 rounded-full border-2 border-foreground bg-muted flex items-center justify-center overflow-hidden">
              {player.photoUrl ? (
                <OptimizedImage src={player.photoUrl} alt={player.name} className="size-full object-cover" />
              ) : (
                <User className="size-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs font-black uppercase text-center leading-tight line-clamp-2">{player.name}</p>
          </Link>
        ))}
      </div>
    </div>
  </section>
)}
```

Add `Shield` and `User` to lucide-react imports if not already present.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/routes/_index.tsx
git commit -m "feat(web): add real showcase data (teams + players) to landing page"
```

---

### Task 9: Write API tests

**Files:**
- Create: `apps/api/tests/routes/public.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import { signUpAndGetCookie, upsertTeamProfile, upsertPlayerProfile } from "../helpers/profile-helpers.js"

describe("Public routes (F2)", () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createTestApp()
    // Create some visible profiles for showcase queries
    const team = await signUpAndGetCookie(app, "team")
    await upsertTeamProfile(app, team.sessionCookie)
    const player = await signUpAndGetCookie(app, "player")
    await upsertPlayerProfile(app, player.sessionCookie)
  })

  afterAll(async () => {
    await app.close()
  })

  describe("GET /api/public/showcase (F2-01)", () => {
    it("F2-01a: returns 200 without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/showcase" })
      expect(res.statusCode).toBe(200)
    })

    it("F2-01b: response has teams and players arrays", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/showcase" })
      const body = res.json()
      expect(body.data).toHaveProperty("teams")
      expect(body.data).toHaveProperty("players")
      expect(Array.isArray(body.data.teams)).toBe(true)
      expect(Array.isArray(body.data.players)).toBe(true)
    })

    it("F2-01c: does not expose userId in showcase response", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/showcase" })
      const body = res.json()
      for (const item of [...body.data.teams, ...body.data.players]) {
        expect(item).not.toHaveProperty("userId")
      }
    })
  })

  describe("GET /api/public/teams (F2-02)", () => {
    it("F2-02a: returns 200 without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/teams" })
      expect(res.statusCode).toBe(200)
    })

    it("F2-02b: returns paginated structure", async () => {
      const res = await app.inject({ method: "GET", url: "/api/public/teams?page=1&pageSize=6" })
      const body = res.json()
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("meta")
      expect(body.meta).toHaveProperty("total")
      expect(body.meta.pageSize).toBe(6)
    })
  })

  describe("GET /api/teams/:id — now public (F2-03)", () => {
    it("F2-03a: returns 200 without auth token", async () => {
      // Get a team id first
      const listRes = await app.inject({ method: "GET", url: "/api/public/teams" })
      const teamId = listRes.json().data[0]?.id
      if (!teamId) return // skip if no teams in DB

      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamId}`,
        // No cookie/auth header
      })
      expect(res.statusCode).toBe(200)
    })
  })

  describe("GET /api/players/:id — now public (F2-04)", () => {
    it("F2-04a: returns 200 without auth token", async () => {
      // Get a player id via showcase
      const showcaseRes = await app.inject({ method: "GET", url: "/api/public/showcase" })
      const playerId = showcaseRes.json().data.players[0]?.id
      if (!playerId) return // skip if no players in DB

      const res = await app.inject({
        method: "GET",
        url: `/api/players/${playerId}`,
        // No cookie/auth header
      })
      expect(res.statusCode).toBe(200)
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd apps/api && npx vitest run tests/routes/public.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Run full suite for regressions**

```bash
cd apps/api && npx vitest run
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/routes/public.test.ts
git commit -m "test(api): add F2 public routes tests"
```

---

## Self-Review Checklist

- [ ] `GET /api/players/:id` returns 200 without auth
- [ ] `GET /api/teams/:id` returns 200 without auth
- [ ] `GET /api/public/showcase` returns 6 teams + 6 players, no `userId` in response
- [ ] `GET /api/public/teams` is paginated and filterable by region
- [ ] `/times/:id` and `/jogadores/:id` render without redirect to login
- [ ] `/times` renders without auth — shows team cards with "VER PERFIL" links
- [ ] Contact/message CTA is hidden on profile pages for unauthenticated visitors
- [ ] Landing page shows real team and player cards from showcase API
- [ ] No static numbers remain unreplaced (verify "2.5K jogadores" text)
