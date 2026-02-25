/**
 * Typed API client for VárzeaPro.
 * Uses VITE_API_URL; when VITE_USE_MOCK is true, MSW intercepts same URL.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export type ApiResponseEnvelope<T> = { data: T };
export type ApiListResponse<T> = { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
export type ApiErrorBody = { error: { code: string; message: string; details?: unknown[] } };

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options;
  const base = BASE_URL.startsWith("http") ? BASE_URL : `${typeof window !== "undefined" ? window.location.origin : ""}${BASE_URL}`;
  const pathNorm = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`${base.replace(/\/$/, "")}/${pathNorm}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T | ApiErrorBody) : null;
  if (!res.ok) {
    const err = body && "error" in (body as ApiErrorBody) ? (body as ApiErrorBody).error : { code: "UNKNOWN", message: res.statusText };
    throw new ApiError(res.status, err.code, err.message, (err as { details?: unknown[] }).details);
  }
  return body as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Get auth token from storage (sessionStorage for mock/dev) */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("varzeapro_token");
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("varzeapro_token", token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("varzeapro_token");
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Auth ---
export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<{ user: { id: string; email: string; name: string; role: string }; token: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(body) }
    ),
  signUp: (body: { name: string; email: string; password: string; confirmPassword: string; role: string }) =>
    request<{ user: { id: string; email: string; name: string; role: string }; token: string }>(
      "/auth/signup",
      { method: "POST", body: JSON.stringify(body) }
    ),
  forgotPassword: (body: { email: string }) =>
    request<{ success: boolean; message: string }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify(body) }
    ),
};

// --- Players ---
export const playersApi = {
  getMe: () =>
    request<import("~shared/contracts").PlayerProfile>(
      "/players/me",
      { headers: authHeaders() }
    ),
  getById: (id: string) =>
    request<import("~shared/contracts").PlayerProfile>(
      `/players/${id}`,
      { headers: authHeaders() }
    ),
  upsert: (body: import("~shared/contracts").UpsertPlayerProfileRequest) =>
    request<import("~shared/contracts").PlayerProfile>(
      "/players",
      { method: "PUT", body: JSON.stringify(body), headers: authHeaders() }
    ),
};

// --- Teams ---
export const teamsApi = {
  getMe: () =>
    request<import("~shared/contracts").TeamProfile>(
      "/teams/me",
      { headers: authHeaders() }
    ),
  getById: (id: string) =>
    request<import("~shared/contracts").TeamProfile>(
      `/teams/${id}`,
      { headers: authHeaders() }
    ),
  upsert: (body: import("~shared/contracts").UpsertTeamProfileRequest) =>
    request<import("~shared/contracts").TeamProfile>(
      "/teams",
      { method: "PUT", body: JSON.stringify(body), headers: authHeaders() }
    ),
};

// --- Search ---
export const searchApi = {
  players: (params: import("~shared/contracts").SearchPlayersQuery) =>
    request<import("~shared/contracts").SearchPlayersResponse>(
      "/search/players",
      { params: params as Record<string, string | number | undefined>, headers: authHeaders() }
    ),
  teams: (params: import("~shared/contracts").SearchTeamsQuery) =>
    request<import("~shared/contracts").SearchTeamsResponse>(
      "/search/teams",
      { params: params as Record<string, string | number | undefined>, headers: authHeaders() }
    ),
};

// --- Messaging ---
export const messagingApi = {
  listConversations: () =>
    request<import("~shared/contracts").ListConversationsResponse>(
      "/conversations",
      { headers: authHeaders() }
    ),
  getMessages: (conversationId: string, params?: { page?: number; pageSize?: number }) =>
    request<import("~shared/contracts").GetMessagesResponse>(
      `/conversations/${conversationId}/messages`,
      { params, headers: authHeaders() }
    ),
  createConversation: (body: import("~shared/contracts").CreateConversationRequest) =>
    request<import("~shared/contracts").Conversation>(
      "/conversations",
      { method: "POST", body: JSON.stringify(body), headers: authHeaders() }
    ),
  sendMessage: (conversationId: string, body: import("~shared/contracts").SendMessageRequest) =>
    request<import("~shared/contracts").Message>(
      `/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify(body), headers: authHeaders() }
    ),
};

// --- Admin: Users ---
export const adminUsersApi = {
  list: (params?: import("~shared/contracts").ListUsersQuery) =>
    request<import("~shared/contracts").ListUsersResponse>(
      "/admin/users",
      { params: params as Record<string, string | number | undefined>, headers: authHeaders() }
    ),
  getById: (id: string) =>
    request<import("~shared/contracts").UserDetail>(
      `/admin/users/${id}`,
      { headers: authHeaders() }
    ),
  ban: (id: string, body?: import("~shared/contracts").BanUserRequest) =>
    request<void>(
      `/admin/users/${id}/ban`,
      { method: "POST", body: body ? JSON.stringify(body) : undefined, headers: authHeaders() }
    ),
};

// --- Subscription ---
export const subscriptionApi = {
  getUsage: () =>
    request<import("~shared/contracts").Usage>(
      "/subscription/usage",
      { headers: authHeaders() }
    ),
  upgrade: (body: { planId: string }) =>
    request<{ success: boolean; planId: string; message: string }>(
      "/subscription/upgrade",
      { method: "POST", body: JSON.stringify(body), headers: authHeaders() }
    ),
};

// --- Admin: Moderation ---
export const adminModerationApi = {
  listReports: (params?: import("~shared/contracts").ListReportsQuery) =>
    request<import("~shared/contracts").ListReportsResponse>(
      "/admin/moderation/reports",
      { params: params as Record<string, string | number | undefined>, headers: authHeaders() }
    ),
  moderate: (reportId: string, body: import("~shared/contracts").ModerateReportRequest) =>
    request<void>(
      `/admin/moderation/reports/${reportId}`,
      { method: "POST", body: JSON.stringify(body), headers: authHeaders() }
    ),
};
