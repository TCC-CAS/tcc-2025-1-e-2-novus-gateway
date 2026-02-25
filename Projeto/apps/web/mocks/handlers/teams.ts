import { http, HttpResponse } from "msw";
import { mockTeamProfiles } from "../fixtures/teams";

const API = "/api";

export const teamsHandlers = [
  http.get(`${API}/teams/me`, () => {
    return HttpResponse.json(mockTeamProfiles[0]);
  }),

  http.get(`${API}/teams/:id`, ({ params }) => {
    const id = params.id as string;
    const profile = mockTeamProfiles.find((t) => t.id === id);
    if (!profile) return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Time não encontrado." } }, { status: 404 });
    return HttpResponse.json(profile);
  }),

  http.put(`${API}/teams`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const updated = {
      ...mockTeamProfiles[0],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),
];
