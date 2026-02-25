import { http, HttpResponse } from "msw";
import { mockUserSummaries } from "../fixtures/users";
import { mockReports } from "../fixtures/moderation";

const API = "/api";

export const adminHandlers = [
  http.get(`${API}/admin/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 20;
    const total = mockUserSummaries.length;
    return HttpResponse.json({
      data: mockUserSummaries.slice((page - 1) * pageSize, page * pageSize),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }),

  http.get(`${API}/admin/users/:id`, ({ params }) => {
    const id = params.id as string;
    const user = mockUserSummaries.find((u) => u.id === id);
    if (!user) return HttpResponse.json({ error: { code: "NOT_FOUND", message: "Usuário não encontrado." } }, { status: 404 });
    return HttpResponse.json({ ...user, profileId: id });
  }),

  http.post(`${API}/admin/users/:id/ban`, () => {
    return HttpResponse.json(null, { status: 204 });
  }),

  http.get(`${API}/admin/moderation/reports`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 20;
    const total = mockReports.length;
    return HttpResponse.json({
      data: mockReports.slice((page - 1) * pageSize, page * pageSize),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }),

  http.post(`${API}/admin/moderation/reports/:id`, () => {
    return HttpResponse.json(null, { status: 204 });
  }),
];
