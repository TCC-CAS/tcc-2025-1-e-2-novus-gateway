# Plan Restructure + Real Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce team plans to free + profissional, focus player plan differentiation on career/stats visibility, and enforce ALL plan limits at the backend (not just in config).

**Architecture:** Two-key access model — a player's data is published based on their plan (career = craque+, stats = fenomeno), AND teams need `profissional` to read that data. The `GET /players/:id` and `GET /search/players` routes strip fields server-side. Frontend pages already gate via `PlanContext`; backend now guarantees the same.

**Tech Stack:** Fastify + Drizzle ORM + PostgreSQL (pgEnum) | React Router 7 + Tailwind CSS v4 | `shared/contracts/subscription.ts` as single source of truth for plan config

---

## File Map

| File | Change |
|------|--------|
| `shared/contracts/subscription.ts` | Remove `titular`/`campeao`, add `profissional`, reconfigure limits |
| `apps/api/src/db/schema/users.ts` | Add `'profissional'` to `planIdEnum` |
| `apps/api/src/db/migrations/0002_team_plan_profissional.sql` | CREATE: ADD VALUE `'profissional'` to enum |
| `apps/api/src/routes/subscription.ts` | Update `teamPlans` validation arrays (2 places) |
| `apps/api/src/routes/players.ts` | Enforce plan gates on `GET /:id` |
| `apps/api/src/routes/search.ts` | JOIN subscriptions, strip career/stats per row |
| `apps/web/app/routes/planos.tsx` | New icon, updated features list, remove profileViews row, update FAQ |

---

## Task 1: Update Shared Contracts

**Files:**
- Modify: `shared/contracts/subscription.ts`

- [ ] **Step 1: Replace TEAM_PLANS and remove titular/campeao configs**

Replace the entire file content:

```typescript
import { z } from "zod";

export const PLAYER_PLANS = ["free", "craque", "fenomeno"] as const;
export const TEAM_PLANS = ["free", "profissional"] as const;
export const ALL_PLANS = [...PLAYER_PLANS, ...TEAM_PLANS] as const;

export const PlayerPlanSchema = z.enum(PLAYER_PLANS);
export type PlayerPlan = z.infer<typeof PlayerPlanSchema>;

export const TeamPlanSchema = z.enum(TEAM_PLANS);
export type TeamPlan = z.infer<typeof TeamPlanSchema>;

export const PlanIdSchema = z.enum(ALL_PLANS);
export type PlanId = z.infer<typeof PlanIdSchema>;

export const SubscriptionStatusSchema = z.enum([
  "active",
  "canceled",
  "past_due",
  "trialing",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: PlanIdSchema,
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean().default(false),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const UsageSchema = z.object({
  planId: PlanIdSchema,
  status: SubscriptionStatusSchema,
  cancelAtPeriodEnd: z.boolean(),
  conversationsUsed: z.number(),
  conversationsLimit: z.number(),
  searchResultsLimit: z.number(),
  openPositionsUsed: z.number(),
  openPositionsLimit: z.number(),
  favoritesUsed: z.number(),
  favoritesLimit: z.number(),
  periodResetAt: z.string().datetime(),
});
export type Usage = z.infer<typeof UsageSchema>;

export type PlanLimits = {
  conversations: number;
  searchResults: number;
  openPositions: number;
  favorites: number;
  maxGalleryItems: number;
  videoHighlights: boolean;
  expandedProfile: boolean;
  verifiedBadge: boolean;
  profileViews: boolean;
  advancedFilters: boolean;
  featuredListing: boolean;
  analytics: boolean;
  bulkOutreach: boolean;
  smartRecommendations: boolean;
  prioritySupport: boolean;
  // jogador: controla o que pode exibir no perfil
  careerHistoryVisible: boolean;
  detailedStatsVisible: boolean;
  // time: controla o que pode ver nos perfis de jogadores
  playerStatsAccess: boolean;
  playerCareerAccess: boolean;
};

export type PlanConfig = {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  role: "player" | "team";
  limits: PlanLimits;
  popular?: boolean;
};

const UNLIMITED = 999_999;

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "LIVRE",
    description: "Crie seu perfil e entre no jogo",
    price: 0,
    role: "player",
    limits: {
      conversations: 10,
      searchResults: UNLIMITED,
      openPositions: 0,
      favorites: 5,
      maxGalleryItems: 3,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: false,
      profileViews: false,
      advancedFilters: false,
      featuredListing: false,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      prioritySupport: false,
      careerHistoryVisible: false,
      detailedStatsVisible: false,
      playerStatsAccess: false,
      playerCareerAccess: false,
    },
  },
  craque: {
    id: "craque",
    name: "CRAQUE",
    description: "Histórico de clubes, vídeos e destaque nos resultados",
    price: 9.9,
    role: "player",
    popular: true,
    limits: {
      conversations: UNLIMITED,
      searchResults: UNLIMITED,
      openPositions: 0,
      favorites: 50,
      maxGalleryItems: 15,
      videoHighlights: true,
      expandedProfile: true,
      verifiedBadge: true,
      profileViews: true,
      advancedFilters: false,
      featuredListing: false,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      prioritySupport: false,
      careerHistoryVisible: true,
      detailedStatsVisible: false,
      playerStatsAccess: false,
      playerCareerAccess: false,
    },
  },
  fenomeno: {
    id: "fenomeno",
    name: "FENÔMENO",
    description: "Estatísticas completas + currículo visível a times premium",
    price: 19.9,
    role: "player",
    limits: {
      conversations: UNLIMITED,
      searchResults: UNLIMITED,
      openPositions: 0,
      favorites: UNLIMITED,
      maxGalleryItems: 30,
      videoHighlights: true,
      expandedProfile: true,
      verifiedBadge: true,
      profileViews: true,
      advancedFilters: false,
      featuredListing: true,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      prioritySupport: true,
      careerHistoryVisible: true,
      detailedStatsVisible: true,
      playerStatsAccess: false,
      playerCareerAccess: false,
    },
  },

  profissional: {
    id: "profissional",
    name: "PROFISSIONAL",
    description: "Acesse carreira e estatísticas dos jogadores para recrutar com dados",
    price: 49.9,
    role: "team",
    popular: true,
    limits: {
      conversations: UNLIMITED,
      searchResults: UNLIMITED,
      openPositions: UNLIMITED,
      favorites: UNLIMITED,
      maxGalleryItems: 0,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: true,
      profileViews: false,
      advancedFilters: true,
      featuredListing: false,
      analytics: true,
      bulkOutreach: true,
      smartRecommendations: true,
      prioritySupport: true,
      careerHistoryVisible: false,
      detailedStatsVisible: false,
      playerStatsAccess: true,
      playerCareerAccess: true,
    },
  },
};

export function getDefaultLimitsForRole(role: "player" | "team"): PlanLimits {
  if (role === "team") {
    return {
      conversations: 5,
      searchResults: 20,
      openPositions: 1,
      favorites: 5,
      maxGalleryItems: 0,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: false,
      profileViews: false,
      advancedFilters: false,
      featuredListing: false,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      prioritySupport: false,
      careerHistoryVisible: false,
      detailedStatsVisible: false,
      playerStatsAccess: false,
      playerCareerAccess: false,
    };
  }
  return PLAN_CONFIGS.free.limits;
}

export function getPlanLimits(planId: PlanId, role: "player" | "team"): PlanLimits {
  if (planId === "free") return getDefaultLimitsForRole(role);
  return PLAN_CONFIGS[planId].limits;
}

export function getPlansForRole(role: "player" | "team"): PlanConfig[] {
  const freePlan: PlanConfig = {
    ...PLAN_CONFIGS.free,
    role,
    limits: getDefaultLimitsForRole(role),
    name: role === "team" ? "PELADA" : "LIVRE",
    description:
      role === "team"
        ? "Busque jogadores e envie mensagens com limite"
        : "Tudo que você precisa para entrar em campo",
  };

  if (role === "player") {
    return [freePlan, PLAN_CONFIGS.craque, PLAN_CONFIGS.fenomeno];
  }
  return [freePlan, PLAN_CONFIGS.profissional];
}

export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/shared
npx tsc --noEmit 2>&1 || true
```

Expected: no errors (or only "cannot find module" for peer deps, which is fine)

- [ ] **Step 3: Commit**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto
git add shared/contracts/subscription.ts
git commit -m "refactor(plans): replace titular/campeao with profissional, focus player tiers on career/stats"
```

---

## Task 2: DB Migration + Schema Enum

**Files:**
- Create: `apps/api/src/db/migrations/0002_team_plan_profissional.sql`
- Modify: `apps/api/src/db/schema/users.ts`

- [ ] **Step 1: Create migration file**

```sql
ALTER TYPE "public"."plan_id" ADD VALUE IF NOT EXISTS 'profissional';
```

Save to `apps/api/src/db/migrations/0002_team_plan_profissional.sql`.

- [ ] **Step 2: Update Drizzle enum in users schema**

In `apps/api/src/db/schema/users.ts`, change:

```typescript
export const planIdEnum = pgEnum("plan_id", ["free", "craque", "fenomeno", "titular", "campeao"])
```

to:

```typescript
export const planIdEnum = pgEnum("plan_id", ["free", "craque", "fenomeno", "titular", "campeao", "profissional"])
```

> Note: `titular` and `campeao` stay in the Drizzle enum because they exist in the DB and Drizzle needs to know about them. They are blocked at the route validation layer (Task 3). They are NOT shown in the UI.

- [ ] **Step 3: Run migration**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api
npx drizzle-kit migrate 2>&1 || psql $DATABASE_URL -f src/db/migrations/0002_team_plan_profissional.sql
```

If drizzle-kit isn't set up, run directly:

```bash
psql "postgresql://varzeapro:varzeapro_dev@localhost:5432/varzeapro" \
  -f src/db/migrations/0002_team_plan_profissional.sql
```

Expected output: `ALTER TYPE`

- [ ] **Step 4: Verify enum value exists**

```bash
psql "postgresql://varzeapro:varzeapro_dev@localhost:5432/varzeapro" \
  -c "SELECT enum_range(NULL::plan_id);"
```

Expected: `{free,craque,fenomeno,titular,campeao,profissional}`

- [ ] **Step 5: Commit**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto
git add apps/api/src/db/migrations/0002_team_plan_profissional.sql \
        apps/api/src/db/schema/users.ts
git commit -m "feat(db): add profissional to plan_id enum"
```

---

## Task 3: Update Subscription Route Validation

**Files:**
- Modify: `apps/api/src/routes/subscription.ts`

The file has two hardcoded `teamPlans` arrays. Both need updating.

- [ ] **Step 1: Update first teamPlans array (in POST /upgrade)**

Find the block:
```typescript
      const playerPlans = ["free", "craque", "fenomeno"]
      const teamPlans = ["free", "titular", "campeao"]
      if (role === "player" && !playerPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Players can only upgrade to craque or fenomeno" },
        })
      }
      if (role === "team" && !teamPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Teams can only upgrade to titular or campeao" },
        })
      }
```

Replace with:
```typescript
      const playerPlans = ["free", "craque", "fenomeno"]
      const teamPlans = ["free", "profissional"]
      if (role === "player" && !playerPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Jogadores só podem assinar os planos Craque ou Fenômeno" },
        })
      }
      if (role === "team" && !teamPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Times só podem assinar o plano Profissional" },
        })
      }
```

- [ ] **Step 2: Update second teamPlans array (in POST /checkout)**

Find:
```typescript
      const playerPlans = ["free", "craque", "fenomeno"]
      const teamPlans = ["free", "titular", "campeao"]
      if (role === "player" && !playerPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Jogadores só podem assinar os planos Craque ou Fenômeno" },
        })
      }
      if (role === "team" && !teamPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Times só podem assinar os planos Titular ou Campeão" },
        })
      }
```

Replace with:
```typescript
      const playerPlans = ["free", "craque", "fenomeno"]
      const teamPlans = ["free", "profissional"]
      if (role === "player" && !playerPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Jogadores só podem assinar os planos Craque ou Fenômeno" },
        })
      }
      if (role === "team" && !teamPlans.includes(planId)) {
        return reply.status(400).send({
          error: { code: "INVALID_PLAN", message: "Times só podem assinar o plano Profissional" },
        })
      }
```

- [ ] **Step 3: Commit**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto
git add apps/api/src/routes/subscription.ts
git commit -m "feat(subscription): enforce profissional as only paid team plan"
```

---

## Task 4: Enforce Plan Gates on GET /players/:id

**Files:**
- Modify: `apps/api/src/routes/players.ts`

**Logic:**
- Player viewing **own** profile (`GET /me`): always full data
- Player viewing **another** player: show career if that player has `craque`/`fenomeno`, show stats if `fenomeno`
- **Team** viewing a player: show career if player has `craque`/`fenomeno` **AND** team has `profissional`; show stats if player has `fenomeno` **AND** team has `profissional`

- [ ] **Step 1: Add subscriptions import**

At the top of `apps/api/src/routes/players.ts`, add the import:

```typescript
import { subscriptions } from "../db/schema/subscriptions.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
```

The existing import block starts with:
```typescript
import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { players } from "../db/schema/index.js"
import { UpsertPlayerProfileRequestSchema } from "../../../../shared/contracts/players.js"
```

Replace with:
```typescript
import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireSession, requireRole } from "../hooks/require-auth.js"
import { ok } from "../lib/response.js"
import { players } from "../db/schema/index.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
import type { PlanId } from "../../../../shared/contracts/subscription.js"
import { UpsertPlayerProfileRequestSchema } from "../../../../shared/contracts/players.js"
```

- [ ] **Step 2: Replace GET /:id with enforced version**

Replace:
```typescript
  // GET /:id — any authenticated user
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.id, request.params.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }
      return ok({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )
```

With:
```typescript
  // GET /:id — any authenticated user (career/stats gated by plan)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      preHandler: [requireSession],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const viewerUserId = request.session!.user.id
      const viewerRole = request.session!.user.role as "player" | "team" | "admin"

      const profile = await fastify.db.query.players.findFirst({
        where: eq(players.id, request.params.id),
      })
      if (!profile) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Profile not found" },
        })
      }

      // Own profile: always full data
      if (profile.userId === viewerUserId) {
        return ok({
          ...profile,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        })
      }

      // Get player's own subscription to know what they've unlocked
      const playerSub = await fastify.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, profile.userId),
      })
      const playerPlanId = (playerSub?.planId ?? "free") as PlanId
      const playerCanShowCareer = ["craque", "fenomeno"].includes(playerPlanId)
      const playerCanShowStats = playerPlanId === "fenomeno"

      // Get viewer's subscription to know what they can see
      let viewerCanSeeCareer = true
      let viewerCanSeeStats = true
      if (viewerRole === "team") {
        const viewerSub = await fastify.db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, viewerUserId),
        })
        const viewerPlanId = (viewerSub?.planId ?? "free") as PlanId
        const viewerLimits = getPlanLimits(viewerPlanId, "team")
        viewerCanSeeCareer = viewerLimits.playerCareerAccess
        viewerCanSeeStats = viewerLimits.playerStatsAccess
      }

      return ok({
        ...profile,
        careerHistory: playerCanShowCareer && viewerCanSeeCareer ? profile.careerHistory : [],
        detailedStats: playerCanShowStats && viewerCanSeeStats ? profile.detailedStats : null,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })
    }
  )
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api
npx tsx --noEmit src/routes/players.ts 2>&1 || npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto
git add apps/api/src/routes/players.ts
git commit -m "feat(players): enforce career/stats visibility by plan on GET /:id"
```

---

## Task 5: Enforce Plan Gates on GET /search/players

**Files:**
- Modify: `apps/api/src/routes/search.ts`

The search route needs to JOIN players with their subscriptions so it can strip `careerHistory`/`detailedStats` per row based on:
1. Each player's plan (what they're allowed to show)
2. The requesting team's plan (what they can see)

- [ ] **Step 1: Add subscriptions import**

At top of `apps/api/src/routes/search.ts`, change:

```typescript
import { subscriptions } from "../db/schema/subscriptions.js"
import { SearchPlayersQuerySchema, SearchTeamsQuerySchema } from "../../../../shared/contracts/search.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
```

The full import block should look like:
```typescript
import type { FastifyPluginAsync } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { and, eq, ne, ilike, desc, sql, count, inArray, or } from "drizzle-orm"
import { requireRole } from "../hooks/require-auth.js"
import { list } from "../lib/response.js"
import { players } from "../db/schema/players.js"
import { teams } from "../db/schema/teams.js"
import { subscriptions } from "../db/schema/subscriptions.js"
import { SearchPlayersQuerySchema, SearchTeamsQuerySchema } from "../../../../shared/contracts/search.js"
import { getPlanLimits } from "../../../../shared/contracts/subscription.js"
import type { PlanId } from "../../../../shared/contracts/subscription.js"
```

- [ ] **Step 2: Add plan enforcement helper inside the GET /players handler**

Find the block that builds the response:
```typescript
      const data = rows.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))

      return list(data, page, effectivePageSize, total)
```

Replace with:
```typescript
      // Plan enforcement: fetch player subscriptions in bulk, then strip fields
      const teamLimits = getPlanLimits(planId as PlanId, "team")
      const teamCanSeeCareer = teamLimits.playerCareerAccess
      const teamCanSeeStats = teamLimits.playerStatsAccess

      let playerPlanMap: Record<string, PlanId> = {}
      if (teamCanSeeCareer || teamCanSeeStats) {
        const playerUserIds = rows.map((p) => p.userId)
        const playerSubs = await fastify.db
          .select({ userId: subscriptions.userId, planId: subscriptions.planId })
          .from(subscriptions)
          .where(inArray(subscriptions.userId, playerUserIds))
        for (const s of playerSubs) {
          playerPlanMap[s.userId] = s.planId as PlanId
        }
      }

      const data = rows.map((p) => {
        const playerPlanId = playerPlanMap[p.userId] ?? "free"
        const playerCanShowCareer = ["craque", "fenomeno"].includes(playerPlanId)
        const playerCanShowStats = playerPlanId === "fenomeno"
        return {
          ...p,
          careerHistory: playerCanShowCareer && teamCanSeeCareer ? p.careerHistory : [],
          detailedStats: playerCanShowStats && teamCanSeeStats ? p.detailedStats : null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }
      })

      return list(data, page, effectivePageSize, total)
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projet/apps/api
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto
git add apps/api/src/routes/search.ts
git commit -m "feat(search): enforce career/stats stripping per player plan in team search"
```

---

## Task 6: Update Frontend Plan Page

**Files:**
- Modify: `apps/web/app/routes/planos.tsx`

- [ ] **Step 1: Update PLAN_ICONS — remove titular/campeao, add profissional**

Find:
```typescript
const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Shield className="size-8" />,
  craque: <Star className="size-8" />,
  fenomeno: <Flame className="size-8" />,
  titular: <Trophy className="size-8" />,
  campeao: <Crown className="size-8" />,
};
```

Replace with:
```typescript
const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Shield className="size-8" />,
  craque: <Star className="size-8" />,
  fenomeno: <Flame className="size-8" />,
  profissional: <Crown className="size-8" />,
};
```

- [ ] **Step 2: Update PLAYER_FEATURES — remove "QUEM VIU SEU PERFIL" row**

Remove this entry from `PLAYER_FEATURES`:
```typescript
  {
    label: "QUEM VIU SEU PERFIL",
    icon: <Eye className="size-4" />,
    getValue: (p) => p.limits.profileViews,
  },
```

Also remove the `Eye` import from lucide-react since it's no longer used:

Change:
```typescript
import {
  Check,
  X,
  Zap,
  Shield,
  Trophy,
  Crown,
  Star,
  Flame,
  ArrowLeft,
  ArrowDown,
  MessageCircle,
  Search,
  Video,
  Eye,
  BadgeCheck,
  Users,
  BarChart3,
  Send,
  Sparkles,
  Headphones,
  ChevronDown,
  XCircle,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
```

To:
```typescript
import {
  Check,
  X,
  Zap,
  Shield,
  Trophy,
  Crown,
  Star,
  Flame,
  ArrowLeft,
  ArrowDown,
  MessageCircle,
  Search,
  Video,
  BadgeCheck,
  Users,
  BarChart3,
  Sparkles,
  Headphones,
  ChevronDown,
  XCircle,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
```

- [ ] **Step 3: Update TEAM_FEATURES — focus on the 2-plan world**

Replace `TEAM_FEATURES` with:
```typescript
const TEAM_FEATURES: FeatureRow[] = [
  {
    label: "PERFIL DO TIME",
    icon: <Shield className="size-4" />,
    getValue: () => true,
  },
  {
    label: "BUSCAR JOGADORES",
    icon: <Search className="size-4" />,
    getValue: (p) =>
      isUnlimited(p.limits.searchResults) ? "Ilimitado" : `${p.limits.searchResults} / busca`,
  },
  {
    label: "MENSAGENS / MÊS",
    icon: <MessageCircle className="size-4" />,
    getValue: (p) =>
      isUnlimited(p.limits.conversations) ? "Ilimitado" : `${p.limits.conversations}`,
  },
  {
    label: "VAGAS ABERTAS",
    icon: <Users className="size-4" />,
    getValue: (p) =>
      isUnlimited(p.limits.openPositions) ? "Ilimitado" : `${p.limits.openPositions}`,
  },
  {
    label: "VER HISTÓRICO DE CLUBES",
    icon: <ClipboardList className="size-4" />,
    getValue: (p) => p.limits.playerCareerAccess,
  },
  {
    label: "VER ESTATÍSTICAS COMPLETAS",
    icon: <BarChart3 className="size-4" />,
    getValue: (p) => p.limits.playerStatsAccess,
  },
  {
    label: "FILTROS AVANÇADOS",
    icon: <Search className="size-4" />,
    getValue: (p) => p.limits.advancedFilters,
  },
  {
    label: "RECOMENDAÇÕES POR ESTILO",
    icon: <Sparkles className="size-4" />,
    getValue: (p) => (p.limits.smartRecommendations ? "Melhores por perfil" : false),
  },
  {
    label: "SUPORTE PRIORITÁRIO",
    icon: <Headphones className="size-4" />,
    getValue: (p) => p.limits.prioritySupport,
  },
];
```

- [ ] **Step 4: Update FAQ — update answers for new plan structure**

Find:
```typescript
  {
    q: "Por que times precisam de um plano pago?",
    a: "O plano gratuito permite buscar jogadores e enviar mensagens com limite. Planos pagos dão acesso às estatísticas e ao histórico de carreira dos jogadores — dados que os próprios jogadores registram no CRAQUE e FENÔMENO. Quanto mais jogadores preenchem seus currículos, mais valioso é o acesso para os times.",
  },
```

Replace with:
```typescript
  {
    q: "Por que times precisam de um plano pago?",
    a: "O plano gratuito permite buscar jogadores e conversar com limite. O plano Profissional desbloqueia o acesso ao histórico de clubes e às estatísticas completas dos jogadores — dados que os próprios jogadores registram nos planos Craque e Fenômeno. Quanto mais jogadores investem no próprio currículo, mais valioso é o acesso para os times recrutadores.",
  },
```

Also update the team fairness notice. Find:
```typescript
          ) : (
            <div className="mx-auto mt-12 max-w-3xl border-l-4 border-primary bg-primary/5 p-6">
              <p className="font-bold uppercase tracking-widest text-sm text-foreground">
                A plataforma já tem milhares de jogadores cadastrados.
                Planos pagos dão acesso aos dados que os jogadores constroem no CRAQUE e FENÔMENO —
                estatísticas, histórico de clubes e avaliações por estilo de jogo.
              </p>
            </div>
          )}
```

Replace with:
```typescript
          ) : (
            <div className="mx-auto mt-12 max-w-3xl border-l-4 border-primary bg-primary/5 p-6">
              <p className="font-bold uppercase tracking-widest text-sm text-foreground">
                O plano gratuito deixa buscar e contatar jogadores.
                O plano Profissional desbloqueia histórico de clubes e estatísticas completas —
                dados que os jogadores Craque e Fenômeno registram nos perfis.
                Quanto mais jogadores sobem de plano, mais rico é o banco de dados para os times.
              </p>
            </div>
          )}
```

- [ ] **Step 5: Verify app compiles**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/web
bun run typecheck 2>&1 | head -40 || npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto
git add apps/web/app/routes/planos.tsx
git commit -m "feat(planos): update UI for new team plan structure, remove profileViews row"
```

---

## Task 7: Smoke Test End-to-End

- [ ] **Step 1: Start API**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto/apps/api
npm run dev
```

Expected: `Server listening on http://0.0.0.0:3000`

- [ ] **Step 2: Register two users — one player, one team**

```bash
# Player
curl -s -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"jogador@test.com","password":"Senha123!","name":"Jogador Teste","role":"player"}' | jq .

# Team
curl -s -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"time@test.com","password":"Senha123!","name":"Time Teste","role":"team"}' | jq .
```

- [ ] **Step 3: Login and get session cookies**

```bash
# Player login
PLAYER_COOKIE=$(curl -s -c /tmp/player.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"jogador@test.com","password":"Senha123!"}' | jq -r '.token // empty')
echo "Player token: $PLAYER_COOKIE"

# Team login  
TEAM_COOKIE=$(curl -s -c /tmp/team.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"time@test.com","password":"Senha123!"}' | jq -r '.token // empty')
echo "Team token: $TEAM_COOKIE"
```

- [ ] **Step 4: Check that team plan upgrade to profissional works**

```bash
# Upgrade team to profissional (mock mode)
curl -s -b /tmp/team.txt -X POST http://localhost:3000/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -d '{"planId":"profissional"}' | jq .
```

Expected: `{ "data": { "initPoint": "http://localhost:5173/pagamento-sucesso?planId=profissional", ... } }`

- [ ] **Step 5: Verify old team plans are blocked**

```bash
curl -s -b /tmp/team.txt -X POST http://localhost:3000/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -d '{"planId":"titular"}' | jq .
```

Expected: `{ "error": { "code": "INVALID_PLAN", ... } }`

- [ ] **Step 6: Verify careerHistory is stripped for free team**

```bash
# Get player profile ID first
PLAYER_ID=$(curl -s -b /tmp/player.txt http://localhost:3000/api/players/me | jq -r '.data.id')

# Free team views player — should get empty careerHistory
curl -s -b /tmp/team.txt "http://localhost:3000/api/players/${PLAYER_ID}" | jq '.data.careerHistory'
```

Expected: `[]`

- [ ] **Step 7: Final commit**

```bash
cd /home/diogo/Projects/tcc-2025-1-e-2-novus-gateway/Projeto
git add .
git commit -m "chore: plan restructure complete — profissional team plan + real enforcement"
```

---

## Self-Review Checklist

- [x] **TEAM_PLANS** reduced to `["free", "profissional"]` — covered Task 1
- [x] **Player plans unchanged** — free/craque/fenomeno kept, limits adjusted — Task 1
- [x] **DB migration** for `profissional` enum value — Task 2
- [x] **Drizzle schema** updated — Task 2 (titular/campeao kept for legacy compat)
- [x] **Subscription route** blocks titular/campeao upgrade — Task 3
- [x] **GET /players/:id** enforces career/stats gates — Task 4
- [x] **GET /search/players** strips data per player plan — Task 5
- [x] **Frontend plan page** updated — Task 6 (PLAN_ICONS, TEAM_FEATURES, FAQ)
- [x] **"Quem viu seu perfil"** removed from player features table — Task 6 Step 2/3
- [x] **Smoke tests** verify enforcement end-to-end — Task 7
- [x] No `titular`/`campeao` visible in UI (only blocked at route level, kept in DB enum)
- [x] Player viewing own profile always gets full data — Task 4 Step 2
- [x] `Send` and `Trophy` imports removed from planos.tsx — covered by removing unused imports in Task 6 Step 2
