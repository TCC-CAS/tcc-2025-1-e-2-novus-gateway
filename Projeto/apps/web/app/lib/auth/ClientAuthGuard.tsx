"use client";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import type { Role } from "~shared/contracts";
import { useAuth } from "~/lib/auth/auth-context";
import { getHomeForRole } from "~/lib/auth/permissions";

type ClientAuthGuardProps = {
  children: React.ReactNode;
  /** If set, redirect to role home when role doesn't match. */
  requiredRole?: Role;
};

/**
 * Client-side auth guard. Redirects to /login when not authenticated,
 * or to role home when requiredRole is set and user role doesn't match.
 */
export function ClientAuthGuard({ children, requiredRole }: ClientAuthGuardProps) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (!user) {
      const redirectTo = `/login?redirect=${encodeURIComponent(pathname)}`;
      navigate(redirectTo, { replace: true });
      return;
    }
    if (requiredRole && role !== requiredRole) {
      const home = getHomeForRole(role!);
      navigate(home, { replace: true });
    }
  }, [user, role, requiredRole, pathname, navigate]);

  if (!user) return null;
  if (requiredRole && role !== requiredRole) return null;
  return <>{children}</>;
}
