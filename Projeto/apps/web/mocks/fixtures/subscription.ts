import type { Usage } from "~shared/contracts";

export function getMockUsage(userId: string): Usage {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const usageByUser: Record<string, Partial<Usage>> = {
    "user-player-1": { conversationsUsed: 7 },
    "user-team-1": { conversationsUsed: 3, openPositionsUsed: 1, favoritesUsed: 0 },
  };

  const base = usageByUser[userId] ?? {};

  return {
    conversationsUsed: base.conversationsUsed ?? 0,
    conversationsLimit: 10,
    searchResultsLimit: 999999,
    openPositionsUsed: base.openPositionsUsed ?? 0,
    openPositionsLimit: 1,
    favoritesUsed: base.favoritesUsed ?? 0,
    favoritesLimit: 0,
    periodResetAt: endOfMonth.toISOString(),
  };
}
