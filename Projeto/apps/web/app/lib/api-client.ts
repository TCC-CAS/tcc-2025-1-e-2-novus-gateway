/**
 * Typed API client for VárzeaPro.
 * Uses VITE_API_URL as base URL; all requests include credentials (cookies).
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
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = body && typeof body === "object" && "error" in (body as ApiErrorBody) ? (body as ApiErrorBody).error : { code: "UNKNOWN", message: res.statusText };
    throw new ApiError(res.status, err.code, err.message, (err as { details?: unknown[] }).details);
  }
  // Unwrap { data: T } envelope returned by all backend ok() responses.
  // Paginated responses have shape { data: T[], meta: {...} } — those are NOT envelopes,
  // so only unwrap when there is no "meta" sibling key.
  const bodyObj = body as Record<string, unknown>;
  if (body && typeof body === "object" && "data" in bodyObj && !("meta" in bodyObj)) {
    return bodyObj.data as T;
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

type BetterAuthUser = { id: string; email: string; name: string; role: string; planId?: string }

// --- Auth ---
export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<{ user: BetterAuthUser; token?: string }>(
      "/auth/sign-in/email",
      { method: "POST", body: JSON.stringify(body) }
    ),
  signUp: (body: { name: string; email: string; password: string; role: string }) =>
    request<{ user: BetterAuthUser; token?: string }>(
      "/auth/sign-up/email",
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
      "/players/me",
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
      "/teams/me",
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

// --- Reports (user-facing) ---
export const reportApi = {
  create: (body: import("~shared/contracts").CreateReportRequest) =>
    request<import("~shared/contracts").CreateReportResponse>(
      "/reports",
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

// --- Favorites ---
type FavoriteItem = {
  id: string;
  targetUser: {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    profileId: string | null;
  };
  createdAt: string;
};

export const favoritesApi = {
  list: () =>
    request<FavoriteItem[]>(
      "/favorites",
      { headers: authHeaders() }
    ),
  add: (targetUserId: string) =>
    request<{ id: string; favorited: boolean }>(
      "/favorites",
      { method: "POST", body: JSON.stringify({ targetUserId }), headers: authHeaders() }
    ),
  remove: (targetUserId: string) =>
    request<{ favorited: boolean }>(
      `/favorites/${targetUserId}`,
      { method: "DELETE", headers: authHeaders() }
    ),
};

// --- Upload ---
export const uploadApi = {
  avatar: async (file: File) => {
    const base = BASE_URL.startsWith("http") ? BASE_URL : `${window.location.origin}${BASE_URL}`;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${base.replace(/\/$/, "")}/upload/avatar`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.error?.code ?? "UPLOAD_FAILED", body?.error?.message ?? "Upload failed");
    }
    const body = await res.json();
    return (body as { data: { url: string } }).data;
  },
};
