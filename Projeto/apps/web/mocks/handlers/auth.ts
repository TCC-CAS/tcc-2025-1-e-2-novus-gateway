import { http, HttpResponse } from "msw";
import { mockUsers, mockTokens, mockCredentials } from "../fixtures/auth";

const API = "/api";

export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const cred = mockCredentials.find(
      (c) => c.email === body.email && c.password === body.password
    );
    if (!cred) {
      return HttpResponse.json(
        { error: { code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." } },
        { status: 401 }
      );
    }
    const user = mockUsers[cred.userId as keyof typeof mockUsers] ?? mockUsers.player1;
    const token = mockTokens[cred.userId];
    return HttpResponse.json({ user, token: token ?? "mock-token" });
  }),

  http.post(`${API}/auth/signup`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email: string;
      password: string;
      role: string;
    };
    const userId = `user-${body.role}-${Date.now()}`;
    const user = {
      id: userId,
      email: body.email,
      name: body.name,
      role: body.role as "player" | "team" | "admin",
      planId: "free" as const,
    };
    return HttpResponse.json({ user, token: `mock-token-${userId}` });
  }),

  http.post(`${API}/auth/forgot-password`, async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({
      success: true,
      message: "Se o e-mail existir, você receberá um link para redefinir a senha.",
    });
  }),
];
