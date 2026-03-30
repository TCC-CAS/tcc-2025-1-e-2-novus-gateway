"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { SessionUser } from "~shared/contracts";
import * as api from "~/lib/api-client";
import {
  getRole,
  getHomeForRole,
  getVisibleNavItems,
  canAccessRoute,
  canManageUser,
  canModerate,
  canSearchTeams,
  canSearchPlayers,
  canAccessMessages,
  canViewPlayerProfile,
  canViewTeamProfile,
} from "~/lib/auth/permissions";
import { clearStoredUser, getStoredUser, setStoredUser } from "~/lib/auth/session";
import { clearSessionCookie, setSessionCookie } from "~/lib/auth/route-guards";
import type { Role } from "~shared/contracts";

type AuthState = {
  user: SessionUser | null;
  role: Role | null;
  isLoading: boolean;
};

type AuthActions = {
  login: (user: SessionUser, token: string) => void;
  logout: () => void;
  setUser: (user: SessionUser | null) => void;
};

const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  const role = useMemo(() => getRole(user), [user]);

  const login = useCallback((u: SessionUser, token: string) => {
    setStoredUser(u);
    api.setAuthToken(token);
    setSessionCookie(u, token);
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    clearStoredUser();
    api.clearAuthToken();
    clearSessionCookie();
    setUserState(null);
  }, []);

  const setUser = useCallback((u: SessionUser | null) => {
    setUserState(u);
    if (u) setStoredUser(u);
    else clearStoredUser();
  }, []);

  const state = useMemo<AuthState>(
    () => ({ user, role, isLoading }),
    [user, role, isLoading]
  );
  const actions = useMemo<AuthActions>(
    () => ({ login, logout, setUser }),
    [login, logout, setUser]
  );

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuthState(): AuthState {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error("useAuthState must be used within AuthProvider");
  return ctx;
}

export function useAuthActions(): AuthActions {
  const ctx = useContext(AuthActionsContext);
  if (!ctx) throw new Error("useAuthActions must be used within AuthProvider");
  return ctx;
}

export function useAuth() {
  return { ...useAuthState(), ...useAuthActions() };
}

export function useRole(): Role | null {
  return useAuthState().role;
}

export function useNavItems() {
  const { role } = useAuthState();
  return getVisibleNavItems(role);
}

export function useCanAccessRoute(pathname: string): boolean {
  const { role } = useAuthState();
  return canAccessRoute(role, pathname);
}

export {
  getHomeForRole,
  canManageUser,
  canModerate,
  canSearchTeams,
  canSearchPlayers,
  canAccessMessages,
  canViewPlayerProfile,
  canViewTeamProfile,
};
