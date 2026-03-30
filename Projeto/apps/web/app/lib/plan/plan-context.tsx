"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { useAuthState } from "~/lib/auth/auth-context";
import { subscriptionApi } from "~/lib/api-client";
import type { PlanId, PlanLimits, Usage } from "~shared/contracts";
import { getPlanLimits, isUnlimited } from "~shared/contracts";

type PlanState = {
  planId: PlanId;
  limits: PlanLimits;
  usage: Usage | null;
  isLoading: boolean;
};

type PlanActions = {
  canSendMessage: () => boolean;
  getSearchResultsLimit: () => number;
  canUseAdvancedFilters: () => boolean;
  canSeeProfileViews: () => boolean;
  canUploadVideo: () => boolean;
  hasExpandedProfile: () => boolean;
  hasVerifiedBadge: () => boolean;
  hasFeaturedListing: () => boolean;
  hasAnalytics: () => boolean;
  canBulkOutreach: () => boolean;
  hasSmartRecommendations: () => boolean;
  hasPrioritySupport: () => boolean;
  getRemainingConversations: () => number;
  getOpenPositionsLimit: () => number;
  getFavoritesLimit: () => number;
  isPaid: () => boolean;
  refreshUsage: () => void;
};

const PlanStateContext = createContext<PlanState | null>(null);
const PlanActionsContext = createContext<PlanActions | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuthState();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const planId: PlanId = (user?.planId as PlanId) ?? "free";
  const effectiveRole = role === "admin" ? "player" : (role ?? "player");
  const limits = useMemo(
    () => getPlanLimits(planId, effectiveRole),
    [planId, effectiveRole]
  );

  const fetchUsage = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    subscriptionApi
      .getUsage()
      .then((data) => setUsage(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const state = useMemo<PlanState>(
    () => ({ planId, limits, usage, isLoading }),
    [planId, limits, usage, isLoading]
  );

  const actions = useMemo<PlanActions>(() => {
    const remaining = () => {
      if (isUnlimited(limits.conversations)) return Infinity;
      const used = usage?.conversationsUsed ?? 0;
      return Math.max(0, limits.conversations - used);
    };

    return {
      canSendMessage: () => remaining() > 0,
      getSearchResultsLimit: () => limits.searchResults,
      canUseAdvancedFilters: () => limits.advancedFilters,
      canSeeProfileViews: () => limits.profileViews,
      canUploadVideo: () => limits.videoHighlights,
      hasExpandedProfile: () => limits.expandedProfile,
      hasVerifiedBadge: () => limits.verifiedBadge,
      hasFeaturedListing: () => limits.featuredListing,
      hasAnalytics: () => limits.analytics,
      canBulkOutreach: () => limits.bulkOutreach,
      hasSmartRecommendations: () => limits.smartRecommendations,
      hasPrioritySupport: () => limits.prioritySupport,
      getRemainingConversations: remaining,
      getOpenPositionsLimit: () => limits.openPositions,
      getFavoritesLimit: () => limits.favorites,
      isPaid: () => planId !== "free",
      refreshUsage: fetchUsage,
    };
  }, [limits, usage, planId, fetchUsage]);

  return (
    <PlanStateContext.Provider value={state}>
      <PlanActionsContext.Provider value={actions}>
        {children}
      </PlanActionsContext.Provider>
    </PlanStateContext.Provider>
  );
}

export function usePlanState(): PlanState {
  const ctx = useContext(PlanStateContext);
  if (!ctx) throw new Error("usePlanState must be used within PlanProvider");
  return ctx;
}

export function usePlanActions(): PlanActions {
  const ctx = useContext(PlanActionsContext);
  if (!ctx) throw new Error("usePlanActions must be used within PlanProvider");
  return ctx;
}

export function usePlan() {
  return { ...usePlanState(), ...usePlanActions() };
}
