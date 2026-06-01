import type { SessionUser } from "~shared/contracts";

const SESSION_STORAGE_KEY = "varzeapro_user";

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: SessionUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/** Check if we have user data in storage (cookie-based auth, no token in JS). */
export function hasSession(): boolean {
  return !!getStoredUser();
}

