# Track 1 Phase 1A — Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 8 bugs in search/filter/player-profile by adding missing database columns, backend filters, and frontend fields.

**Architecture:** Add `region`, `city`, `level` columns to the `players` table via Drizzle migration. Update shared Zod contracts so frontend and backend agree on the same shapes. Add SQL filters for `position` and `region` in the search route. Update onboarding and profile edit forms to collect the new fields.

**Tech Stack:** Drizzle ORM (PostgreSQL), Zod, Fastify, React 19, React Router 7, TanStack Query

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/src/db/schema/players.ts` | Modify | Add `region`, `city`, `level` columns |
| `apps/api/src/db/schema/index.ts` | Modify (no change needed — already exports `players`) | — |
| `apps/api/src/db/migrations/` | Create | Auto-generate migration via Drizzle Kit |
| `shared/contracts/players.ts` | Modify | Add `region`, `city`, `level` to all player schemas |
| `shared/contracts/search.ts` | Modify | Add `level` filter to `SearchPlayersQuerySchema` |
| `apps/api/src/routes/search.ts` | Modify | Add `position`, `region`, `level` filters |
| `apps/web/app/routes/onboarding.tsx` | Modify | Add level/region/city fields to player flow |
| `apps/web/app/routes/jogador/perfil-editar.tsx` | Modify | Add level/region/city editable fields |
| `apps/web/app/routes/time/buscar-jogadores.tsx` | Modify | Replace hardcoded region text, add level filter |
| `apps/web/app/routes/jogador/buscar-times.tsx` | Modify | Pre-filter by player positions, highlight matching |
| `apps/api/tests/routes/search.test.ts` | Modify | Add test cases for position/region/level filters |
| `apps/api/tests/schema.test.ts` | Modify | Assert new columns exist |

---

## Task 1: Add `region`, `city`, `level` columns to players Drizzle schema

**Files:**
- Modify: `apps/api/src/db/schema/players.ts`

- [ ] **Step 1: Add the three new columns to the players table definition**

Current `apps/api/src/db/schema/players.ts` has columns ending at `hidden`. Add three new text columns after `hidden`:

```typescript
import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core"
import { users } from "./users.js"

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  positions: text("positions").array().notNull().default([]),
  bio: text("bio"),
  skills: text("skills").array().notNull().default([]),
  height: integer("height"),
  weight: integer("weight"),
  birthDate: text("birth_date"),
  phone: text("phone"),
  availability: text("availability"),
  hidden: boolean("hidden").notNull().default(false),
  region: text("region"),
  city: text("city"),
  level: text("level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Generate the migration**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx drizzle-kit generate`
Expected: New migration file created in `src/db/migrations/` containing `ALTER TABLE players ADD COLUMN region text; ALTER TABLE players ADD COLUMN city text; ALTER TABLE players ADD COLUMN level text;`

- [ ] **Step 3: Apply the migration to the running dev database**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto && docker compose exec postgres psql -U varzeapro -d varzeapro -c "ALTER TABLE players ADD COLUMN IF NOT EXISTS region text; ALTER TABLE players ADD COLUMN IF NOT EXISTS city text; ALTER TABLE players ADD COLUMN IF NOT EXISTS level text;"`
Expected: `ALTER TABLE` x3 with no errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/schema/players.ts apps/api/src/db/migrations/
git commit -m "feat: add region, city, level columns to players table"
```

---

## Task 2: Update shared player contracts

**Files:**
- Modify: `shared/contracts/players.ts`
- Modify: `shared/contracts/search.ts`

- [ ] **Step 1: Add `region`, `city`, `level` to PlayerProfileSchema, PlayerSummarySchema, and UpsertPlayerProfileRequestSchema**

In `shared/contracts/players.ts`, add after the `availability` field in each schema:

```typescript
import { z } from "zod";
import { OptionalBrazilianPhoneSchema } from "./common.js";

/** Position / role on the field */
export const POSITIONS = [
  "goleiro",
  "lateral",
  "zagueiro",
  "volante",
  "meia",
  "atacante",
] as const;
export const PositionSchema = z.enum(POSITIONS);
export type Position = z.infer<typeof PositionSchema>;

/** Player level / competitiveness — mirrors team levels */
export const PLAYER_LEVELS = [
  "amador",
  "recreativo",
  "semi-profissional",
  "outro",
] as const;
export const PlayerLevelSchema = z.enum(PLAYER_LEVELS);
export type PlayerLevel = z.infer<typeof PlayerLevelSchema>;

/** Player profile (full) */
export const PlayerProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  photoUrl: z.string().url().optional(),
  positions: z.array(PositionSchema),
  bio: z.string().optional(),
  skills: z.array(z.string()),
  height: z.number().optional(), // cm
  weight: z.number().optional(), // kg
  birthDate: z.string().optional(), // ISO date
  phone: OptionalBrazilianPhoneSchema,
  availability: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  level: PlayerLevelSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

/** Player summary (cards, search results) */
export const PlayerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  photoUrl: z.string().url().optional(),
  positions: z.array(PositionSchema),
  skills: z.array(z.string()),
  availability: z.string().optional(),
  region: z.string().optional(),
  level: PlayerLevelSchema.optional(),
});
export type PlayerSummary = z.infer<typeof PlayerSummarySchema>;

/** Create/update player profile request */
export const UpsertPlayerProfileRequestSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  photoUrl: z.string().url().optional().or(z.literal("")),
  positions: z.array(PositionSchema),
  bio: z.string().optional(),
  skills: z.array(z.string()),
  height: z.preprocess((v) => (v === "" || v === null || (typeof v === "number" && isNaN(v)) ? undefined : v), z.number().int().min(100).max(250).optional()),
  weight: z.preprocess((v) => (v === "" || v === null || (typeof v === "number" && isNaN(v)) ? undefined : v), z.number().int().min(30).max(200).optional()),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  availability: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  level: PlayerLevelSchema.optional(),
});
export type UpsertPlayerProfileRequest = z.infer<
  typeof UpsertPlayerProfileRequestSchema
>;
```

- [ ] **Step 2: Add `level` filter to SearchPlayersQuerySchema**

In `shared/contracts/search.ts`, add `level` to the player search query. The import for `PlayerLevelSchema` must be added:

```typescript
import { z } from "zod";
import { PaginationQuerySchema, PaginationMetaSchema } from "./common.js";
import { PlayerSummarySchema } from "./players.js";
import { TeamSummarySchema } from "./teams.js";
import { PositionSchema } from "./players.js";
import { PlayerLevelSchema } from "./players.js";
import { TeamLevelSchema } from "./teams.js";

/** Search players query (teams use this) */
export const SearchPlayersQuerySchema = PaginationQuerySchema.extend({
  position: PositionSchema.optional(),
  skills: z.string().optional(), // comma-separated or single
  region: z.string().optional(),
  availability: z.string().optional(),
  level: PlayerLevelSchema.optional(),
  minAge: z.coerce.number().int().optional(),
  maxAge: z.coerce.number().int().optional(),
});
export type SearchPlayersQuery = z.infer<typeof SearchPlayersQuerySchema>;

/** Search players response */
export const SearchPlayersResponseSchema = z.object({
  data: z.array(PlayerSummarySchema),
  meta: PaginationMetaSchema,
});
export type SearchPlayersResponse = z.infer<typeof SearchPlayersResponseSchema>;

/** Search teams query (players use this) */
export const SearchTeamsQuerySchema = PaginationQuerySchema.extend({
  level: TeamLevelSchema.optional(),
  region: z.string().optional(),
  openPosition: z.string().optional(),
});
export type SearchTeamsQuery = z.infer<typeof SearchTeamsQuerySchema>;

/** Search teams response */
export const SearchTeamsResponseSchema = z.object({
  data: z.array(TeamSummarySchema),
  meta: PaginationMetaSchema,
});
export type SearchTeamsResponse = z.infer<typeof SearchTeamsResponseSchema>;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add shared/contracts/players.ts shared/contracts/search.ts shared/contracts/index.ts
git commit -m "feat: add region, city, level to player contracts and search query"
```

---

## Task 3: Add position, region, and level filters to the search route

**Files:**
- Modify: `apps/api/src/routes/search.ts`

- [ ] **Step 1: Update the GET /players handler to include position, region, and level filters**

Replace the destructuring line (line 24) and add three new filter blocks. The full updated handler:

```typescript
    async (request, reply) => {
      const userId = request.session!.user.id
      const role = request.session!.user.role
      const { page = 1, pageSize = 10, position, skills, region, availability, level, minAge, maxAge } = request.query as z.infer<typeof SearchPlayersQuerySchema>

      // Plan limit resolution
      const sub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      })
      const planId = sub?.planId ?? "free"
      const limits = getPlanLimits(planId, role as "player" | "team")
      const effectivePageSize = Math.min(
        Math.min(pageSize ?? 10, 50), // D-07: hard cap 50
        limits.searchResults           // D-11: plan cap (free team = 10)
      )

      const filters: ReturnType<typeof sql>[] = []

      // D-10: self-exclusion
      filters.push(ne(players.userId, userId) as unknown as ReturnType<typeof sql>)

      // Exclude hidden profiles (removed by moderation)
      filters.push(sql`${players.hidden} = false` as unknown as ReturnType<typeof sql>)

      // Position filter: array containment — player positions must include the requested position
      if (position) {
        filters.push(
          sql`${players.positions} @> ARRAY[${position}]::text[]` as unknown as ReturnType<typeof sql>
        )
      }

      // Skills filter (D-03, OR/ANY logic): comma-separated
      if (skills) {
        const skillArray = skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        if (skillArray.length > 0) {
          filters.push(sql`${players.skills} && ARRAY[${sql.join(skillArray.map((s: string) => sql`${s}`), sql`, `)}]::text[]` as unknown as ReturnType<typeof sql>)
        }
      }

      // Region filter: case-insensitive partial match
      if (region) {
        filters.push(ilike(players.region, `%${region}%`) as unknown as ReturnType<typeof sql>)
      }

      // Availability filter (D-04): case-insensitive exact match
      if (availability) {
        filters.push(ilike(players.availability, availability) as unknown as ReturnType<typeof sql>)
      }

      // Level filter: exact match
      if (level) {
        filters.push(eq(players.level, level) as unknown as ReturnType<typeof sql>)
      }

      // Age filters (D-05): birthDate is stored as text, cast to date
      if (minAge !== undefined) {
        filters.push(
          sql`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${players.birthDate}::date)) >= ${minAge}` as unknown as ReturnType<typeof sql>
        )
      }
      if (maxAge !== undefined) {
        filters.push(
          sql`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${players.birthDate}::date)) <= ${maxAge}` as unknown as ReturnType<typeof sql>
        )
      }

      const whereClause = filters.length > 0 ? and(...(filters as Parameters<typeof and>)) : undefined

      const [{ value: total }] = await fastify.db
        .select({ value: count() })
        .from(players)
        .where(whereClause)

      const rows = await fastify.db
        .select()
        .from(players)
        .where(whereClause)
        .orderBy(desc(players.updatedAt))
        .limit(effectivePageSize)
        .offset((page - 1) * effectivePageSize)

      const data = rows.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))

      return list(data, page, effectivePageSize, total)
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/search.ts
git commit -m "fix: add position, region, level filters to player search route (BUG-01, BUG-02, BUG-03)"
```

---

## Task 4: Add failing tests for position, region, and level filters

**Files:**
- Modify: `apps/api/tests/routes/search.test.ts`

- [ ] **Step 1: Add test cases for the new filters**

Add these tests inside the `describe("GET /api/search/players (SRCH-01)")` block, after the existing tests:

```typescript
    it("SRCH-01g: filters results by position when position=goleiro", async () => {
      // Create a player with goleiro position
      const goleiro = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, goleiro.sessionCookie, {
        name: "Goleiro Test",
        positions: ["goleiro"],
      })

      // Create a player with atacante position
      const atacante = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, atacante.sessionCookie, {
        name: "Atacante Test",
        positions: ["atacante"],
      })

      // Search with position=goleiro
      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { position: "goleiro" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      // All returned players must have goleiro in their positions
      for (const player of body.data) {
        expect(player.positions).toContain("goleiro")
      }
    })

    it("SRCH-01h: filters results by region when region is set on player", async () => {
      const player = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, player.sessionCookie, {
        name: "Player Region Test",
        region: "Zona Sul",
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { region: "Zona Sul" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it("SRCH-01i: filters results by level when level=amador", async () => {
      const player = await signUpAndGetCookie(app, "player")
      await upsertPlayerProfile(app, player.sessionCookie, {
        name: "Amador Player",
        level: "amador",
      })

      const res = await app.inject({
        method: "GET",
        url: "/api/search/players",
        headers: { cookie: teamCookie },
        query: { level: "amador" },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(Array.isArray(body.data)).toBe(true)
      for (const player of body.data) {
        expect(player.level).toBe("amador")
      }
    })
```

- [ ] **Step 2: Run the tests**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx vitest run tests/routes/search.test.ts`
Expected: All tests pass (the schema and route changes from Tasks 1-3 make these pass)

- [ ] **Step 3: Update schema tests to assert new columns exist**

In `apps/api/tests/schema.test.ts`, inside the `describe("Schema: players")` block, add assertions for the three new columns. Find the existing test `it("has expected columns", ...)` and add these three expects after the `availability` assertion:

```typescript
    expect(cols).toContain("region")
    expect(cols).toContain("city")
    expect(cols).toContain("level")
```

- [ ] **Step 4: Run schema tests**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx vitest run tests/schema.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/tests/routes/search.test.ts apps/api/tests/schema.test.ts
git commit -m "test: add tests for position, region, level filters and new player columns"
```

---

## Task 5: Update onboarding to collect level, region, city

**Files:**
- Modify: `apps/web/app/routes/onboarding.tsx`

- [ ] **Step 1: Add state variables for player level, region, city**

After the existing `const [playerPhone, setPlayerPhone] = useState("")` line (around line 63), add:

```typescript
  const [playerLevel, setPlayerLevel] = useState<string>("")
  const [playerRegion, setPlayerRegion] = useState("")
  const [playerCity, setPlayerCity] = useState("")
```

- [ ] **Step 2: Add level selection to player step 1 (positions + skills)**

In the player step 1 section (`{isPlayer && step === 1 && (`), after the positions grid and before the "SOBRE VOCÉ" label, add a level selector:

```tsx
                <div className="space-y-4 pt-4">
                  <Label className="font-display text-2xl tracking-wide">
                    NÍVEL DE COMPETIÇÃO
                  </Label>
                  <Select value={playerLevel || "none"} onValueChange={(v) => setPlayerLevel(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg uppercase font-bold tracking-widest focus:ring-0 focus:border-primary transition-colors">
                      <SelectValue placeholder="SELECIONE SEU NÍVEL" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-foreground">
                      <SelectItem value="none" className="font-bold tracking-widest uppercase text-xs">NENHUM</SelectItem>
                      {PLAYER_LEVELS.map((l) => (
                        <SelectItem key={l} value={l} className="font-bold tracking-widest uppercase hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground cursor-pointer rounded-none">
                          {l.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
```

Add the import for `PLAYER_LEVELS` alongside the existing imports at the top of the file:

```typescript
import { POSITIONS, PLAYER_LEVELS } from "~shared/contracts";
```

- [ ] **Step 3: Add region and city inputs to player step 2 (physical data)**

In the player step 2 section (`{isPlayer && step === 2 && (`), after the WhatsApp input group and before the closing `</div>` of the step, add:

```tsx
                <div className="grid gap-6 sm:grid-cols-2 pt-6">
                  <div className="space-y-4">
                    <Label
                      htmlFor="onb-region"
                      className="font-display text-2xl tracking-wide"
                    >
                      REGIÃO / BAIRRO
                    </Label>
                    <Input
                      id="onb-region"
                      placeholder="Ex.: Zona Sul"
                      value={playerRegion}
                      onChange={(e) => setPlayerRegion(e.target.value)}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label
                      htmlFor="onb-city"
                      className="font-display text-2xl tracking-wide"
                    >
                      CIDADE
                    </Label>
                    <Input
                      id="onb-city"
                      placeholder="Ex.: São Paulo"
                      value={playerCity}
                      onChange={(e) => setPlayerCity(e.target.value)}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                    />
                  </div>
                </div>
```

- [ ] **Step 4: Include new fields in the `handleFinish` payload**

In the `handleFinish` function, update the `playersApi.upsert` call to include the new fields:

```typescript
        await playersApi.upsert({
          name: user!.name,
          positions: playerPositions as Position[],
          bio: playerBio || undefined,
          skills: playerSkills,
          height: playerHeight ? Number(playerHeight) : undefined,
          weight: playerWeight ? Number(playerWeight) : undefined,
          phone: playerPhone || undefined,
          availability: playerAvailability.length > 0 ? playerAvailability.join(", ") : undefined,
          region: playerRegion || undefined,
          city: playerCity || undefined,
          level: (playerLevel || undefined) as Position | undefined,
        });
```

Note: `level` should be typed as `PlayerLevel | undefined`. Fix the cast:

```typescript
          level: (playerLevel || undefined) as import("~shared/contracts").PlayerLevel | undefined,
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/routes/onboarding.tsx
git commit -m "feat: add level, region, city fields to player onboarding (BUG-03, BUG-07)"
```

---

## Task 6: Update player profile edit page

**Files:**
- Modify: `apps/web/app/routes/jogador/perfil-editar.tsx`

- [ ] **Step 1: Read the current file to understand its structure**

Run: `cat -n apps/web/app/routes/jogador/perfil-editar.tsx`

Then add state variables and form fields for `region`, `city`, and `level` following the same pattern as existing fields. Add a `Select` for level (using `PLAYER_LEVELS`), and `Input` fields for region and city. Include them in the upsert payload sent to `playersApi.upsert()`.

The exact fields to add follow the same brutalist UI pattern (border-2, rounded-none, font-display) used throughout the file.

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/routes/jogador/perfil-editar.tsx
git commit -m "feat: add level, region, city fields to player profile edit (BUG-03)"
```

---

## Task 7: Fix hardcoded "SEM REGIÃO DEFINIDA" in player search results

**Files:**
- Modify: `apps/web/app/routes/time/buscar-jogadores.tsx`

- [ ] **Step 1: Replace hardcoded region text with actual data**

In `apps/web/app/routes/time/buscar-jogadores.tsx`, find the hardcoded region section (around lines 130-136):

```tsx
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
                        SEM REGIÃO DEFINIDA
                      </span>
                    </div>
```

Replace with:

```tsx
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
                        {player.region || "REGIÃO NÃO INFORMADA"}
                      </span>
                    </div>
```

- [ ] **Step 2: Add level filter to the search bar**

Add a level `Select` to the filter bar (alongside position and skills filters). Use `PLAYER_LEVELS` imported from contracts. Add a `level` state variable and include it in the `searchApi.players()` call.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/routes/time/buscar-jogadores.tsx
git commit -m "fix: use real region data in player cards, add level filter (BUG-05, BUG-03)"
```

---

## Task 8: Pre-filter team search by player positions and highlight matched positions

**Files:**
- Modify: `apps/web/app/routes/jogador/buscar-times.tsx`

- [ ] **Step 1: Read the current file**

Run: `cat -n apps/web/app/routes/jogador/buscar-times.tsx`

- [ ] **Step 2: Pre-filter by player positions**

On mount, fetch the current player's profile via `playersApi.getMe()`. If the player has positions set, pre-populate the `openPosition` filter with the first position. Use `useEffect` or compute default state from a query.

```typescript
const { data: myProfile } = useQuery({
  queryKey: ["myPlayerProfile"],
  queryFn: () => playersApi.getMe(),
})

// Pre-filter with player's first position when no filter is set
useEffect(() => {
  if (myProfile?.positions?.length && !openPosition) {
    setOpenPosition(myProfile.positions[0])
  }
}, [myProfile])
```

- [ ] **Step 3: Highlight matching open position badges**

In the team card rendering, when rendering `team.openPositions`, add conditional styling to the badge that matches the current `openPosition` filter:

```tsx
{team.openPositions.map((pos) => (
  <span
    key={pos}
    className={cn(
      "border px-2.5 py-1 font-display text-sm tracking-widest uppercase",
      pos === openPosition
        ? "border-primary bg-primary text-primary-foreground"
        : "border-foreground bg-muted/50 text-foreground"
    )}
  >
    {pos}
  </span>
))}
```

Import `cn` from `~/lib/utils` if not already imported.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/routes/jogador/buscar-times.tsx
git commit -m "fix: pre-filter teams by player positions, highlight matched open positions (BUG-04, BUG-06)"
```

---

## Task 9: Run full test suite and verify

- [ ] **Step 1: Run all API tests**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Verify frontend builds**

Run: `cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/web && npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 3: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "chore: finalize bug fixes, verify all tests pass"
```
