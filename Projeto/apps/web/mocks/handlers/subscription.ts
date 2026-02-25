import { http, HttpResponse } from "msw";
import { getMockUsage } from "../fixtures/subscription";
import { mockUsers, mockTokens } from "../fixtures/auth";
import type { PlanId } from "~shared/contracts";
import { getPlanLimits } from "~shared/contracts";

const API = "/api";

function getUserIdFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const entry = Object.entries(mockTokens).find(([, t]) => t === token);
  return entry ? entry[0] : null;
}

export const subscriptionHandlers = [
  http.get(`${API}/subscription/usage`, ({ request }) => {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }
    const user = Object.values(mockUsers).find((u) => u.id === userId);
    const role = user?.role === "team" ? "team" : "player";
    const planId = (user?.planId ?? "free") as PlanId;
    const limits = getPlanLimits(planId, role as "player" | "team");
    const baseUsage = getMockUsage(userId);

    return HttpResponse.json({
      ...baseUsage,
      conversationsLimit: limits.conversations,
      searchResultsLimit: limits.searchResults,
      openPositionsLimit: limits.openPositions,
      favoritesLimit: limits.favorites,
    });
  }),

  http.post(`${API}/subscription/upgrade`, async ({ request }) => {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      );
    }
    const body = (await request.json()) as { planId: string };
    const user = Object.values(mockUsers).find((u) => u.id === userId);
    if (user) {
      (user as { planId: string }).planId = body.planId;
    }

    return HttpResponse.json({
      success: true,
      planId: body.planId,
      message: "Plano atualizado com sucesso!",
    });
  }),
];
