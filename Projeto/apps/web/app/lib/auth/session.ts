import type { SessionUser } from "~shared/contracts";
import { getAuthToken } from "~/lib/api-client";

const SESSION_STORAGE_KEY = "varzeapro_user";

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: SessionUser): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/** Check if we have a valid session (token + user in storage). */
export function hasSession(): boolean {
  return !!getAuthToken() && !!getStoredUser();
}

