import { http, HttpResponse } from "msw";
import { mockConversations, mockMessagesByConversation } from "../fixtures/messaging";

const API = "/api";

export const messagingHandlers = [
  http.get(`${API}/conversations`, () => {
    return HttpResponse.json({ data: mockConversations });
  }),

  http.get(`${API}/conversations/:id/messages`, ({ params }) => {
    const id = params.id as string;
    const messages = mockMessagesByConversation[id] ?? [];
    const page = 1;
    const pageSize = 50;
    return HttpResponse.json({
      data: messages,
      meta: { page, pageSize, total: messages.length, totalPages: 1 },
    });
  }),

  http.post(`${API}/conversations`, async ({ request }) => {
    const body = (await request.json()) as { teamId?: string; playerId?: string };
    return HttpResponse.json({
      id: `conv-${Date.now()}`,
      participantA: "current-user",
      participantB: body.teamId ?? body.playerId ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  http.post(`${API}/conversations/:id/messages`, async ({ params, request }) => {
    const id = params.id as string;
    const body = (await request.json()) as { content: string };
    return HttpResponse.json({
      id: `msg-${Date.now()}`,
      conversationId: id,
      senderId: "current-user",
      content: body.content,
      createdAt: new Date().toISOString(),
    });
  }),
];
