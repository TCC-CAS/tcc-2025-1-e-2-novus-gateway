import { http, HttpResponse } from "msw";
import { mockPlayerProfiles } from "../fixtures/players";

const API = "/api";

export const playersHandlers = [
  http.get(`${API}/players/me`, () => {
    return HttpResponse.json(mockPlayerProfiles[0]);
  }),

  http.get(`${API}/players/:id`, ({ params }) => {
    const id = params.id as string;
    const profile = mockPlayerProfiles.find((p) => p.id === id);
    if (!profile) return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Jogador não encontrado." } }, { status: 404 });
    return HttpResponse.json(profile);
  }),

  http.put(`${API}/players`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const updated = {
      ...mockPlayerProfiles[0],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),
];
