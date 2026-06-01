# Nav Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify public and authenticated navigation under a single `GlobalHeader` component, make `/times` and `/jogadores` auth-aware, and redirect deprecated search routes.

**Architecture:** `GlobalHeader` reads `useAuth()` + `usePlan()` and renders the correct desktop header + mobile bottom nav for every role/state. `AppShell` delegates its entire header/nav to `GlobalHeader`. Public listing pages (`/times`, `/jogadores`) branch on `role` to choose API + filters.

**Tech Stack:** React Router v7, React Query, `useAuth` / `usePlan` hooks, shadcn DropdownMenu/Avatar, lucide-react icons, Tailwind CSS v4 brutalist design.

---

## Key Types & Field Differences

```
ShowcasePlayer  → { id, name, photoUrl?, positions[], level?, region?, city? }
PlayerSummary   → { id, name, photoUrl?, positions[], skills[], availability?, region?, level? }
                  ↑ no `city`

ShowcaseTeam    → { id, name, logoUrl?, level, region?, city? }
PublicTeam      → ShowcaseTeam & { openPositions[] }
TeamSummary     → { id, name, logoUrl?, level, region?, openPositions[] }
                  ↑ no `city`
```

Cards must accept a union type with `city?` optional.

---

## File Map

| Action | File |
|--------|------|
| CREATE | `app/components/global-header.tsx` |
| MODIFY | `app/lib/auth/permissions.ts` |
| MODIFY | `app/components/app-shell.tsx` |
| MODIFY | `app/routes/_index.tsx` |
| MODIFY | `app/routes/times.tsx` |
| MODIFY | `app/routes/jogadores.tsx` |
| MODIFY | `app/routes/jogador/buscar-times.tsx` |
| MODIFY | `app/routes/time/buscar-jogadores.tsx` |

All paths relative to `Projeto/apps/web/`.

---

## Task 1: Update `permissions.ts` — new nav items + canAccessRoute

**Files:**
- Modify: `app/lib/auth/permissions.ts`

- [ ] Replace `PLAYER_NAV`, `TEAM_NAV`, and update `canAccessRoute`:

```ts
// app/lib/auth/permissions.ts
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
```

- [ ] Commit:

```bash
git add Projeto/apps/web/app/lib/auth/permissions.ts
git commit -m "refactor(web): update nav items and canAccessRoute for unified navigation"
```

---

## Task 2: Create `global-header.tsx`

**Files:**
- Create: `app/components/global-header.tsx`

- [ ] Write the full component:

```tsx
// app/components/global-header.tsx
"use client"

import { Link, useLocation } from "react-router"
import {
  Home,
  Shield,
  Users,
  MessageCircle,
  LayoutDashboard,
  ShieldAlert,
  LogIn,
  Settings,
  LogOut,
  Crown,
  Zap,
  User,
} from "lucide-react"
import { useAuth } from "~/lib/auth/auth-context"
import { usePlan } from "~/lib/plan"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import { cn } from "~/lib/utils"
import type { NavItem } from "~/lib/auth/permissions"

// ------------------------------------------------------------------ //
// Icon map for role-based NavItem[] (uses icon string keys)           //
// ------------------------------------------------------------------ //
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  shield: Shield,
  users: Users,
  "message-circle": MessageCircle,
  "layout-dashboard": LayoutDashboard,
  "shield-alert": ShieldAlert,
}

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Home
  return <Icon className={className} />
}

// ------------------------------------------------------------------ //
// Public nav items (non-logged)                                        //
// ------------------------------------------------------------------ //
const PUBLIC_BOTTOM_NAV = [
  { label: "Início", href: "/", Icon: Home },
  { label: "Times", href: "/times", Icon: Shield },
  { label: "Jogadores", href: "/jogadores", Icon: Users },
  { label: "Entrar", href: "/login", Icon: LogIn },
]

// ------------------------------------------------------------------ //
// Active helper                                                        //
// ------------------------------------------------------------------ //
function isActive(pathname: string, href: string): boolean {
  if (href === "/" || href === "/jogador" || href === "/time" || href === "/admin") {
    return pathname === href
  }
  return pathname.startsWith(href)
}

// ------------------------------------------------------------------ //
// Profile link helper by role                                          //
// ------------------------------------------------------------------ //
function profileHref(role: string | null): string {
  if (role === "player") return "/jogador/perfil"
  if (role === "team") return "/time/perfil"
  return "/admin"
}

export function GlobalHeader() {
  const { user, role, logout } = useAuth()
  const { isPaid } = usePlan()
  const location = useLocation()

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?"

  // ---------------------------------------------------------------- //
  // Resolve nav items for current role                                 //
  // ---------------------------------------------------------------- //
  const authNavItems: NavItem[] = (() => {
    if (!role) return []
    if (role === "player") return [
      { label: "Início", href: "/", icon: "home" },
      { label: "Times", href: "/times", icon: "shield" },
      { label: "Jogadores", href: "/jogadores", icon: "users" },
      { label: "Mensagens", href: "/jogador/mensagens", icon: "message-circle" },
    ]
    if (role === "team") return [
      { label: "Início", href: "/", icon: "home" },
      { label: "Times", href: "/times", icon: "shield" },
      { label: "Jogadores", href: "/jogadores", icon: "users" },
      { label: "Mensagens", href: "/time/mensagens", icon: "message-circle" },
    ]
    // admin
    return [
      { label: "Painel", href: "/admin", icon: "layout-dashboard" },
      { label: "Usuários", href: "/admin/usuarios", icon: "users" },
      { label: "Moderação", href: "/admin/moderation", icon: "shield-alert" },
    ]
  })()

  const mobileNavItems = user && role
    ? authNavItems
    : PUBLIC_BOTTOM_NAV.map((i) => ({ label: i.label, href: i.href, icon: "", _Icon: i.Icon }))

  // ---------------------------------------------------------------- //
  // Avatar dropdown                                                    //
  // ---------------------------------------------------------------- //
  const AvatarDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="size-12 rounded-none border-2 border-foreground bg-background p-0 shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-foreground)]"
        >
          <Avatar className="size-full rounded-none">
            <AvatarFallback className="rounded-none bg-primary text-lg font-display text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-none border-4 border-foreground bg-background p-0 shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)]"
      >
        {/* Header */}
        <div className="border-b-4 border-foreground bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-xl tracking-wide uppercase text-foreground truncate max-w-[130px]">
              {user?.name}
            </p>
            <span
              className={cn(
                "px-2 py-0.5 font-display text-[10px] tracking-widest",
                isPaid() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-foreground",
              )}
            >
              {isPaid() ? "PRO" : "FREE"}
            </span>
          </div>
        </div>

        <div className="p-2">
          {/* Perfil */}
          <DropdownMenuItem asChild className="cursor-pointer rounded-none font-bold tracking-widest uppercase focus:bg-primary focus:text-primary-foreground">
            <Link to={profileHref(role)} className="gap-3 py-3">
              <User className="size-5" />
              {role === "team" ? "MEU TIME" : "MEU PERFIL"}
            </Link>
          </DropdownMenuItem>

          {/* Planos */}
          <DropdownMenuItem asChild className="cursor-pointer rounded-none font-bold tracking-widest uppercase focus:bg-primary focus:text-primary-foreground">
            <Link to="/planos" className="gap-3 py-3">
              {isPaid() ? <Crown className="size-5 text-primary" /> : <Zap className="size-5 text-primary" />}
              {isPaid() ? "MEU PLANO" : "FAZER UPGRADE"}
            </Link>
          </DropdownMenuItem>

          {/* Configurações */}
          <DropdownMenuItem asChild className="cursor-pointer rounded-none font-bold tracking-widest uppercase focus:bg-primary focus:text-primary-foreground">
            <Link to="/configuracoes" className="gap-3 py-3">
              <Settings className="size-5" />
              CONFIGURAÇÕES
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-foreground/20" />

          {/* Sair */}
          <DropdownMenuItem
            onSelect={logout}
            className="cursor-pointer rounded-none font-bold tracking-widest uppercase text-destructive focus:bg-destructive focus:text-destructive-foreground"
          >
            <div className="flex items-center gap-3 py-2 w-full">
              <LogOut className="size-5" />
              SAIR DA CONTA
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      {/* ---------------------------------------------------------- */}
      {/* DESKTOP HEADER                                               */}
      {/* ---------------------------------------------------------- */}
      <header className="sticky top-0 z-30 hidden border-b-4 border-foreground bg-background md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link
            to={user && role ? (role === "admin" ? "/admin" : "/") : "/"}
            className="font-display text-2xl tracking-wider text-foreground transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-2">
            {user && role ? (
              /* Authenticated nav */
              authNavItems.map((item) => {
                const active = isActive(location.pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "group relative flex items-center gap-2 border-2 px-4 py-2 font-display text-lg tracking-widest uppercase transition-all",
                      active
                        ? "border-foreground bg-foreground text-background shadow-[4px_4px_0px_0px_var(--color-primary)] -translate-y-0.5"
                        : "border-transparent text-foreground hover:border-foreground hover:bg-foreground/5 hover:-translate-y-0.5",
                    )}
                  >
                    <NavIcon
                      icon={item.icon}
                      className={cn("size-4", active ? "text-primary" : "text-foreground group-hover:text-primary")}
                    />
                    {item.label}
                  </Link>
                )
              })
            ) : (
              /* Public nav */
              <>
                <Link to="/times" className={cn("font-display text-lg tracking-wide transition-colors hover:text-primary px-3 py-1.5", isActive(location.pathname, "/times") ? "text-primary border-b-2 border-primary" : "text-foreground")}>
                  TIMES
                </Link>
                <Link to="/jogadores" className={cn("font-display text-lg tracking-wide transition-colors hover:text-primary px-3 py-1.5", isActive(location.pathname, "/jogadores") ? "text-primary border-b-2 border-primary" : "text-foreground")}>
                  JOGADORES
                </Link>
                <Link to="/planos" className={cn("font-display text-lg tracking-wide transition-colors hover:text-primary px-3 py-1.5", isActive(location.pathname, "/planos") ? "text-primary border-b-2 border-primary" : "text-foreground")}>
                  PLANOS
                </Link>
                <Link to="/login" className="font-display text-lg tracking-wide text-foreground transition-colors hover:text-primary px-3 py-1.5">
                  ENTRAR
                </Link>
                <Button
                  asChild
                  className="rounded-none border-2 border-primary bg-primary px-5 font-display text-lg tracking-wider text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] hover:bg-primary ml-2"
                >
                  <Link to="/cadastro">JOGAR AGORA</Link>
                </Button>
              </>
            )}
          </nav>

          {/* Avatar dropdown (authenticated only) */}
          {user && role && <AvatarDropdown />}
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAV                                            */}
      {/* ---------------------------------------------------------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t-4 border-foreground bg-background md:hidden">
        <div className="flex h-16 items-stretch">
          {user && role
            ? authNavItems.map((item) => {
                const active = isActive(location.pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-widest uppercase transition-colors border-r-2 border-foreground/20 last:border-r-0",
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {active && <div className="absolute top-0 left-0 w-full h-1 bg-primary" />}
                    <NavIcon icon={item.icon} className={cn("size-6", active ? "text-primary" : "text-foreground")} />
                    <span className="sr-only sm:not-sr-only sm:mt-1">{item.label}</span>
                  </Link>
                )
              })
            : PUBLIC_BOTTOM_NAV.map((item) => {
                const active = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-widest uppercase transition-colors border-r-2 border-foreground/20 last:border-r-0",
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {active && <div className="absolute top-0 left-0 w-full h-1 bg-primary" />}
                    <item.Icon className={cn("size-6", active ? "text-primary" : "text-foreground")} />
                    <span className="sr-only sm:not-sr-only sm:mt-1">{item.label}</span>
                  </Link>
                )
              })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-background" />
      </nav>
    </>
  )
}
```

- [ ] Commit:

```bash
git add Projeto/apps/web/app/components/global-header.tsx
git commit -m "feat(web): add GlobalHeader component with auth-aware desktop nav and mobile bottom nav"
```

---

## Task 3: Simplify `app-shell.tsx`

**Files:**
- Modify: `app/components/app-shell.tsx`

- [ ] Replace entire file content — keep noise, remove all header/nav code, add `GlobalHeader`:

```tsx
// app/components/app-shell.tsx
"use client"

import { GlobalHeader } from "~/components/global-header"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      <GlobalHeader />

      <main className="flex-1 pb-20 md:pb-0 relative z-10">
        {children}
      </main>
    </div>
  )
}
```

- [ ] Commit:

```bash
git add Projeto/apps/web/app/components/app-shell.tsx
git commit -m "refactor(web): replace AppShell header/nav with GlobalHeader"
```

---

## Task 4: Simplify `_index.tsx`

**Files:**
- Modify: `app/routes/_index.tsx`

- [ ] Remove: `useNavigate`, `useEffect` redirect block, loading screen, `PublicNav` component definition, inline `<header>` element.
- [ ] Add: `<GlobalHeader />` at the top, keep everything else (hero, sections, footer, `PricingSection`).
- [ ] Remove `pb-20 md:pb-0` from outer div if present — `GlobalHeader` renders the mobile nav, so the home page only needs `pb-20 md:pb-0` on its outermost wrapper to avoid content hiding behind the fixed bottom nav.

The file becomes:

```tsx
// app/routes/_index.tsx  — only the diff shown; keep all sections intact
import { useState } from "react"               // remove useEffect
import { Link, useLocation } from "react-router" // remove useNavigate
import { useQuery } from "@tanstack/react-query"
import { publicApi, type ShowcaseTeam, type ShowcasePlayer } from "~/lib/api-client"
import { OptimizedImage } from "~/components/optimized-image"
import { Shield, Users } from "lucide-react"   // keep only what's used in content
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { GlobalHeader } from "~/components/global-header"

export function meta() {
  return [
    { title: "VárzeaPro - Conectando jogadores e times" },
    { name: "description", content: "Plataforma para conectar jogadores de futebol amador e times." },
  ]
}

export default function Index() {
  const { data: showcase } = useQuery({
    queryKey: ["public", "showcase"],
    queryFn: () => publicApi.showcase(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground pb-20 md:pb-0">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      <GlobalHeader />

      <main className="flex-1">
        {/* HERO SECTION — keep exactly as is */}
        {/* ... all sections unchanged ... */}
      </main>

      {/* Footer — keep exactly as is */}
    </div>
  )
}
```

**Important:** The actual edit is surgical — do NOT rewrite the entire file. Only:
1. Remove the `useEffect` import from `react`
2. Remove `useNavigate` from the `react-router` import
3. Remove `Home, Zap, LogIn, UserPlus, User` from lucide (only if unused elsewhere in file — check first)
4. Remove `useAuth` import (if used only for redirect)
5. Remove `getHomeForRole` import (only used for redirect)
6. Remove `const PUBLIC_NAV = [...]` definition
7. Remove `function PublicNav() { ... }` definition  
8. Remove the entire `useEffect(() => { if (user && role)... }, ...)` block
9. Remove the early-return loading screen `if (user && role) { return <div>ENTRANDO EM CAMPO...</div> }`
10. Remove the inline `<header>...</header>` element
11. Add `import { GlobalHeader } from "~/components/global-header"` to imports
12. Add `<GlobalHeader />` as first child inside the outer div (before `<main>`)
13. Remove `<PublicNav />` from bottom of JSX
14. Add `pb-20 md:pb-0` to the outermost div className

- [ ] After editing, verify that `useAuth` is truly unused — if the home page doesn't need auth state anymore, remove that import too. If any section still uses `user` or `role`, keep `useAuth`.

- [ ] Commit:

```bash
git add Projeto/apps/web/app/routes/_index.tsx
git commit -m "refactor(web): replace _index.tsx inline header with GlobalHeader, remove auth redirect"
```

---

## Task 5: Auth-aware `jogadores.tsx`

**Files:**
- Modify: `app/routes/jogadores.tsx`

- [ ] Replace entire file:

```tsx
// app/routes/jogadores.tsx
import { useState, useMemo, useEffect } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, searchApi, type ShowcasePlayer } from "~/lib/api-client"
import { useAuth } from "~/lib/auth/auth-context"
import { usePlan } from "~/lib/plan"
import { UpsellCard } from "~/lib/plan/plan-gate"
import { isUnlimited } from "~shared/contracts"
import { POSITIONS, PLAYER_LEVELS } from "~shared/contracts"
import type { PlayerSummary } from "~shared/contracts"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { OptimizedImage } from "~/components/optimized-image"
import { GlobalHeader } from "~/components/global-header"
import {
  MapPin,
  Users,
  ArrowRight,
  Search as SearchIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export function meta() {
  return [{ title: "Jogadores - VárzeaPro" }]
}

// Union of ShowcasePlayer + PlayerSummary — city is optional in both
type CardPlayer = {
  id: string
  name: string
  photoUrl?: string | null
  positions: string[]
  level?: string | null
  region?: string | null
  city?: string | null
}

function PlayerCardSkeleton() {
  return (
    <div className="border-2 border-foreground bg-muted animate-pulse">
      <div className="aspect-[2/3] bg-foreground/10 relative overflow-hidden">
        <div className="absolute top-2 left-2 h-4 w-12 bg-primary/20" />
        <div className="absolute top-2 right-2 h-4 w-10 bg-foreground/20" />
        <div className="absolute bottom-4 left-3 right-3 space-y-1.5">
          <div className="h-5 bg-background/30 w-4/5" />
          <div className="h-3 bg-background/20 w-3/5" />
        </div>
      </div>
      <div className="px-3 py-2 border-t border-foreground/10 flex items-center justify-between">
        <div className="h-3 w-14 bg-foreground/20" />
        <div className="h-3 w-3 bg-foreground/20" />
      </div>
    </div>
  )
}

function PlayerCard({ player }: { player: CardPlayer }) {
  return (
    <Link
      to={`/jogadores/${player.id}`}
      className="group block border-2 border-foreground bg-background cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        {player.photoUrl ? (
          <OptimizedImage
            src={player.photoUrl}
            alt={player.name}
            className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center bg-foreground/5 gap-3">
            <Users className="size-14 text-foreground/15" />
            <span className="font-display text-[9px] tracking-[0.25em] uppercase text-foreground/25">Sem foto</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-foreground/95 via-foreground/50 to-transparent" />
        {player.positions.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-4.5rem)]">
            {player.positions.slice(0, 2).map((pos) => (
              <span key={pos} className="bg-primary text-primary-foreground font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
                {pos}
              </span>
            ))}
          </div>
        )}
        {player.level && (
          <span className="absolute top-2 right-2 bg-background border-2 border-foreground font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black text-foreground leading-none">
            {player.level}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-display text-base leading-tight tracking-wide text-background font-black uppercase truncate drop-shadow-sm">
            {player.name}
          </p>
          {(player.city || player.region) && (
            <p className="flex items-center gap-1 text-background/65 text-[10px] font-bold tracking-wide mt-0.5">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{[player.city, player.region].filter(Boolean).join(", ")}</span>
            </p>
          )}
        </div>
      </div>
      <div className="px-3 py-2 flex items-center justify-between border-t-2 border-foreground/10 group-hover:border-primary transition-colors duration-200">
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Ver perfil</span>
        <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </Link>
  )
}

export default function JogadoresPublicos() {
  const { user, role } = useAuth()
  const isLoggedIn = !!user && !!role

  // Shared filters
  const [region, setRegion] = useState("")
  const [page, setPage] = useState(1)

  // Logged-in filters
  const [position, setPosition] = useState<string | undefined>(undefined)
  const [skills, setSkills] = useState("")
  const [level, setLevel] = useState<string | undefined>(undefined)

  // Public filter state (applied on form submit)
  const [regionFilter, setRegionFilter] = useState("")

  // Plan gating (only relevant when logged in)
  const { getSearchResultsLimit } = usePlan()
  const searchLimit = getSearchResultsLimit()
  const isLimited = !isUnlimited(searchLimit)

  // ---------------------------------------------------------------- //
  // Public query                                                       //
  // ---------------------------------------------------------------- //
  const { data: publicData, isLoading: publicLoading } = useQuery({
    queryKey: ["public", "players", { page, region: regionFilter }],
    queryFn: () => publicApi.players({ page, pageSize: 12, region: regionFilter || undefined }),
    enabled: !isLoggedIn,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  // ---------------------------------------------------------------- //
  // Authenticated query                                                //
  // ---------------------------------------------------------------- //
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search", "players", { position, skills, region, level, page }],
    queryFn: () =>
      searchApi.players({
        page,
        pageSize: 12,
        order: "asc",
        position: position as import("~shared/contracts").Position | undefined,
        skills: skills || undefined,
        region: region || undefined,
        level: level as import("~shared/contracts").PlayerLevel | undefined,
      }),
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const isLoading = isLoggedIn ? searchLoading : publicLoading
  const rawData = isLoggedIn ? searchData : publicData

  const visiblePlayers = useMemo<CardPlayer[]>(() => {
    if (!rawData) return []
    const players = rawData.data as CardPlayer[]
    if (isLoggedIn && isLimited) return players.slice(0, searchLimit)
    return players
  }, [rawData, isLoggedIn, isLimited, searchLimit])

  const hiddenCount = (rawData?.data.length ?? 0) - visiblePlayers.length

  function handlePublicSearch(e: React.FormEvent) {
    e.preventDefault()
    setRegionFilter(region)
    setPage(1)
  }

  function resetFilters() {
    setRegion("")
    setRegionFilter("")
    setPosition(undefined)
    setSkills("")
    setLevel(undefined)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <GlobalHeader />

      <main>
        {/* HERO */}
        <section className="border-b-[8px] border-primary bg-foreground px-6 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <p className="font-display text-sm tracking-[0.35em] text-primary uppercase mb-3">Descubra talentos</p>
              <h1 className="font-display leading-[0.85] tracking-tight text-background text-[14vw] md:text-[9vw] lg:text-[7vw]">
                DESCUBRA
                <br />
                <span className="text-transparent [-webkit-text-stroke:2px_var(--color-primary)]">JOGADORES</span>
              </h1>
            </div>
            <p className="max-w-sm border-l-4 border-primary pl-5 text-lg font-medium leading-relaxed text-background/65 md:text-right md:border-l-0 md:border-r-4 md:pr-5 md:pl-0">
              Encontre o talento certo para o seu time. Filtre por posição, região e nível.
            </p>
          </div>
        </section>

        {/* FILTERS */}
        <section className="border-b-4 border-foreground bg-background px-6 py-4">
          <div className="mx-auto max-w-7xl">
            {isLoggedIn ? (
              /* Authenticated: full filters (no submit button — reactive) */
              <div className="flex flex-wrap items-center gap-3 bg-background border-4 border-foreground p-2 shadow-[4px_4px_0px_0px_var(--color-primary)]">
                <div className="flex items-center gap-2 pl-2">
                  <Filter className="size-5 text-foreground" />
                  <span className="font-display text-sm tracking-widest text-foreground uppercase hidden sm:inline">FILTROS:</span>
                </div>
                <Select value={position ?? "all"} onValueChange={(v) => { setPosition(v === "all" ? undefined : v); setPage(1) }}>
                  <SelectTrigger className="w-[140px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="POSIÇÃO" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODAS</SelectItem>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p} value={p} className="font-bold tracking-widest uppercase text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="HABILIDADES"
                  value={skills}
                  onChange={(e) => { setSkills(e.target.value); setPage(1) }}
                  className="w-[160px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus-visible:ring-0 focus:border-primary placeholder:normal-case"
                />
                <Input
                  placeholder="REGIÃO"
                  value={region}
                  onChange={(e) => { setRegion(e.target.value); setPage(1) }}
                  className="w-[130px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus-visible:ring-0 focus:border-primary placeholder:normal-case"
                />
                <Select value={level ?? "all"} onValueChange={(v) => { setLevel(v === "all" ? undefined : v); setPage(1) }}>
                  <SelectTrigger className="w-[130px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="NÍVEL" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
                    {PLAYER_LEVELS.map((l) => (
                      <SelectItem key={l} value={l} className="font-bold tracking-widest uppercase text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(position || skills || region || level) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase h-10 hover:bg-muted"
                    onClick={resetFilters}
                  >
                    LIMPAR
                  </Button>
                )}
              </div>
            ) : (
              /* Public: region only, submit-based */
              <form onSubmit={handlePublicSearch} className="flex flex-wrap gap-2">
                <Input
                  placeholder="Filtrar por região..."
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="max-w-sm rounded-none border-2 border-foreground font-display tracking-wide focus-visible:ring-0 focus-visible:border-primary transition-colors"
                />
                <Button type="submit" className="rounded-none border-2 border-foreground bg-foreground px-5 font-display tracking-widest text-background transition-all hover:bg-primary hover:border-primary hover:-translate-y-0.5">
                  <SearchIcon className="size-4 mr-2" />
                  BUSCAR
                </Button>
                {regionFilter && (
                  <Button type="button" variant="outline" className="rounded-none border-2 border-foreground font-display text-sm tracking-widest hover:bg-muted" onClick={resetFilters}>
                    LIMPAR
                  </Button>
                )}
              </form>
            )}
          </div>
        </section>

        {/* GRID */}
        <section className="px-6 py-10">
          <div className="mx-auto max-w-7xl">
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <PlayerCardSkeleton key={i} />)}
              </div>
            )}

            {!isLoading && visiblePlayers.length === 0 && (
              <div className="border-4 border-foreground p-16 text-center">
                <Users className="size-16 text-foreground/15 mx-auto mb-4" />
                <p className="font-display text-2xl tracking-widest text-foreground uppercase">Nenhum jogador encontrado</p>
                <p className="text-muted-foreground mt-2">Tente ajustar os filtros</p>
                <Button variant="outline" className="mt-6 rounded-none border-2 border-foreground font-display tracking-widest hover:bg-muted" onClick={resetFilters}>
                  VER TODOS
                </Button>
              </div>
            )}

            {visiblePlayers.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="font-display text-xs tracking-[0.25em] text-muted-foreground uppercase">
                    <span className="text-foreground font-black text-sm">{rawData?.meta.total ?? visiblePlayers.length}</span>{" "}jogadores encontrados
                  </p>
                  {rawData && rawData.meta.totalPages > 1 && (
                    <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                      Pg. {page}/{rawData.meta.totalPages}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {visiblePlayers.map((player) => <PlayerCard key={player.id} player={player} />)}
                </div>

                {/* Upsell when plan limits results */}
                {hiddenCount > 0 && (
                  <div className="mt-8">
                    <UpsellCard
                      title={`+${hiddenCount} JOGADORES DISPONÍVEIS`}
                      description={`Seu plano mostra apenas ${searchLimit} resultados por busca. Desbloqueie todos os jogadores com o plano TITULAR.`}
                      planName="TITULAR"
                    />
                  </div>
                )}

                {/* Pagination */}
                {rawData && rawData.meta.totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="size-4 mr-1" />
                      ANTERIOR
                    </Button>
                    <div className="border-2 border-foreground px-5 py-2 font-display text-sm tracking-widest bg-foreground text-background">
                      {page} / {rawData.meta.totalPages}
                    </div>
                    <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === rawData.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                      PRÓXIMO
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* CTA (non-logged only) */}
        {!isLoggedIn && (
          <section className="border-t-4 border-foreground bg-foreground px-6 py-16">
            <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <p className="font-display text-sm tracking-[0.3em] text-primary uppercase mb-2">Pronto para jogar?</p>
                <h2 className="font-display text-[8vw] md:text-[4vw] leading-[0.9] text-background font-black uppercase">CRIE SEU PERFIL</h2>
                <p className="mt-4 text-background/60 font-medium">Conecte-se a times e jogadores da sua região — grátis.</p>
              </div>
              <Button asChild size="lg" className="h-auto rounded-none bg-primary border-2 border-primary px-10 py-5 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-background)]">
                <Link to="/cadastro">CRIAR CONTA GRÁTIS</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
```

- [ ] Commit:

```bash
git add Projeto/apps/web/app/routes/jogadores.tsx
git commit -m "feat(web): make /jogadores auth-aware — public region filter vs authenticated full filters with plan gating"
```

---

## Task 6: Auth-aware `times.tsx`

**Files:**
- Modify: `app/routes/times.tsx`

- [ ] Replace entire file:

```tsx
// app/routes/times.tsx
import { useState, useEffect } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, searchApi, playersApi, type PublicTeam } from "~/lib/api-client"
import { useAuth } from "~/lib/auth/auth-context"
import { TEAM_LEVELS, POSITIONS } from "~shared/contracts"
import type { TeamSummary } from "~shared/contracts"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { OptimizedImage } from "~/components/optimized-image"
import { GlobalHeader } from "~/components/global-header"
import {
  MapPin,
  Shield,
  ArrowRight,
  Search as SearchIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export function meta() {
  return [{ title: "Times - VárzeaPro" }]
}

// Union of PublicTeam (has city) + TeamSummary (no city)
type CardTeam = {
  id: string
  name: string
  logoUrl?: string | null
  level: string
  region?: string | null
  city?: string | null
  openPositions: string[]
}

function TeamCardSkeleton() {
  return (
    <div className="border-2 border-foreground animate-pulse">
      <div className="aspect-[4/3] bg-foreground/10 flex items-center justify-center relative">
        <div className="size-20 bg-foreground/15 rounded-sm" />
        <div className="absolute top-2 right-2 h-4 w-12 bg-foreground/20" />
      </div>
      <div className="p-4 border-t-2 border-foreground/10 space-y-2">
        <div className="h-4 bg-foreground/20 w-3/4" />
        <div className="h-3 bg-foreground/10 w-1/2" />
        <div className="flex gap-1 mt-2">
          <div className="h-5 w-14 bg-primary/15" />
          <div className="h-5 w-16 bg-primary/15" />
        </div>
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: CardTeam }) {
  return (
    <Link
      to={`/times/${team.id}`}
      className="group block border-2 border-foreground bg-background cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-foreground/5 flex items-center justify-center border-b-2 border-foreground/10 group-hover:border-primary transition-colors duration-200">
        {team.logoUrl ? (
          <OptimizedImage src={team.logoUrl} alt={team.name} className="size-28 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md" />
        ) : (
          <Shield className="size-16 text-foreground/15 group-hover:text-foreground/30 transition-colors duration-200" />
        )}
        <span className="absolute top-2 right-2 bg-foreground text-background font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
          {team.level}
        </span>
      </div>
      <div className="p-3">
        <p className="font-display font-black uppercase text-sm tracking-wide leading-tight truncate transition-colors duration-200 group-hover:text-primary">
          {team.name}
        </p>
        {(team.city || team.region) && (
          <p className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold tracking-wide mt-0.5">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{[team.city, team.region].filter(Boolean).join(", ")}</span>
          </p>
        )}
        {team.openPositions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {team.openPositions.slice(0, 3).map((pos) => (
              <span key={pos} className="border border-primary/40 bg-primary/8 text-primary font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
                {pos}
              </span>
            ))}
            {team.openPositions.length > 3 && (
              <span className="text-muted-foreground font-display text-[8px] tracking-widest uppercase px-1 py-0.5 leading-none">
                +{team.openPositions.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-3 py-2 flex items-center justify-between border-t-2 border-foreground/10 group-hover:border-primary transition-colors duration-200">
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Ver time</span>
        <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </Link>
  )
}

export default function TimesPublicos() {
  const { user, role } = useAuth()
  const isLoggedIn = !!user && !!role

  // Shared
  const [region, setRegion] = useState("")
  const [page, setPage] = useState(1)

  // Logged-in filters
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [openPosition, setOpenPosition] = useState<string | undefined>(undefined)

  // Public filter (submit-based)
  const [regionFilter, setRegionFilter] = useState("")

  // Auto-fill position from player profile when role === "player"
  const { data: myProfile } = useQuery({
    queryKey: ["myPlayerProfile"],
    queryFn: () => playersApi.getMe(),
    enabled: isLoggedIn && role === "player",
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  useEffect(() => {
    if (myProfile?.positions?.length && !openPosition) {
      setOpenPosition(myProfile.positions[0])
    }
  }, [myProfile, openPosition])

  // ---------------------------------------------------------------- //
  // Public query                                                       //
  // ---------------------------------------------------------------- //
  const { data: publicData, isLoading: publicLoading } = useQuery({
    queryKey: ["public", "teams", { page, region: regionFilter }],
    queryFn: () => publicApi.teams({ page, pageSize: 12, region: regionFilter || undefined }),
    enabled: !isLoggedIn,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  // ---------------------------------------------------------------- //
  // Authenticated query                                                //
  // ---------------------------------------------------------------- //
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search", "teams", { level, region, openPosition, page }],
    queryFn: () =>
      searchApi.teams({
        page,
        pageSize: 12,
        order: "asc",
        level: level as "amador" | "recreativo" | "semi-profissional" | "outro" | undefined,
        region: region || undefined,
        openPosition: openPosition || undefined,
      }),
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const isLoading = isLoggedIn ? searchLoading : publicLoading
  const rawData = isLoggedIn ? searchData : publicData
  const teams: CardTeam[] = (rawData?.data ?? []) as CardTeam[]

  function handlePublicSearch(e: React.FormEvent) {
    e.preventDefault()
    setRegionFilter(region)
    setPage(1)
  }

  function resetFilters() {
    setRegion("")
    setRegionFilter("")
    setLevel(undefined)
    setOpenPosition(undefined)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <GlobalHeader />

      <main>
        {/* HERO */}
        <section className="border-b-[8px] border-primary bg-foreground px-6 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <p className="font-display text-sm tracking-[0.35em] text-primary uppercase mb-3">Encontre seu time</p>
              <h1 className="font-display leading-[0.85] tracking-tight text-background text-[14vw] md:text-[9vw] lg:text-[7vw]">
                ENCONTRE
                <br />
                <span className="text-transparent [-webkit-text-stroke:2px_var(--color-primary)]">TIMES</span>
              </h1>
            </div>
            <p className="max-w-sm border-l-4 border-primary pl-5 text-lg font-medium leading-relaxed text-background/65 md:text-right md:border-l-0 md:border-r-4 md:pr-5 md:pl-0">
              Times que buscam jogadores comprometidos. Filtre por região e encontre onde jogar.
            </p>
          </div>
        </section>

        {/* FILTERS */}
        <section className="border-b-4 border-foreground bg-background px-6 py-4">
          <div className="mx-auto max-w-7xl">
            {isLoggedIn ? (
              <div className="flex flex-wrap items-center gap-3 bg-background border-4 border-foreground p-2 shadow-[4px_4px_0px_0px_var(--color-primary)]">
                <div className="flex items-center gap-2 pl-2">
                  <Filter className="size-5 text-foreground" />
                  <span className="font-display text-sm tracking-widest text-foreground uppercase hidden sm:inline">FILTROS:</span>
                </div>
                <Select value={level ?? "all"} onValueChange={(v) => { setLevel(v === "all" ? undefined : v); setPage(1) }}>
                  <SelectTrigger className="w-[160px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="NÍVEL" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
                    {TEAM_LEVELS.map((l) => (
                      <SelectItem key={l} value={l} className="font-bold tracking-widest uppercase text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="REGIÃO"
                  value={region}
                  onChange={(e) => { setRegion(e.target.value); setPage(1) }}
                  className="w-[130px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus-visible:ring-0 focus:border-primary placeholder:normal-case"
                />
                <Select value={openPosition ?? "all"} onValueChange={(v) => { setOpenPosition(v === "all" ? undefined : v); setPage(1) }}>
                  <SelectTrigger className="w-[160px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="POSIÇÃO ABERTA" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODAS</SelectItem>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p} value={p} className="font-bold tracking-widest uppercase text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(level || region || openPosition) && (
                  <Button type="button" variant="outline" size="sm" className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase h-10 hover:bg-muted" onClick={resetFilters}>
                    LIMPAR
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handlePublicSearch} className="flex flex-wrap gap-2">
                <Input
                  placeholder="Filtrar por região..."
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="max-w-sm rounded-none border-2 border-foreground font-display tracking-wide focus-visible:ring-0 focus-visible:border-primary transition-colors"
                />
                <Button type="submit" className="rounded-none border-2 border-foreground bg-foreground px-5 font-display tracking-widest text-background transition-all hover:bg-primary hover:border-primary hover:-translate-y-0.5">
                  <SearchIcon className="size-4 mr-2" />
                  BUSCAR
                </Button>
                {regionFilter && (
                  <Button type="button" variant="outline" className="rounded-none border-2 border-foreground font-display text-sm tracking-widest hover:bg-muted" onClick={resetFilters}>
                    LIMPAR
                  </Button>
                )}
              </form>
            )}
          </div>
        </section>

        {/* GRID */}
        <section className="px-6 py-10">
          <div className="mx-auto max-w-7xl">
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => <TeamCardSkeleton key={i} />)}
              </div>
            )}

            {!isLoading && teams.length === 0 && (
              <div className="border-4 border-foreground p-16 text-center">
                <Shield className="size-16 text-foreground/15 mx-auto mb-4" />
                <p className="font-display text-2xl tracking-widest text-foreground uppercase">Nenhum time encontrado</p>
                <p className="text-muted-foreground mt-2">Tente ajustar os filtros</p>
                <Button variant="outline" className="mt-6 rounded-none border-2 border-foreground font-display tracking-widest hover:bg-muted" onClick={resetFilters}>
                  VER TODOS
                </Button>
              </div>
            )}

            {teams.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="font-display text-xs tracking-[0.25em] text-muted-foreground uppercase">
                    <span className="text-foreground font-black text-sm">{rawData?.meta.total ?? teams.length}</span>{" "}times encontrados
                  </p>
                  {rawData && rawData.meta.totalPages > 1 && (
                    <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                      Pg. {page}/{rawData.meta.totalPages}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {teams.map((team) => <TeamCard key={team.id} team={team} />)}
                </div>
                {rawData && rawData.meta.totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="size-4 mr-1" />
                      ANTERIOR
                    </Button>
                    <div className="border-2 border-foreground px-5 py-2 font-display text-sm tracking-widest bg-foreground text-background">
                      {page} / {rawData.meta.totalPages}
                    </div>
                    <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === rawData.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                      PRÓXIMO
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* CTA (non-logged only) */}
        {!isLoggedIn && (
          <section className="border-t-4 border-foreground bg-foreground px-6 py-16">
            <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <p className="font-display text-sm tracking-[0.3em] text-primary uppercase mb-2">Pronto para competir?</p>
                <h2 className="font-display text-[8vw] md:text-[4vw] leading-[0.9] text-background font-black uppercase">CADASTRE<br />SEU TIME</h2>
                <p className="mt-4 text-background/60 font-medium">Junte-se a centenas de times na plataforma — grátis.</p>
              </div>
              <Button asChild size="lg" className="h-auto rounded-none bg-primary border-2 border-primary px-10 py-5 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-background)]">
                <Link to="/cadastro">CRIAR CONTA</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
```

- [ ] Commit:

```bash
git add Projeto/apps/web/app/routes/times.tsx
git commit -m "feat(web): make /times auth-aware — public region filter vs authenticated full filters (level, region, openPosition)"
```

---

## Task 7: Redirect deprecated search routes

**Files:**
- Modify: `app/routes/jogador/buscar-times.tsx`
- Modify: `app/routes/time/buscar-jogadores.tsx`

- [ ] Replace `jogador/buscar-times.tsx`:

```tsx
import { Navigate } from "react-router"

export default function Redirect() {
  return <Navigate to="/times" replace />
}
```

- [ ] Replace `time/buscar-jogadores.tsx`:

```tsx
import { Navigate } from "react-router"

export default function Redirect() {
  return <Navigate to="/jogadores" replace />
}
```

- [ ] Commit:

```bash
git add Projeto/apps/web/app/routes/jogador/buscar-times.tsx Projeto/apps/web/app/routes/time/buscar-jogadores.tsx
git commit -m "refactor(web): redirect /jogador/buscar-times → /times and /time/buscar-jogadores → /jogadores"
```

---

## Task 8: TypeScript verification

**Files:** none (verification only)

- [ ] Run typecheck:

```bash
cd Projeto/apps/web && bun run typecheck 2>&1 | head -80
```

- [ ] Fix any errors. Common issues to watch for:

**A. `useAuth` missing in `_index.tsx`** — if removed but `showcase` query still there, that's fine. If any other section uses `user`, re-add `useAuth`.

**B. `PlayerSummary` missing `city`** — already handled by `CardPlayer` union type with `city?: string | null`.

**C. `TeamSummary` missing `city`** — already handled by `CardTeam` union type.

**D. `publicApi` not exported from `api-client`** — check import path. It's `import { publicApi } from "~/lib/api-client"`.

**E. `searchApi` type mismatch** — `searchApi.players` expects `SearchPlayersQuery`; double-check field names match.

**F. `isUnlimited` import** — `import { isUnlimited } from "~shared/contracts"` — verify this is exported from the contracts index.

- [ ] After all errors fixed, run again:

```bash
cd Projeto/apps/web && bun run typecheck 2>&1 | tail -5
```

Expected: `0 errors` or only pre-existing unrelated errors.

- [ ] Commit any TS fixes:

```bash
git add -p
git commit -m "fix(web): resolve TypeScript errors after nav unification"
```

---

## Spec Coverage Check

| Requirement | Task |
|---|---|
| `global-header.tsx` — desktop + mobile nav | Task 2 |
| Desktop: public links + ENTRAR + JOGAR AGORA | Task 2 |
| Desktop: player nav (/, /times, /jogadores, mensagens) | Task 2 |
| Desktop: team nav (same + team messages) | Task 2 |
| Desktop: admin nav (painel, usuários, moderação) | Task 2 |
| Avatar dropdown (perfil, planos, config, sair) | Task 2 |
| Mobile bottom nav all roles | Task 2 |
| `_index.tsx` — remove redirect + loading screen | Task 4 |
| `_index.tsx` — use GlobalHeader | Task 4 |
| `times.tsx` — public: region filter only | Task 6 |
| `times.tsx` — logado: full filters + auto-fill position | Task 6 |
| `jogadores.tsx` — public: region filter only | Task 5 |
| `jogadores.tsx` — logado: full filters + plan gating + UpsellCard | Task 5 |
| `app-shell.tsx` — delegate to GlobalHeader | Task 3 |
| `permissions.ts` — update PLAYER_NAV, TEAM_NAV, canAccessRoute | Task 1 |
| `buscar-times.tsx` → redirect `/times` | Task 7 |
| `buscar-jogadores.tsx` → redirect `/jogadores` | Task 7 |
| Dashboards `/jogador` and `/time` untouched | ✅ (not in scope) |
| Backend/API/contracts unchanged | ✅ (not in scope) |
| TypeScript clean | Task 8 |
