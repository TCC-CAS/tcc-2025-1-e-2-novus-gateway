# F3a — Jogador Busca Outros Jogadores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow players to search for other players (community discovery), not just teams. Currently `GET /search/players` is locked to `role=team` (it's a recruitment tool). New endpoint `/search/community-players` is available to any authenticated user.

**Architecture:** New Fastify route `GET /api/search/community-players` using `requireSession` (any role) — no plan gating, fixed 20-per-page limit, basic filters (position, region, level), excludes self and hidden profiles. New frontend page at `/jogador/buscar-jogadores` following the exact same pattern as the existing `/jogador/buscar-times`.

**Tech Stack:** Fastify + Drizzle (backend), React Query + Zod (frontend), existing UI components from `buscar-times.tsx`

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/api/src/routes/search.ts` — add GET /community-players |
| Modify | `apps/web/app/lib/api-client.ts` — add searchApi.communityPlayers |
| Create | `apps/web/app/routes/jogador/buscar-jogadores.tsx` |
| Modify | `apps/web/app/routes.ts` — add route inside player layout |
| Modify or create | `apps/api/tests/routes/search.test.ts` — add F3a test cases |

---

### Task 1: Add GET /community-players to search.ts

**Files:**
- Modify: `apps/api/src/routes/search.ts`

- [ ] **Step 1: Read the existing search.ts to understand the pattern**

```bash
cat apps/api/src/routes/search.ts
```

Pay attention to: imports used, how `requireRole` is applied, how filters are built, what Drizzle operators are used.

- [ ] **Step 2: Add the community-players route at the end of the plugin function (before the closing `}`)**

The route uses `requireSession` (not `requireRole`) so any authenticated user can access it. It excludes the requesting user's own player profile and hidden profiles.

Add to `apps/api/src/routes/search.ts`, inside the `searchRoutes` plugin function:

```typescript
  // GET /community-players — any authenticated user, no plan gating, 20/page max
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/community-players",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const { position, region, level, page = "1" } = request.query as {
        position?: string
        region?: string
        level?: string
        page?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const pageSize = 20
      const offset = (pageNum - 1) * pageSize

      const userId = request.session!.user.id

      // Find the player profile of the requesting user (to exclude self)
      const selfPlayer = await fastify.db.query.players.findFirst({
        where: eq(players.userId, userId),
        columns: { id: true },
      })

      const conditions: SQL[] = [eq(players.hidden, false)]

      if (selfPlayer) {
        conditions.push(ne(players.id, selfPlayer.id))
      }
      if (position) {
        conditions.push(arrayContains(players.positions, [position]))
      }
      if (region) {
        conditions.push(ilike(players.region, `%${region}%`))
      }
      if (level) {
        conditions.push(eq(players.level, level))
      }

      const [rows, [countRow]] = await Promise.all([
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
          .where(and(...conditions))
          .orderBy(desc(players.createdAt))
          .limit(pageSize)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(players)
          .where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows,
        meta: {
          page: pageNum,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      })
    }
  )
```

- [ ] **Step 3: Verify the necessary Drizzle imports are present**

Check the top of `search.ts` for these imports. Add any missing ones:

```typescript
import { eq, ilike, and, desc, ne, count, arrayContains } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { players } from "../db/schema/index.js"
```

If `arrayContains` is not used elsewhere in the file, check if `players.positions` is a text array. If so, use:

```typescript
import { sql } from "drizzle-orm"
// ...
conditions.push(sql`${players.positions} @> ARRAY[${position}]::text[]`)
```

instead of `arrayContains`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/search.ts
git commit -m "feat(api): add GET /search/community-players for any authenticated user"
```

---

### Task 2: Add searchApi.communityPlayers to api-client.ts

**Files:**
- Modify: `apps/web/app/lib/api-client.ts`

- [ ] **Step 1: Add communityPlayers to the searchApi object**

Find the `searchApi` export in `apps/web/app/lib/api-client.ts` and add the new method:

```typescript
export const searchApi = {
  players: (params: import("~shared/contracts").SearchPlayersQuery) =>
    request<import("~shared/contracts").SearchPlayersResponse>(
      "/search/players",
      { params: params as Record<string, string | number | undefined> }
    ),
  teams: (params: import("~shared/contracts").SearchTeamsQuery) =>
    request<import("~shared/contracts").SearchTeamsResponse>(
      "/search/teams",
      { params: params as Record<string, string | number | undefined> }
    ),
  // Community search — any authenticated user, basic filters only
  communityPlayers: (params: {
    position?: string
    region?: string
    level?: string
    page?: number
  }) =>
    request<{
      data: Array<{
        id: string
        name: string
        photoUrl: string | null
        positions: string[]
        level: string | null
        region: string | null
        city: string | null
      }>
      meta: { page: number; pageSize: number; total: number; totalPages: number }
    }>(
      "/search/community-players",
      { params: params as Record<string, string | number | undefined> }
    ),
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/lib/api-client.ts
git commit -m "feat(web): add searchApi.communityPlayers to api-client"
```

---

### Task 3: Create the buscar-jogadores page

**Files:**
- Create: `apps/web/app/routes/jogador/buscar-jogadores.tsx`

The page follows the same pattern as `apps/web/app/routes/jogador/buscar-times.tsx`. Read that file first for the exact component structure.

- [ ] **Step 1: Read buscar-times.tsx as reference**

```bash
cat apps/web/app/routes/jogador/buscar-times.tsx
```

- [ ] **Step 2: Create the new page**

Create `apps/web/app/routes/jogador/buscar-jogadores.tsx`:

```typescript
import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { searchApi } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { POSITIONS } from "~shared/contracts"
import { Filter, ArrowRight, Search as SearchIcon, MapPin, User } from "lucide-react"
import { cn } from "~/lib/utils"
import { OptimizedImage } from "~/components/optimized-image"

export function meta() {
  return [{ title: "Buscar jogadores - VárzeaPro" }]
}

const PLAYER_LEVELS = [
  { value: "iniciante", label: "INICIANTE" },
  { value: "amador", label: "AMADOR" },
  { value: "intermediario", label: "INTERMEDIÁRIO" },
  { value: "avancado", label: "AVANÇADO" },
]

const POSITION_LABELS: Record<string, string> = {
  goleiro: "GOLEIRO",
  lateral: "LATERAL",
  zagueiro: "ZAGUEIRO",
  volante: "VOLANTE",
  meia: "MEIA",
  atacante: "ATACANTE",
}

export default function JogadorBuscarJogadores() {
  const [position, setPosition] = useState<string | undefined>(undefined)
  const [region, setRegion] = useState("")
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["community-players", { position, region, level, page }],
    queryFn: () =>
      searchApi.communityPlayers({
        position: position || undefined,
        region: region || undefined,
        level: level || undefined,
        page,
      }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">BUSCAR JOGADORES</h1>
        <p className="text-sm text-muted-foreground mt-1">Encontre jogadores para jogar juntos</p>
      </div>

      {/* Filters */}
      <div className="border-2 border-foreground p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <Filter className="size-4" />
          <span className="text-xs font-bold uppercase">Filtros</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={position ?? "__all__"} onValueChange={(v) => { setPosition(v === "__all__" ? undefined : v); setPage(1) }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="POSIÇÃO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">TODAS POSIÇÕES</SelectItem>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {POSITION_LABELS[pos] ?? pos.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={level ?? "__all__"} onValueChange={(v) => { setLevel(v === "__all__" ? undefined : v); setPage(1) }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="NÍVEL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">TODOS NÍVEIS</SelectItem>
              {PLAYER_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Input
              placeholder="Região..."
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1) }}
              className="h-8 text-xs w-32"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted border-2 border-foreground animate-pulse" />
          ))}
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="border-2 border-foreground p-8 text-center">
          <p className="font-bold uppercase text-muted-foreground">Nenhum jogador encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros</p>
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((player) => (
              <div key={player.id} className="border-2 border-foreground p-4 flex gap-3 items-start">
                <div className="size-12 rounded-full border-2 border-foreground overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                  {player.photoUrl ? (
                    <OptimizedImage src={player.photoUrl} alt={player.name} className="size-full object-cover rounded-full" />
                  ) : (
                    <User className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase text-sm truncate">{player.name}</p>
                  {player.positions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {player.positions.map((p) => POSITION_LABELS[p] ?? p).join(", ")}
                    </p>
                  )}
                  {(player.region || player.city) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" />
                      {[player.city, player.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <Link to={`/jogadores/${player.id}`}>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1">
                      VER PERFIL <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ANTERIOR
              </Button>
              <span className="text-sm self-center">{page} / {data.meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                PRÓXIMA
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/jogador/buscar-jogadores.tsx
git commit -m "feat(web): add /jogador/buscar-jogadores page for community player search"
```

---

### Task 4: Register the route in routes.ts

**Files:**
- Modify: `apps/web/app/routes.ts`

- [ ] **Step 1: Add route inside the player layout block**

In `apps/web/app/routes.ts`, inside the `route("jogador", "routes/jogador/_player-layout.tsx", [...])` array, add:

```typescript
      route("buscar-jogadores", "routes/jogador/buscar-jogadores.tsx"),
```

After `route("buscar-times", ...)`:

```typescript
    route("jogador", "routes/jogador/_player-layout.tsx", [
      index("routes/jogador/index.tsx"),
      route("perfil", "routes/jogador/perfil.tsx"),
      route("perfil/editar", "routes/jogador/perfil-editar.tsx"),
      route("buscar-times", "routes/jogador/buscar-times.tsx"),
      route("buscar-jogadores", "routes/jogador/buscar-jogadores.tsx"),
      route("mensagens", "routes/jogador/mensagens.tsx"),
    ]),
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/routes.ts
git commit -m "feat(web): register /jogador/buscar-jogadores route"
```

---

### Task 5: Write API tests

**Files:**
- Modify: `apps/api/tests/routes/search.test.ts`

- [ ] **Step 1: Add F3a test cases to the search test file**

Open `apps/api/tests/routes/search.test.ts` and add a new describe block:

```typescript
  // F3a: GET /api/search/community-players
  describe("GET /api/search/community-players (F3a)", () => {
    it("F3a-01: returns 200 for authenticated player", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toHaveProperty("total")
    })

    it("F3a-02: returns 200 for authenticated team user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(200)
    })

    it("F3a-03: returns 401 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
      })
      expect(res.statusCode).toBe(401)
    })

    it("F3a-04: does not return own player profile in results", async () => {
      // playerCookie belongs to a player — their own profile should not appear
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players",
        headers: { cookie: playerCookie },
      })
      const body = res.json()
      // If there's only one player in DB, results should be empty (self excluded)
      // All results should have different userId than the requester
      for (const item of body.data) {
        expect(item).not.toHaveProperty("userId")
      }
    })

    it("F3a-05: accepts position filter without error", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/search/community-players?position=goleiro",
        headers: { cookie: playerCookie },
      })
      expect(res.statusCode).toBe(200)
    })
  })
```

- [ ] **Step 2: Run search tests**

```bash
cd apps/api && npx vitest run tests/routes/search.test.ts
```

Expected: all tests including F3a pass.

- [ ] **Step 3: Run full suite**

```bash
cd apps/api && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/routes/search.test.ts
git commit -m "test(search): add F3a community-players search tests"
```

---

## Self-Review Checklist

- [ ] `GET /api/search/community-players` returns 401 without auth
- [ ] `GET /api/search/community-players` returns 200 for both player and team roles
- [ ] Results exclude own player profile (self not shown)
- [ ] Results exclude profiles with `hidden=true`
- [ ] Pagination: max 20 per page, returns `meta.total`
- [ ] Filters: `position`, `region`, `level` all work (unrecognized values return empty, not 400)
- [ ] `/jogador/buscar-jogadores` renders with filter controls and player cards
- [ ] Player cards link to `/jogadores/:id`
- [ ] Route is inside the `_player-layout` (shows the player nav shell)
