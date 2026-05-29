import type { Role, SessionUser } from "~shared/contracts";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const ROLE_HOMES: Record<Role, string> = {
  player: "/jogador",
  team: "/time",
  admin: "/admin",
};

const PLAYER_NAV: NavItem[] = [
  { label: "Início", href: "/", icon: "home" },
  { label: "Times", href: "/times", icon: "shield" },
  { label: "Jogadores", href: "/jogadores", icon: "users" },
  { label: "Mensagens", href: "/jogador/mensagens", icon: "message-circle" },
];

const TEAM_NAV: NavItem[] = [
  { label: "Início", href: "/", icon: "home" },
  { label: "Times", href: "/times", icon: "shield" },
  { label: "Jogadores", href: "/jogadores", icon: "users" },
  { label: "Mensagens", href: "/time/mensagens", icon: "message-circle" },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Painel", href: "/admin", icon: "layout-dashboard" },
  { label: "Usuários", href: "/admin/usuarios", icon: "users" },
  { label: "Moderação", href: "/admin/moderation", icon: "shield-alert" },
];

export function getRole(user: SessionUser | null): Role | null {
  if (!user) return null;
  return user.role;
}

export function getHomeForRole(role: Role): string {
  return ROLE_HOMES[role];
}

export function canAccessRoute(role: Role | null, pathname: string): boolean {
  if (pathname.startsWith("/planos")) return true;
  if (!role) {
    return (
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/cadastro") ||
      pathname.startsWith("/recuperar-senha") ||
      pathname === "/times" ||
      pathname.startsWith("/times/") ||
      pathname === "/jogadores" ||
      pathname.startsWith("/jogadores/")
    );
  }
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (role === "player") {
    return (
      normalized === "/" ||
      normalized === "/times" ||
      normalized.startsWith("/times/") ||
      normalized === "/jogadores" ||
      normalized.startsWith("/jogadores/") ||
      normalized === "/jogador" ||
      normalized.startsWith("/jogador/") ||
      normalized === "/configuracoes"
    );
  }
  if (role === "team") {
    return (
      normalized === "/" ||
      normalized === "/times" ||
      normalized.startsWith("/times/") ||
      normalized === "/jogadores" ||
      normalized.startsWith("/jogadores/") ||
      normalized === "/time" ||
      normalized.startsWith("/time/") ||
      normalized === "/configuracoes"
    );
  }
  if (role === "admin") {
    return normalized === "/admin" || normalized.startsWith("/admin/");
  }
  return false;
}

export function getVisibleNavItems(role: Role | null): NavItem[] {
  if (!role) return [];
  if (role === "player") return PLAYER_NAV;
  if (role === "team") return TEAM_NAV;
  if (role === "admin") return ADMIN_NAV;
  return [];
}

export function canViewPlayerProfile(role: Role | null): boolean {
  return role === "player" || role === "team" || role === "admin";
}

export function canViewTeamProfile(role: Role | null): boolean {
  return role === "player" || role === "team" || role === "admin";
}

export function canManageUser(role: Role | null): boolean {
  return role === "admin";
}

export function canModerate(role: Role | null): boolean {
  return role === "admin";
}

export function canSearchPlayers(role: Role | null): boolean {
  return role === "team" || role === "admin";
}

export function canSearchTeams(role: Role | null): boolean {
  return role === "player" || role === "admin";
}

export function canAccessMessages(role: Role | null): boolean {
  return role === "player" || role === "team";
}
