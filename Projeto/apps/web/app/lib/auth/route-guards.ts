import type { SessionUser } from "~shared/contracts";
import type { DataFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getRole, getHomeForRole } from "~/lib/auth/permissions";

const COOKIE_NAME = "varzeapro_session";

/** Parse session from cookie header (for loaders). Use when cookie-based auth is enabled. */
export function getSessionFromRequest(request: Request): SessionUser | null {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const data = JSON.parse(decoded) as { user: SessionUser };
    return data?.user ?? null;
  } catch {
    return null;
  }
}

/** Set session cookie (call from client after login). */
export function setSessionCookie(user: SessionUser, token: string): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify({ user, token }));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=604800; samesite=lax`;
}

/** Clear session cookie (call from client on logout). */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

/** Require auth in loader; redirect to /login if no session. Uses cookie. Return user for child loaders. */
export function requireAuth({ request }: DataFunctionArgs): SessionUser | null {
  const user = getSessionFromRequest(request);
  if (!user) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return user;
}

/** Require specific role in loader; redirect to role home if wrong role. Use after requireAuth. */
export function requireRole(user: SessionUser | null, pathname: string): SessionUser | null {
  if (!user) return null;
  const role = getRole(user);
  if (!role) throw redirect("/login");
  const home = getHomeForRole(role);
  const isPlayerRoute = pathname === "/jogador" || pathname.startsWith("/jogador/");
  const isTeamRoute = pathname === "/time" || pathname.startsWith("/time/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isPlayerRoute && role !== "player") throw redirect(home);
  if (isTeamRoute && role !== "team") throw redirect(home);
  if (isAdminRoute && role !== "admin") throw redirect(home);
  return user;
}
