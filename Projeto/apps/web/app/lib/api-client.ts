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
  const hasBody = !!init.body;
  const res = await fetch(url.toString(), {
    ...init,
    credentials: "include",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
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
export type ProfileView = {
  id: string
  viewedAt: string
  viewer: {
    userId: string
    name: string
    logoUrl: string | null
    region: string | null
    city: string | null
    level: string | null
  }
}

export const playersApi = {
  getMe: () =>
    request<import("~shared/contracts").PlayerProfile>(
      "/players/me"),
  getById: (id: string) =>
    request<import("~shared/contracts").PlayerProfile>(
      `/players/${id}`),
  upsert: (body: import("~shared/contracts").UpsertPlayerProfileRequest) =>
    request<import("~shared/contracts").PlayerProfile>(
      "/players/me",
      { method: "PUT", body: JSON.stringify(body)}
    ),
  getViews: () =>
    request<ProfileView[]>("/players/me/views"),
};

// --- Teams ---
export const teamsApi = {
  getMe: () =>
    request<import("~shared/contracts").TeamProfile>(
      "/teams/me"),
  getById: (id: string) =>
    request<import("~shared/contracts").TeamProfile>(
      `/teams/${id}`),
  upsert: (body: import("~shared/contracts").UpsertTeamProfileRequest) =>
    request<import("~shared/contracts").TeamProfile>(
      "/teams/me",
      { method: "PUT", body: JSON.stringify(body)}
    ),
};

// --- Search ---
export const searchApi = {
  players: (params: import("~shared/contracts").SearchPlayersQuery) =>
    request<import("~shared/contracts").SearchPlayersResponse>(
      "/search/players",
      { params: params as Record<string, string | number | undefined>}
    ),
  teams: (params: import("~shared/contracts").SearchTeamsQuery) =>
    request<import("~shared/contracts").SearchTeamsResponse>(
      "/search/teams",
      { params: params as Record<string, string | number | undefined>}
    ),
};

// --- Messaging ---
export const messagingApi = {
  listConversations: () =>
    request<import("~shared/contracts").ListConversationsResponse>(
      "/conversations"),
  getMessages: (conversationId: string, params?: { page?: number; pageSize?: number }) =>
    request<import("~shared/contracts").GetMessagesResponse>(
      `/conversations/${conversationId}/messages`,
      { params}
    ),
  createConversation: (body: import("~shared/contracts").CreateConversationRequest) =>
    request<import("~shared/contracts").Conversation>(
      "/conversations",
      { method: "POST", body: JSON.stringify(body)}
    ),
  sendMessage: (conversationId: string, body: import("~shared/contracts").SendMessageRequest) =>
    request<import("~shared/contracts").Message>(
      `/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify(body)}
    ),
};

// --- Admin: Users ---
export const adminUsersApi = {
  list: (params?: import("~shared/contracts").ListUsersQuery) =>
    request<import("~shared/contracts").ListUsersResponse>(
      "/admin/users",
      { params: params as Record<string, string | number | undefined>}
    ),
  getById: (id: string) =>
    request<import("~shared/contracts").UserDetail>(
      `/admin/users/${id}`),
  ban: (id: string, body?: import("~shared/contracts").BanUserRequest) =>
    request<void>(
      `/admin/users/${id}/ban`,
      { method: "POST", body: body ? JSON.stringify(body) : undefined}
    ),
};

// --- Subscription ---
export const subscriptionApi = {
  getUsage: () =>
    request<import("~shared/contracts").Usage>(
      "/subscription/usage"),
  upgrade: (body: { planId: string }) =>
    request<{ success: boolean; planId: string; message: string }>(
      "/subscription/upgrade",
      { method: "POST", body: JSON.stringify(body)}
    ),
  cancel: () =>
    request<{ success: boolean; message: string; planId: string; currentPeriodEnd: string | null }>(
      "/subscription/cancel",
      { method: "POST" }
    ),
  checkout: (body: { planId: string }) =>
    request<import("~shared/contracts").CheckoutResponse>(
      "/subscription/checkout",
      { method: "POST", body: JSON.stringify(body) }
    ),
};

// --- Reports (user-facing) ---
export const reportApi = {
  create: (body: import("~shared/contracts").CreateReportRequest) =>
    request<import("~shared/contracts").CreateReportResponse>(
      "/reports",
      { method: "POST", body: JSON.stringify(body)}
    ),
};

// --- Admin: Moderation ---
export const adminModerationApi = {
  listReports: (params?: import("~shared/contracts").ListReportsQuery) =>
    request<import("~shared/contracts").ListReportsResponse>(
      "/admin/moderation/reports",
      { params: params as Record<string, string | number | undefined>}
    ),
  moderate: (reportId: string, body: import("~shared/contracts").ModerateReportRequest) =>
    request<void>(
      `/admin/moderation/reports/${reportId}`,
      { method: "POST", body: JSON.stringify(body)}
    ),
};

// --- Favorites ---
export const favoritesApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    request<import("~shared/contracts").ListFavoritesResponse>(
      "/favorites",
      { params: params as Record<string, string | number | undefined>}
    ),
  add: (targetUserId: string) =>
    request<import("~shared/contracts").FavoriteActionResponse>(
      "/favorites",
      { method: "POST", body: JSON.stringify({ targetUserId })}
    ),
  remove: (targetUserId: string) =>
    request<import("~shared/contracts").UnfavoriteActionResponse>(
      `/favorites/${targetUserId}`,
      { method: "DELETE"}
    ),
};

// --- Upload ---

export type UploadImageResult = {
  assetId: string;
  thumbnailUrl: string;
  mediumUrl: string;
  originalUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
};

async function uploadFile(endpoint: string, file: File): Promise<UploadImageResult> {
  const base = BASE_URL.startsWith("http") ? BASE_URL : `${window.location.origin}${BASE_URL}`;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${base.replace(/\/$/, "")}${endpoint}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? "UPLOAD_FAILED",
      body?.error?.message ?? "Upload failed"
    );
  }
  return (body as { data: UploadImageResult }).data;
}

async function deleteUpload(endpoint: string): Promise<void> {
  const base = BASE_URL.startsWith("http") ? BASE_URL : `${window.location.origin}${BASE_URL}`;
  const res = await fetch(`${base.replace(/\/$/, "")}${endpoint}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code ?? "DELETE_FAILED",
      body?.error?.message ?? "Delete failed"
    );
  }
}

export const uploadApi = {
  avatar: (file: File) => uploadFile("/upload/avatar", file),
  logo: (file: File) => uploadFile("/upload/logo", file),
  deleteAvatar: () => deleteUpload("/upload/avatar"),
  deleteLogo: () => deleteUpload("/upload/logo"),
};

// --- Gallery ---
export const galleryApi = {
  presign: (body: import("~shared/contracts").PresignRequest) =>
    request<import("~shared/contracts").PresignResponse>(
      "/gallery/presign",
      { method: "POST", body: JSON.stringify(body) }
    ),
  confirm: (body: import("~shared/contracts").ConfirmUploadRequest) =>
    request<import("~shared/contracts").GalleryMedia>(
      "/gallery/confirm",
      { method: "POST", body: JSON.stringify(body) }
    ),
  listByUser: (userId: string) =>
    request<import("~shared/contracts").ListGalleryResponse>(
      `/gallery/${userId}`
    ),
  listMine: () =>
    request<import("~shared/contracts").ListGalleryResponse>(
      "/gallery/me"
    ),
  update: (assetId: string, body: import("~shared/contracts").UpdateGalleryItemRequest) =>
    request<import("~shared/contracts").GalleryMedia>(
      `/gallery/${assetId}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),
  deleteItem: (assetId: string) =>
    request<{ success: boolean }>(
      `/gallery/${assetId}`,
      { method: "DELETE" }
    ),
};
