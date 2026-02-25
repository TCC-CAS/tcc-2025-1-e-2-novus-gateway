import { http, HttpResponse } from "msw";
import { mockPlayerSummaries } from "../fixtures/players";
import { mockTeamSummaries } from "../fixtures/teams";

const API = "/api";

export const searchHandlers = [
  http.get(`${API}/search/players`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 20;
    const total = mockPlayerSummaries.length;
    return HttpResponse.json({
      data: mockPlayerSummaries.slice((page - 1) * pageSize, page * pageSize),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }),

  http.get(`${API}/search/teams`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 20;
    const total = mockTeamSummaries.length;
    return HttpResponse.json({
      data: mockTeamSummaries.slice((page - 1) * pageSize, page * pageSize),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }),
];
