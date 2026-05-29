import { z } from "zod";

export const PLAYER_PLANS = ["free", "craque", "fenomeno"] as const;
export const TEAM_PLANS = ["free", "profissional"] as const;
export const ALL_PLANS = ["free", "craque", "fenomeno", "profissional"] as const;

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
  matchInvites: number;
  videoHighlights: boolean;
  expandedProfile: boolean;
  verifiedBadge: boolean;
  profileViews: boolean;
  advancedFilters: boolean;
  featuredListing: boolean;
  analytics: boolean;
  bulkOutreach: boolean;
  smartRecommendations: boolean;
  cardTier: "none" | "gold" | "legendary";
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

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "LIVRE",
    description: "Crie seu perfil e entre no jogo",
    price: 0,
    role: "player",
    limits: {
      conversations: 5,
      searchResults: 20,
      openPositions: 0,
      favorites: 5,
      maxGalleryItems: 3,
      matchInvites: 0,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: false,
      profileViews: false,
      advancedFilters: false,
      featuredListing: false,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      cardTier: "none" as const,
      prioritySupport: false,
    },
  },
  craque: {
    id: "craque",
    name: "CRAQUE",
    description: "Carta de ouro, destaque na busca e 30 mensagens/mês",
    price: 29.9,
    role: "player",
    popular: true,
    limits: {
      conversations: 30,
      searchResults: 50,
      openPositions: 0,
      favorites: 25,
      maxGalleryItems: 10,
      matchInvites: 0,
      videoHighlights: true,
      expandedProfile: true,
      verifiedBadge: true,
      profileViews: true,
      advancedFilters: false,
      featuredListing: true,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      cardTier: "gold" as const,
      prioritySupport: false,
    },
  },
  fenomeno: {
    id: "fenomeno",
    name: "FENÔMENO",
    description: "Carta lendária + máximo destaque — máxima visibilidade",
    price: 59.9,
    role: "player",
    limits: {
      conversations: 100,
      searchResults: 100,
      openPositions: 0,
      favorites: 100,
      maxGalleryItems: 25,
      matchInvites: 0,
      videoHighlights: true,
      expandedProfile: true,
      verifiedBadge: true,
      profileViews: true,
      advancedFilters: false,
      featuredListing: true,
      analytics: true,
      bulkOutreach: false,
      smartRecommendations: false,
      cardTier: "legendary" as const,
      prioritySupport: true,
    },
  },

  profissional: {
    id: "profissional",
    name: "PROFISSIONAL",
    description: "Recrutamento sério para times que jogam pra valer",
    price: 79.9,
    role: "team",
    popular: true,
    limits: {
      conversations: 80,
      searchResults: 40,
      openPositions: 5,
      favorites: 50,
      maxGalleryItems: 0,
      matchInvites: 100,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: true,
      profileViews: false,
      advancedFilters: true,
      featuredListing: false,
      analytics: true,
      bulkOutreach: false,
      smartRecommendations: true,
      cardTier: "none" as const,
      prioritySupport: true,
    },
  },
};

export function getDefaultLimitsForRole(role: "player" | "team"): PlanLimits {
  if (role === "team") {
    return {
      conversations: 3,
      searchResults: 8,
      openPositions: 1,
      favorites: 5,
      maxGalleryItems: 0,
      matchInvites: 10,
      videoHighlights: false,
      expandedProfile: false,
      verifiedBadge: false,
      profileViews: false,
      advancedFilters: false,
      featuredListing: false,
      analytics: false,
      bulkOutreach: false,
      smartRecommendations: false,
      cardTier: "none" as const,
      prioritySupport: false,
    };
  }
  return PLAN_CONFIGS.free.limits;
}

export function getPlanLimits(planId: PlanId | string, role: "player" | "team"): PlanLimits {
  if (planId === "free" || !(planId in PLAN_CONFIGS)) return getDefaultLimitsForRole(role);
  return PLAN_CONFIGS[planId as PlanId].limits;
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

export function isUnlimited(_value: number): boolean {
  return false;
}
