import { z } from "zod";

export const PLAYER_PLANS = ["free", "craque"] as const;
export const TEAM_PLANS = ["free", "titular", "campeao"] as const;
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

export const PlanInfoSchema = z.object({
  subscription: SubscriptionSchema.nullable(),
  usage: UsageSchema,
  effectivePlan: PlanIdSchema,
});
export type PlanInfo = z.infer<typeof PlanInfoSchema>;

export type PlanLimits = {
  conversations: number;
  searchResults: number;
  openPositions: number;
  favorites: number;
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
    description: "Tudo que você precisa para entrar em campo",
    price: 0,
    role: "player",
    limits: {
      conversations: 10,
      searchResults: UNLIMITED,
      openPositions: 0,
      favorites: 0,
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
    },
  },
  craque: {
    id: "craque",
    name: "CRAQUE",
    description: "Mostre seu talento com ferramentas profissionais",
    price: 9.9,
    role: "player",
    popular: true,
    limits: {
      conversations: UNLIMITED,
      searchResults: UNLIMITED,
      openPositions: 0,
      favorites: 0,
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
    },
  },

  // --- Team plans use "free" for the base too, resolved by role ---
  titular: {
    id: "titular",
    name: "TITULAR",
    description: "Recrutamento profissional para seu elenco",
    price: 29.9,
    role: "team",
    popular: true,
    limits: {
      conversations: UNLIMITED,
      searchResults: UNLIMITED,
      openPositions: 5,
      favorites: 20,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: false,
      profileViews: false,
      advancedFilters: true,
      featuredListing: true,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      prioritySupport: false,
    },
  },
  campeao: {
    id: "campeao",
    name: "CAMPEÃO",
    description: "Domine o mercado com inteligência e velocidade",
    price: 59.9,
    role: "team",
    limits: {
      conversations: UNLIMITED,
      searchResults: UNLIMITED,
      openPositions: UNLIMITED,
      favorites: UNLIMITED,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: true,
      profileViews: false,
      advancedFilters: true,
      featuredListing: true,
      analytics: true,
      bulkOutreach: true,
      smartRecommendations: true,
      prioritySupport: true,
    },
  },
};

export function getDefaultLimitsForRole(role: "player" | "team"): PlanLimits {
  if (role === "team") {
    return {
      conversations: 5,
      searchResults: 10,
      openPositions: 1,
      favorites: 0,
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
        ? "Para o time casual de fim de semana"
        : "Tudo que você precisa para entrar em campo",
  };

  if (role === "player") {
    return [freePlan, PLAN_CONFIGS.craque];
  }
  return [freePlan, PLAN_CONFIGS.titular, PLAN_CONFIGS.campeao];
}

export function isUnlimited(value: number): boolean {
  return value >= UNLIMITED;
}
