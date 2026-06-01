# F3b — Elenco Visível no Perfil do Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teams declare their roster by adding player IDs. The roster is visible publicly on the team's profile page. Teams manage their roster (add/remove) from the profile edit page.

**Architecture:** New `team_members` table (team_id + player_id, unique pair). Three new API routes: public GET for viewing, authenticated POST/DELETE for team management. Frontend: roster section in `times.$id.tsx` (public view) and a management UI in `time/perfil-editar.tsx` using the existing `searchApi.communityPlayers` to find players.

**Tech Stack:** Drizzle ORM (new table + migration), Fastify (new routes in teams.ts), React Query (mutations + queries), existing UI components

---

## File Map

| Action | File |
|--------|------|
| Create | `apps/api/src/db/schema/team-members.ts` |
| Modify | `apps/api/src/db/schema/index.ts` — export new table |
| Generate | `apps/api/src/db/migrations/<new>.sql` |
| Modify | `apps/api/src/routes/teams.ts` — add roster routes |
| Modify | `apps/web/app/lib/api-client.ts` — add teamsApi roster methods |
| Modify | `apps/web/app/routes/times.$id.tsx` — add roster section |
| Modify | `apps/web/app/routes/time/perfil-editar.tsx` — add roster management |
| Create | `apps/api/tests/routes/roster.test.ts` |

---

### Task 1: Create team_members schema

**Files:**
- Create: `apps/api/src/db/schema/team-members.ts`
- Modify: `apps/api/src/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

Create `apps/api/src/db/schema/team-members.ts`:

```typescript
import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core"
import { teams } from "./teams.js"
import { players } from "./players.js"

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.teamId, t.playerId)]
)
```

- [ ] **Step 2: Export from schema index**

In `apps/api/src/db/schema/index.ts`, add:

```typescript
export * from "./team-members.js"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/db/schema/team-members.ts apps/api/src/db/schema/index.ts
git commit -m "feat(db): add team_members schema"
```

---

### Task 2: Generate and verify the migration

**Files:**
- Generate: `apps/api/src/db/migrations/<new_name>.sql`

- [ ] **Step 1: Run drizzle-kit generate**

```bash
cd apps/api && npx drizzle-kit generate
```

- [ ] **Step 2: Verify the generated SQL**

```bash
cat apps/api/src/db/migrations/$(ls apps/api/src/db/migrations/ | grep -v meta | sort | tail -1)
```

Expected SQL:

```sql
CREATE TABLE "team_members" (
  "id" text PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL,
  "player_id" text NOT NULL,
  "added_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "team_members_team_id_player_id_unique" UNIQUE("team_id","player_id")
);
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/db/migrations/
git commit -m "feat(db): migration — create team_members table"
```

---

### Task 3: Add roster routes to teams.ts

**Files:**
- Modify: `apps/api/src/routes/teams.ts`

- [ ] **Step 1: Add the three roster routes at the end of teamsRoutes plugin (before closing `}`)**

In `apps/api/src/routes/teams.ts`, add these imports at the top if not already present:

```typescript
import { nanoid } from "nanoid"
import { eq, and } from "drizzle-orm"
import { teams, players, teamMembers } from "../db/schema/index.js"
```

Then add the three routes:

```typescript
  // GET /:id/roster — public list of players on this team's roster
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id/roster",
    {},
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.id, id),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Time não encontrado" } })
      }

      const members = await fastify.db
        .select({
          id: players.id,
          name: players.name,
          photoUrl: players.photoUrl,
          positions: players.positions,
          region: players.region,
        })
        .from(teamMembers)
        .innerJoin(players, eq(teamMembers.playerId, players.id))
        .where(eq(teamMembers.teamId, id))
        .orderBy(teamMembers.addedAt)

      return ok({ members })
    }
  )

  // POST /me/roster — add a player to the team's roster
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/me/roster",
    {
      preHandler: [requireRole("team")],
      schema: {
        body: z.object({ playerId: z.string().min(1) }),
      },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { playerId } = request.body as { playerId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const player = await fastify.db.query.players.findFirst({
        where: eq(players.id, playerId),
        columns: { id: true },
      })
      if (!player) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Jogador não encontrado" } })
      }

      try {
        await fastify.db.insert(teamMembers).values({
          id: nanoid(),
          teamId: team.id,
          playerId,
        })
      } catch (err: unknown) {
        // Unique constraint violation — player already in roster
        const msg = (err as Error).message ?? ""
        if (msg.includes("unique") || msg.includes("duplicate")) {
          return reply.status(409).send({ error: { code: "CONFLICT", message: "Jogador já está no elenco" } })
        }
        throw err
      }

      return reply.status(201).send(ok({ playerId, teamId: team.id }))
    }
  )

  // DELETE /me/roster/:playerId — remove a player from the team's roster
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/me/roster/:playerId",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { playerId } = request.params as { playerId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      await fastify.db
        .delete(teamMembers)
        .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.playerId, playerId)))

      return reply.status(204).send()
    }
  )
```

- [ ] **Step 2: Ensure `z` is imported in teams.ts**

Check the top of `teams.ts`:

```typescript
import { z } from "zod"
```

If missing, add it.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/teams.ts
git commit -m "feat(api): add roster routes GET /:id/roster, POST /me/roster, DELETE /me/roster/:playerId"
```

---

### Task 4: Add teamsApi roster methods to api-client.ts

**Files:**
- Modify: `apps/web/app/lib/api-client.ts`

- [ ] **Step 1: Add roster types and methods to teamsApi**

Find the `teamsApi` export and extend it:

```typescript
export type RosterMember = {
  id: string
  name: string
  photoUrl: string | null
  positions: string[]
  region: string | null
}

export const teamsApi = {
  getMe: () =>
    request<import("~shared/contracts").TeamProfile>("/teams/me"),
  getById: (id: string) =>
    request<import("~shared/contracts").TeamProfile>(`/teams/${id}`),
  upsert: (body: import("~shared/contracts").UpsertTeamProfileRequest) =>
    request<import("~shared/contracts").TeamProfile>(
      "/teams/me",
      { method: "PUT", body: JSON.stringify(body) }
    ),
  getRoster: (teamId: string) =>
    request<{ members: RosterMember[] }>(`/teams/${teamId}/roster`),
  addToRoster: (playerId: string) =>
    request<{ playerId: string; teamId: string }>(
      "/teams/me/roster",
      { method: "POST", body: JSON.stringify({ playerId }) }
    ),
  removeFromRoster: (playerId: string) =>
    request<void>(
      `/teams/me/roster/${playerId}`,
      { method: "DELETE" }
    ),
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/lib/api-client.ts
git commit -m "feat(web): add roster methods to teamsApi in api-client"
```

---

### Task 5: Add roster section to times.$id.tsx

**Files:**
- Modify: `apps/web/app/routes/times.$id.tsx`

- [ ] **Step 1: Read the current structure of times.$id.tsx**

```bash
grep -n "useQuery\|section\|return\|</div>" apps/web/app/routes/times.\$id.tsx | head -30
```

- [ ] **Step 2: Add roster query inside the component**

Find where `useQuery` calls are grouped near the top of `TimePublicProfile` and add:

```typescript
  const { data: rosterData } = useQuery({
    queryKey: ["team", id, "roster"],
    queryFn: () => teamsApi.getRoster(id!),
    enabled: !!id,
  })
```

- [ ] **Step 3: Add the ELENCO section to the JSX, after the team profile details and before any "CONTATO" section**

```tsx
{/* Elenco */}
{rosterData && rosterData.members.length > 0 && (
  <section className="border-t-2 border-foreground pt-6 mt-6">
    <h2 className="text-lg font-black uppercase mb-4">ELENCO ({rosterData.members.length})</h2>
    <div className="flex flex-wrap gap-3">
      {rosterData.members.map((member) => (
        <Link key={member.id} to={`/jogadores/${member.id}`} className="flex flex-col items-center gap-1 group">
          <div className="size-12 rounded-full border-2 border-foreground overflow-hidden bg-muted flex items-center justify-center">
            {member.photoUrl ? (
              <OptimizedImage
                src={member.photoUrl}
                alt={member.name}
                className="size-full object-cover rounded-full"
              />
            ) : (
              <User className="size-5 text-muted-foreground" />
            )}
          </div>
          <span className="text-xs font-bold uppercase text-center max-w-[64px] truncate group-hover:underline">
            {member.name.split(" ")[0]}
          </span>
        </Link>
      ))}
    </div>
  </section>
)}
```

Add `User` to lucide-react imports if not present. Add `teamsApi` to the api-client import if not present.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/routes/times.\$id.tsx
git commit -m "feat(web): add ELENCO section to team public profile"
```

---

### Task 6: Add roster management to time/perfil-editar.tsx

**Files:**
- Modify: `apps/web/app/routes/time/perfil-editar.tsx`

- [ ] **Step 1: Read the current end of time/perfil-editar.tsx to find where to append**

```bash
tail -30 apps/web/app/routes/time/perfil-editar.tsx
```

- [ ] **Step 2: Add roster state and queries to the component**

Inside `TimePerfilEditar`, add after the existing queries:

```typescript
  const [playerSearch, setPlayerSearch] = useState("")
  const [playerSearchDebounced, setPlayerSearchDebounced] = useState("")

  const { data: roster, refetch: refetchRoster } = useQuery({
    queryKey: ["team", "me", "roster"],
    queryFn: async () => {
      const me = await teamsApi.getMe()
      return teamsApi.getRoster(me.id)
    },
  })

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["search", "community-players", { region: playerSearchDebounced }],
    queryFn: () =>
      import("~/lib/api-client").then(({ searchApi }) =>
        searchApi.communityPlayers({ region: playerSearchDebounced || undefined })
      ),
    enabled: playerSearchDebounced.length >= 2,
  })

  const addMutation = useMutation({
    mutationFn: (playerId: string) => teamsApi.addToRoster(playerId),
    onSuccess: () => {
      refetchRoster()
      toast.success("Jogador adicionado ao elenco")
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Erro ao adicionar jogador"
      toast.error(msg)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (playerId: string) => teamsApi.removeFromRoster(playerId),
    onSuccess: () => {
      refetchRoster()
      toast.success("Jogador removido do elenco")
    },
  })
```

Add `searchApi` and `teamsApi.addToRoster/removeFromRoster` to imports. Add `useMutation` to the `@tanstack/react-query` import.

- [ ] **Step 3: Add a debounce effect for player search**

```typescript
  useEffect(() => {
    const t = setTimeout(() => setPlayerSearchDebounced(playerSearch), 400)
    return () => clearTimeout(t)
  }, [playerSearch])
```

- [ ] **Step 4: Add the GERENCIAR ELENCO section to the JSX**

At the bottom of the form (before the submit button or in a separate card after the main form), add:

```tsx
{/* Gerenciar Elenco */}
<div className="border-2 border-foreground p-4 mt-6">
  <h2 className="font-black uppercase text-lg mb-4">GERENCIAR ELENCO</h2>

  {/* Current roster */}
  {roster && roster.members.length > 0 && (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
        ELENCO ATUAL ({roster.members.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {roster.members.map((member) => (
          <div key={member.id} className="flex items-center gap-1 border border-foreground px-2 py-1 text-xs">
            <span className="font-bold">{member.name}</span>
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-destructive"
              onClick={() => removeMutation.mutate(member.id)}
              aria-label={`Remover ${member.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )}

  {roster && roster.members.length === 0 && (
    <p className="text-sm text-muted-foreground mb-4">Nenhum jogador no elenco ainda.</p>
  )}

  {/* Player search */}
  <div>
    <p className="text-xs font-bold uppercase text-muted-foreground mb-2">ADICIONAR JOGADOR</p>
    <Input
      placeholder="Buscar por nome ou região..."
      value={playerSearch}
      onChange={(e) => setPlayerSearch(e.target.value)}
      className="mb-2"
    />
    {isSearching && <p className="text-xs text-muted-foreground">Buscando...</p>}
    {searchResults && searchResults.data.length > 0 && (
      <div className="border border-foreground max-h-48 overflow-y-auto">
        {searchResults.data.map((player) => {
          const alreadyInRoster = roster?.members.some((m) => m.id === player.id)
          return (
            <div key={player.id} className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-0 border-foreground/20">
              <span className="font-bold">{player.name}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                disabled={alreadyInRoster || addMutation.isPending}
                onClick={() => addMutation.mutate(player.id)}
              >
                {alreadyInRoster ? "JÁ NO ELENCO" : "ADICIONAR"}
              </Button>
            </div>
          )
        })}
      </div>
    )}
    {playerSearchDebounced.length >= 2 && !isSearching && searchResults?.data.length === 0 && (
      <p className="text-xs text-muted-foreground">Nenhum jogador encontrado</p>
    )}
  </div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/routes/time/perfil-editar.tsx
git commit -m "feat(web): add GERENCIAR ELENCO section to team profile edit page"
```

---

### Task 7: Write API tests

**Files:**
- Create: `apps/api/tests/routes/roster.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import { signUpAndGetCookie, upsertTeamProfile, upsertPlayerProfile } from "../helpers/profile-helpers.js"
import { eq } from "drizzle-orm"
import { teams } from "../../src/db/schema/index.js"

describe("Roster routes (F3b)", () => {
  let app: FastifyInstance
  let teamCookie: string
  let teamId: string
  let playerCookie: string
  let playerId: string

  beforeAll(async () => {
    app = await createTestApp()

    const team = await signUpAndGetCookie(app, "team")
    teamCookie = team.sessionCookie
    await upsertTeamProfile(app, teamCookie)
    const teamMe = await app.inject({ method: "GET", url: "/api/teams/me", headers: { cookie: teamCookie } })
    teamId = teamMe.json().data.id

    const player = await signUpAndGetCookie(app, "player")
    playerCookie = player.sessionCookie
    await upsertPlayerProfile(app, playerCookie)
    const playerMe = await app.inject({ method: "GET", url: "/api/players/me", headers: { cookie: playerCookie } })
    playerId = playerMe.json().data.id
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /api/teams/me/roster", () => {
    it("F3b-01: team can add player to roster", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: teamCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(201)
    })

    it("F3b-02: adding same player twice returns 409", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: teamCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(409)
    })

    it("F3b-03: player cannot add to roster (403)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: playerCookie },
        payload: { playerId },
      })
      expect(res.statusCode).toBe(403)
    })

    it("F3b-04: adding non-existent player returns 404", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/roster",
        headers: { cookie: teamCookie },
        payload: { playerId: "does-not-exist" },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe("GET /api/teams/:id/roster", () => {
    it("F3b-05: returns 200 without auth", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamId}/roster`,
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data.members)).toBe(true)
    })

    it("F3b-06: added player appears in roster", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamId}/roster`,
      })
      const body = res.json()
      const found = body.data.members.find((m: { id: string }) => m.id === playerId)
      expect(found).toBeDefined()
    })

    it("F3b-07: roster does not expose player userId", async () => {
      const res = await app.inject({ method: "GET", url: `/api/teams/${teamId}/roster` })
      for (const member of res.json().data.members) {
        expect(member).not.toHaveProperty("userId")
      }
    })
  })

  describe("DELETE /api/teams/me/roster/:playerId", () => {
    it("F3b-08: team can remove player from roster", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/teams/me/roster/${playerId}`,
        headers: { cookie: teamCookie },
      })
      expect(res.statusCode).toBe(204)
    })

    it("F3b-09: after removal, player no longer in roster", async () => {
      const res = await app.inject({ method: "GET", url: `/api/teams/${teamId}/roster` })
      const found = res.json().data.members.find((m: { id: string }) => m.id === playerId)
      expect(found).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: Run roster tests**

```bash
cd apps/api && npx vitest run tests/routes/roster.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Run full suite**

```bash
cd apps/api && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/routes/roster.test.ts
git commit -m "test(roster): add F3b team roster API tests"
```

---

## Self-Review Checklist

- [ ] `team_members` table has `UNIQUE(team_id, player_id)` constraint
- [ ] `team_members` FK to `teams.id` with `ON DELETE CASCADE`
- [ ] `team_members` FK to `players.id` with `ON DELETE CASCADE`
- [ ] `GET /api/teams/:id/roster` returns 200 without auth, no `userId` in members
- [ ] `POST /api/teams/me/roster` requires `role=team`, returns 409 on duplicate
- [ ] `DELETE /api/teams/me/roster/:playerId` requires `role=team`, returns 204
- [ ] Adding player with non-existent ID returns 404
- [ ] Roster section visible on `times.$id.tsx` public page
- [ ] Roster management in `time/perfil-editar.tsx` uses debounced player search
- [ ] Player search in edit page reuses `searchApi.communityPlayers` (no new endpoint needed)
