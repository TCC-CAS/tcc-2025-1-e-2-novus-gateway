# F4 — Gestão de Partidas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teams can create, edit, and cancel matches with date, time, address, and result. Matches are visible on the team's public profile and summarized on the team dashboard.

**Architecture:** Entirely new domain — zero existing code. New `matches` table, new `apps/api/src/routes/matches.ts`, new `shared/contracts/matches.ts`, and a `matchesApi` in the frontend API client. Frontend surfaces matches in three places: a "PRÓXIMO JOGO" card on the team dashboard, a match management section in `perfil-editar.tsx`, and a public match history section on `times.$id.tsx`.

**Tech Stack:** Drizzle ORM (new table), Fastify (new route file), Zod (shared contracts), React Query (mutations), React Hook Form (match creation form)

---

## File Map

| Action | File |
|--------|------|
| Create | `apps/api/src/db/schema/matches.ts` |
| Modify | `apps/api/src/db/schema/index.ts` |
| Generate | `apps/api/src/db/migrations/<new>.sql` |
| Create | `apps/api/src/routes/matches.ts` |
| Modify | `apps/api/src/app.ts` — register matches routes |
| Create | `apps/web/shared/contracts/matches.ts` |
| Modify | `apps/web/shared/contracts/index.ts` — export matches |
| Modify | `apps/web/app/lib/api-client.ts` — add matchesApi |
| Modify | `apps/web/app/routes/time/index.tsx` — add "PRÓXIMO JOGO" card |
| Modify | `apps/web/app/routes/time/perfil-editar.tsx` — add match management section |
| Modify | `apps/web/app/routes/times.$id.tsx` — add match history section |
| Create | `apps/api/tests/routes/matches.test.ts` |

---

### Task 1: Create matches schema

**Files:**
- Create: `apps/api/src/db/schema/matches.ts`
- Modify: `apps/api/src/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

Create `apps/api/src/db/schema/matches.ts`:

```typescript
import { pgTable, text, date, time, timestamp, index } from "drizzle-orm/pg-core"
import { teams } from "./teams.js"

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    opponentName: text("opponent_name"),
    matchDate: date("match_date").notNull(),
    matchTime: time("match_time"),
    address: text("address"),
    venueName: text("venue_name"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    result: text("result"),
    status: text("status").notNull().default("scheduled"),
    // status: 'scheduled' | 'completed' | 'cancelled'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("matches_team_id_idx").on(t.teamId),
    index("matches_match_date_idx").on(t.matchDate),
  ]
)
```

- [ ] **Step 2: Export from schema index**

In `apps/api/src/db/schema/index.ts`, add:

```typescript
export * from "./matches.js"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/db/schema/matches.ts apps/api/src/db/schema/index.ts
git commit -m "feat(db): add matches schema"
```

---

### Task 2: Generate and verify the migration

- [ ] **Step 1: Run drizzle-kit generate**

```bash
cd apps/api && npx drizzle-kit generate
```

- [ ] **Step 2: Verify the generated SQL**

```bash
cat apps/api/src/db/migrations/$(ls apps/api/src/db/migrations/ | grep -v meta | sort | tail -1)
```

Expected SQL (core shape):

```sql
CREATE TABLE "matches" (
  "id" text PRIMARY KEY NOT NULL,
  "team_id" text NOT NULL,
  "opponent_name" text,
  "match_date" date NOT NULL,
  "match_time" time,
  "address" text,
  "venue_name" text,
  "neighborhood" text,
  "city" text,
  "result" text,
  "status" text DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "matches_team_id_idx" ON "matches" ("team_id");
CREATE INDEX "matches_match_date_idx" ON "matches" ("match_date");
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE cascade;
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/db/migrations/
git commit -m "feat(db): migration — create matches table"
```

---

### Task 3: Create shared contracts for matches

**Files:**
- Create: `apps/web/shared/contracts/matches.ts`
- Modify: `apps/web/shared/contracts/index.ts`

- [ ] **Step 1: Create matches.ts**

Create `apps/web/shared/contracts/matches.ts`:

```typescript
import { z } from "zod"

export const MatchStatusSchema = z.enum(["scheduled", "completed", "cancelled"])
export type MatchStatus = z.infer<typeof MatchStatusSchema>

export const CreateMatchRequestSchema = z.object({
  opponentName: z.string().min(1).optional(),
  matchDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD"),
  matchTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora deve estar no formato HH:MM")
    .optional(),
  address: z.string().optional(),
  venueName: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
})

export const UpdateMatchRequestSchema = CreateMatchRequestSchema.partial().extend({
  result: z.string().optional(),
  status: MatchStatusSchema.optional(),
})

export const MatchSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  opponentName: z.string().nullable(),
  matchDate: z.string(),
  matchTime: z.string().nullable(),
  address: z.string().nullable(),
  venueName: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string().nullable(),
  result: z.string().nullable(),
  status: MatchStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Match = z.infer<typeof MatchSchema>
export type CreateMatchRequest = z.infer<typeof CreateMatchRequestSchema>
export type UpdateMatchRequest = z.infer<typeof UpdateMatchRequestSchema>
```

- [ ] **Step 2: Export from contracts index**

In `apps/web/shared/contracts/index.ts`, add:

```typescript
export * from "./matches.js"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/shared/contracts/matches.ts apps/web/shared/contracts/index.ts
git commit -m "feat(contracts): add Match schemas and types"
```

---

### Task 4: Create the matches API route file

**Files:**
- Create: `apps/api/src/routes/matches.ts`

- [ ] **Step 1: Create the file**

Create `apps/api/src/routes/matches.ts`:

```typescript
import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq, and, desc, count } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { matches, teams } from "../db/schema/index.js"
import {
  CreateMatchRequestSchema,
  UpdateMatchRequestSchema,
} from "../../../../shared/contracts/matches.js"

function serializeMatch(m: typeof matches.$inferSelect) {
  return {
    id: m.id,
    teamId: m.teamId,
    opponentName: m.opponentName,
    matchDate: m.matchDate,
    matchTime: m.matchTime,
    address: m.address,
    venueName: m.venueName,
    neighborhood: m.neighborhood,
    city: m.city,
    result: m.result,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

const matchesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /teams/:id/matches — public, paginated, filterable by status
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/teams/:id/matches",
    {},
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status, page = "1", pageSize = "10" } = request.query as {
        status?: string
        page?: string
        pageSize?: string
      }

      const pageNum = Math.max(1, parseInt(page, 10))
      const size = Math.min(50, Math.max(1, parseInt(pageSize, 10)))
      const offset = (pageNum - 1) * size

      const conditions = [eq(matches.teamId, id)]
      if (status) {
        conditions.push(eq(matches.status, status))
      }

      const [rows, [countRow]] = await Promise.all([
        fastify.db
          .select()
          .from(matches)
          .where(and(...conditions))
          .orderBy(desc(matches.matchDate))
          .limit(size)
          .offset(offset),
        fastify.db
          .select({ total: count() })
          .from(matches)
          .where(and(...conditions)),
      ])

      const total = Number(countRow?.total ?? 0)
      return reply.send({
        data: rows.map(serializeMatch),
        meta: { page: pageNum, pageSize: size, total, totalPages: Math.ceil(total / size) },
      })
    }
  )

  // POST /teams/me/matches — create a match
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/teams/me/matches",
    {
      preHandler: [requireRole("team")],
      schema: { body: CreateMatchRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const body = request.body

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const now = new Date()
      const [inserted] = await fastify.db
        .insert(matches)
        .values({
          id: nanoid(),
          teamId: team.id,
          opponentName: body.opponentName,
          matchDate: body.matchDate,
          matchTime: body.matchTime,
          address: body.address,
          venueName: body.venueName,
          neighborhood: body.neighborhood,
          city: body.city,
          status: "scheduled",
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      return reply.status(201).send(ok(serializeMatch(inserted)))
    }
  )

  // PUT /teams/me/matches/:matchId — update a match (only owner's matches)
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/teams/me/matches/:matchId",
    {
      preHandler: [requireRole("team")],
      schema: { body: UpdateMatchRequestSchema },
    },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { matchId } = request.params as { matchId: string }
      const body = request.body

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const existing = await fastify.db.query.matches.findFirst({
        where: and(eq(matches.id, matchId), eq(matches.teamId, team.id)),
      })
      if (!existing) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Partida não encontrada" } })
      }

      const [updated] = await fastify.db
        .update(matches)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(matches.id, matchId))
        .returning()

      return ok(serializeMatch(updated))
    }
  )

  // DELETE /teams/me/matches/:matchId — soft-cancel (sets status='cancelled')
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    "/teams/me/matches/:matchId",
    { preHandler: [requireRole("team")] },
    async (request, reply) => {
      const userId = request.session!.user.id
      const { matchId } = request.params as { matchId: string }

      const team = await fastify.db.query.teams.findFirst({
        where: eq(teams.userId, userId),
        columns: { id: true },
      })
      if (!team) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Perfil de time não encontrado" } })
      }

      const existing = await fastify.db.query.matches.findFirst({
        where: and(eq(matches.id, matchId), eq(matches.teamId, team.id)),
      })
      if (!existing) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Partida não encontrada" } })
      }

      await fastify.db
        .update(matches)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(matches.id, matchId))

      return reply.status(204).send()
    }
  )
}

export default matchesRoutes
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/matches.ts
git commit -m "feat(api): add matches routes (CRUD for team match management)"
```

---

### Task 5: Register matches routes in app.ts

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Add matches route registration**

In `apps/api/src/app.ts`, the matches routes use two URL prefixes: `/api/teams` (for the GET list) and `/api/teams` (for the team-scoped mutations). Since all routes are prefixed with `/api`, register with `/api` prefix:

```typescript
  await fastify.register(import("./routes/matches.js"), { prefix: "/api" })
```

Add this after the existing route registrations (after the `admin.js` line).

Note: The routes inside `matches.ts` use full paths like `/teams/:id/matches` and `/teams/me/matches/:matchId` so the prefix is just `/api`.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat(api): register matches routes"
```

---

### Task 6: Add matchesApi to the frontend API client

**Files:**
- Modify: `apps/web/app/lib/api-client.ts`

- [ ] **Step 1: Add matchesApi at the end of api-client.ts**

```typescript
// --- Matches ---
export const matchesApi = {
  getTeamMatches: (
    teamId: string,
    params?: { status?: string; page?: number; pageSize?: number }
  ) =>
    request<{
      data: import("~shared/contracts").Match[]
      meta: { page: number; pageSize: number; total: number; totalPages: number }
    }>(`/teams/${teamId}/matches`, {
      params: params as Record<string, string | number | undefined>,
    }),
  createMatch: (data: import("~shared/contracts").CreateMatchRequest) =>
    request<import("~shared/contracts").Match>("/teams/me/matches", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMatch: (
    matchId: string,
    data: import("~shared/contracts").UpdateMatchRequest
  ) =>
    request<import("~shared/contracts").Match>(`/teams/me/matches/${matchId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteMatch: (matchId: string) =>
    request<void>(`/teams/me/matches/${matchId}`, { method: "DELETE" }),
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/lib/api-client.ts
git commit -m "feat(web): add matchesApi to api-client"
```

---

### Task 7: Add "PRÓXIMO JOGO" card to the team dashboard

**Files:**
- Modify: `apps/web/app/routes/time/index.tsx`

- [ ] **Step 1: Read the current team dashboard to understand its structure**

```bash
cat apps/web/app/routes/time/index.tsx
```

- [ ] **Step 2: Add next-match query and card**

Import `matchesApi` and `useQuery`. Add query inside the component:

```typescript
  const { data: matchesData } = useQuery({
    queryKey: ["team", "me", "matches", "upcoming"],
    queryFn: async () => {
      const me = await teamsApi.getMe()
      return matchesApi.getTeamMatches(me.id, { status: "scheduled", pageSize: 1 })
    },
  })

  const nextMatch = matchesData?.data[0]
```

Add the card to the JSX (find a logical place — after stats or near the top):

```tsx
{/* Próximo jogo */}
<div className="border-2 border-foreground p-4">
  <h2 className="font-black uppercase text-sm mb-3">PRÓXIMO JOGO</h2>
  {nextMatch ? (
    <div className="flex flex-col gap-1">
      <p className="font-bold text-base">
        {nextMatch.opponentName ? `vs ${nextMatch.opponentName}` : "Adversário a confirmar"}
      </p>
      <p className="text-sm text-muted-foreground">
        {new Date(nextMatch.matchDate + "T00:00:00").toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
        {nextMatch.matchTime && ` às ${nextMatch.matchTime}`}
      </p>
      {(nextMatch.venueName || nextMatch.neighborhood) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" />
          {[nextMatch.venueName, nextMatch.neighborhood].filter(Boolean).join(" — ")}
        </p>
      )}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">Nenhum jogo agendado</p>
  )}
</div>
```

Import `MapPin` from lucide-react and `matchesApi` from `~/lib/api-client` if not present.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/time/index.tsx
git commit -m "feat(web): add PRÓXIMO JOGO card to team dashboard"
```

---

### Task 8: Add match management section to time/perfil-editar.tsx

**Files:**
- Modify: `apps/web/app/routes/time/perfil-editar.tsx`

- [ ] **Step 1: Add matches state and queries to the component**

Inside `TimePerfilEditar`, add after existing queries and state:

```typescript
  const [showMatchForm, setShowMatchForm] = useState(false)

  const { data: myProfile } = useQuery({
    queryKey: ["team", "me"],
    queryFn: () => teamsApi.getMe(),
  })

  const { data: matchesData, refetch: refetchMatches } = useQuery({
    queryKey: ["team", "me", "matches"],
    queryFn: () => myProfile ? matchesApi.getTeamMatches(myProfile.id, { pageSize: 20 }) : null,
    enabled: !!myProfile,
  })

  const matchForm = useForm<import("~shared/contracts").CreateMatchRequest>({
    resolver: zodResolver(
      (await import("~shared/contracts")).CreateMatchRequestSchema
    ),
    defaultValues: {
      matchDate: "",
      opponentName: "",
      matchTime: "",
      venueName: "",
      neighborhood: "",
      city: "",
    },
  })
```

Note: Because `CreateMatchRequestSchema` is in a separate contracts file, import it at the top:

```typescript
import {
  CreateMatchRequestSchema,
  type CreateMatchRequest,
} from "~shared/contracts"
import { matchesApi } from "~/lib/api-client"
```

- [ ] **Step 2: Add match form submission and cancel mutation**

```typescript
  const createMatchMutation = useMutation({
    mutationFn: (data: CreateMatchRequest) => matchesApi.createMatch(data),
    onSuccess: () => {
      refetchMatches()
      setShowMatchForm(false)
      matchForm.reset()
      toast.success("Partida criada!")
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar partida")
    },
  })

  const cancelMatchMutation = useMutation({
    mutationFn: (matchId: string) => matchesApi.deleteMatch(matchId),
    onSuccess: () => {
      refetchMatches()
      toast.success("Partida cancelada")
    },
  })
```

- [ ] **Step 3: Add the JOGOS section to the JSX**

At the bottom of the page (after the roster section or form submit button), add:

```tsx
{/* Gestão de Partidas */}
<div className="border-2 border-foreground p-4 mt-6">
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-black uppercase text-lg">JOGOS</h2>
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => setShowMatchForm((v) => !v)}
    >
      {showMatchForm ? "CANCELAR" : "+ NOVO JOGO"}
    </Button>
  </div>

  {showMatchForm && (
    <form
      onSubmit={matchForm.handleSubmit((data) => createMatchMutation.mutate(data))}
      className="border border-foreground p-4 mb-4 flex flex-col gap-3"
    >
      <h3 className="font-bold uppercase text-sm">NOVO JOGO</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="matchDate">DATA *</Label>
          <Input
            id="matchDate"
            type="date"
            {...matchForm.register("matchDate")}
          />
          {matchForm.formState.errors.matchDate && (
            <p className="text-xs text-red-500">{matchForm.formState.errors.matchDate.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="matchTime">HORÁRIO</Label>
          <Input id="matchTime" type="time" {...matchForm.register("matchTime")} />
        </div>
      </div>
      <div>
        <Label htmlFor="opponentName">ADVERSÁRIO</Label>
        <Input id="opponentName" placeholder="Nome do time adversário" {...matchForm.register("opponentName")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="venueName">LOCAL / CAMPO</Label>
          <Input id="venueName" placeholder="Ex: Campo do Zezão" {...matchForm.register("venueName")} />
        </div>
        <div>
          <Label htmlFor="neighborhood">BAIRRO</Label>
          <Input id="neighborhood" {...matchForm.register("neighborhood")} />
        </div>
      </div>
      <Button type="submit" disabled={createMatchMutation.isPending} className="self-start">
        {createMatchMutation.isPending ? "SALVANDO..." : "SALVAR JOGO"}
      </Button>
    </form>
  )}

  {/* Match list */}
  {matchesData && matchesData.data.length === 0 && !showMatchForm && (
    <p className="text-sm text-muted-foreground">Nenhum jogo cadastrado ainda.</p>
  )}
  {matchesData && matchesData.data.length > 0 && (
    <div className="flex flex-col gap-2">
      {matchesData.data.map((match) => (
        <div key={match.id} className="flex items-start justify-between border border-foreground/30 p-3 text-sm">
          <div>
            <p className="font-bold">
              {match.opponentName ? `vs ${match.opponentName}` : "Adversário a confirmar"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(match.matchDate + "T00:00:00").toLocaleDateString("pt-BR")}
              {match.matchTime && ` às ${match.matchTime}`}
              {match.neighborhood && ` — ${match.neighborhood}`}
            </p>
            {match.status === "cancelled" && (
              <span className="text-xs text-red-500 font-bold">CANCELADO</span>
            )}
            {match.status === "completed" && match.result && (
              <span className="text-xs font-bold">{match.result}</span>
            )}
          </div>
          {match.status === "scheduled" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => cancelMatchMutation.mutate(match.id)}
              disabled={cancelMatchMutation.isPending}
            >
              CANCELAR
            </Button>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/routes/time/perfil-editar.tsx
git commit -m "feat(web): add match management section to team profile edit"
```

---

### Task 9: Add match history to times.$id.tsx (public view)

**Files:**
- Modify: `apps/web/app/routes/times.$id.tsx`

- [ ] **Step 1: Add matches query to the component**

Import `matchesApi` and add queries inside `TimePublicProfile`:

```typescript
  const { data: upcomingMatches } = useQuery({
    queryKey: ["team", id, "matches", "upcoming"],
    queryFn: () => matchesApi.getTeamMatches(id!, { status: "scheduled", pageSize: 1 }),
    enabled: !!id,
  })

  const { data: recentMatches } = useQuery({
    queryKey: ["team", id, "matches", "completed"],
    queryFn: () => matchesApi.getTeamMatches(id!, { status: "completed", pageSize: 5 }),
    enabled: !!id,
  })
```

- [ ] **Step 2: Add match history section to the JSX**

After the team profile details (and after the ELENCO section if F3b is done), add:

```tsx
{/* Partidas */}
{((upcomingMatches?.data && upcomingMatches.data.length > 0) ||
  (recentMatches?.data && recentMatches.data.length > 0)) && (
  <section className="border-t-2 border-foreground pt-6 mt-6">
    <h2 className="text-lg font-black uppercase mb-4">PARTIDAS</h2>

    {/* Next match */}
    {upcomingMatches?.data[0] && (
      <div className="border-2 border-foreground p-4 mb-4 bg-foreground text-background">
        <p className="text-xs font-bold uppercase opacity-70 mb-1">PRÓXIMO JOGO</p>
        <p className="font-black text-base">
          {upcomingMatches.data[0].opponentName
            ? `vs ${upcomingMatches.data[0].opponentName}`
            : "Adversário a confirmar"}
        </p>
        <p className="text-sm opacity-80">
          {new Date(upcomingMatches.data[0].matchDate + "T00:00:00").toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {upcomingMatches.data[0].matchTime && ` às ${upcomingMatches.data[0].matchTime}`}
        </p>
        {(upcomingMatches.data[0].venueName || upcomingMatches.data[0].neighborhood) && (
          <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
            <MapPin className="size-3" />
            {[upcomingMatches.data[0].venueName, upcomingMatches.data[0].neighborhood].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>
    )}

    {/* Recent results */}
    {recentMatches?.data && recentMatches.data.length > 0 && (
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground mb-2">ÚLTIMAS PARTIDAS</p>
        <div className="flex flex-col gap-2">
          {recentMatches.data.map((match) => (
            <div key={match.id} className="flex items-start justify-between border border-foreground/30 p-3 text-sm">
              <div>
                <p className="font-bold">
                  {match.opponentName ? `vs ${match.opponentName}` : "Adversário"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {match.neighborhood && <><MapPin className="size-3" />{match.neighborhood} — </>}
                  {new Date(match.matchDate + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              {match.result && (
                <span className="font-black text-sm">{match.result}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </section>
)}
```

Add `MapPin` and `matchesApi` to imports.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/times.\$id.tsx
git commit -m "feat(web): add match history section to public team profile"
```

---

### Task 10: Write API tests

**Files:**
- Create: `apps/api/tests/routes/matches.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { createTestApp } from "../helpers/auth-helpers.js"
import { signUpAndGetCookie, upsertTeamProfile, upsertPlayerProfile } from "../helpers/profile-helpers.js"

describe("Matches routes (F4)", () => {
  let app: FastifyInstance
  let teamACookie: string
  let teamBCookie: string
  let teamAId: string
  let createdMatchId: string

  beforeAll(async () => {
    app = await createTestApp()

    const teamA = await signUpAndGetCookie(app, "team")
    teamACookie = teamA.sessionCookie
    await upsertTeamProfile(app, teamACookie)
    const meA = await app.inject({ method: "GET", url: "/api/teams/me", headers: { cookie: teamACookie } })
    teamAId = meA.json().data.id

    const teamB = await signUpAndGetCookie(app, "team")
    teamBCookie = teamB.sessionCookie
    await upsertTeamProfile(app, teamBCookie)
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /api/teams/me/matches", () => {
    it("F4-01: team can create a match", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: teamACookie },
        payload: {
          matchDate: "2026-08-15",
          opponentName: "Flamengo do Bairro",
          matchTime: "09:00",
          neighborhood: "Centro",
          city: "São Paulo",
        },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.data.status).toBe("scheduled")
      createdMatchId = body.data.id
    })

    it("F4-02: rejects invalid matchDate format", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: teamACookie },
        payload: { matchDate: "15/08/2026" },
      })
      expect(res.statusCode).toBeGreaterThanOrEqual(400)
    })

    it("F4-03: unauthenticated request returns 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        payload: { matchDate: "2026-08-15" },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe("GET /api/teams/:id/matches", () => {
    it("F4-04: returns 200 without auth", async () => {
      const res = await app.inject({ method: "GET", url: `/api/teams/${teamAId}/matches` })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta).toHaveProperty("total")
    })

    it("F4-05: status=scheduled filter returns only scheduled matches", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/teams/${teamAId}/matches?status=scheduled`,
      })
      const body = res.json()
      for (const match of body.data) {
        expect(match.status).toBe("scheduled")
      }
    })
  })

  describe("PUT /api/teams/me/matches/:matchId", () => {
    it("F4-06: team can update their match", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/teams/me/matches/${createdMatchId}`,
        headers: { cookie: teamACookie },
        payload: { result: "2-1", status: "completed" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data.status).toBe("completed")
      expect(body.data.result).toBe("2-1")
    })

    it("F4-07: team B cannot update team A's match (404 from their perspective)", async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/teams/me/matches/${createdMatchId}`,
        headers: { cookie: teamBCookie },
        payload: { result: "3-0" },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe("DELETE /api/teams/me/matches/:matchId", () => {
    it("F4-08: team can cancel (soft delete) their match", async () => {
      // Create a fresh match to cancel
      const createRes = await app.inject({
        method: "POST",
        url: "/api/teams/me/matches",
        headers: { cookie: teamACookie },
        payload: { matchDate: "2026-09-01" },
      })
      const toCancel = createRes.json().data.id

      const res = await app.inject({
        method: "DELETE",
        url: `/api/teams/me/matches/${toCancel}`,
        headers: { cookie: teamACookie },
      })
      expect(res.statusCode).toBe(204)

      // Verify status is 'cancelled' not deleted
      const listRes = await app.inject({
        method: "GET",
        url: `/api/teams/${teamAId}/matches`,
      })
      const found = listRes.json().data.find((m: { id: string; status: string }) => m.id === toCancel)
      expect(found?.status).toBe("cancelled")
    })
  })
})
```

- [ ] **Step 2: Run matches tests**

```bash
cd apps/api && npx vitest run tests/routes/matches.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Run full suite**

```bash
cd apps/api && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/routes/matches.test.ts
git commit -m "test(matches): add F4 match management API tests"
```

---

## Self-Review Checklist

- [ ] `matches` table created with correct columns and indexes
- [ ] `GET /api/teams/:id/matches` is public (no auth)
- [ ] `GET /api/teams/:id/matches?status=scheduled` filters correctly
- [ ] `POST /api/teams/me/matches` requires `role=team`, validates `matchDate` format
- [ ] `PUT /api/teams/me/matches/:matchId` only updates matches owned by the requesting team
- [ ] `DELETE /api/teams/me/matches/:matchId` is a soft delete (status → 'cancelled', row stays)
- [ ] Team B gets 404 (not 403) when trying to edit Team A's match (ownership check, not RBAC)
- [ ] `matchesApi` exported from `api-client.ts` with all 4 methods
- [ ] "PRÓXIMO JOGO" card on team dashboard (`time/index.tsx`)
- [ ] Match form in `time/perfil-editar.tsx` with date, time, opponent, venue, neighborhood
- [ ] Match history on `times.$id.tsx` shows upcoming + last 5 completed with neighborhood/bairro
- [ ] `shared/contracts/matches.ts` exported from `shared/contracts/index.ts`
