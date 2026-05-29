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
import type { Role } from "~shared/contracts"

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
  "log-in": LogIn,
}

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Home
  return <Icon className={className} />
}

// ------------------------------------------------------------------ //
// Public nav items (non-logged) — uses NavItem shape (icon string)    //
// ------------------------------------------------------------------ //
const PUBLIC_BOTTOM_NAV: NavItem[] = [
  { label: "Início", href: "/", icon: "home" },
  { label: "Times", href: "/times", icon: "shield" },
  { label: "Jogadores", href: "/jogadores", icon: "users" },
  { label: "Entrar", href: "/login", icon: "log-in" },
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

// ------------------------------------------------------------------ //
// Avatar dropdown — defined outside GlobalHeader to avoid recreation  //
// ------------------------------------------------------------------ //
function AvatarDropdown({
  userName,
  initials,
  role,
  isPaid,
  logout,
}: {
  userName: string | undefined
  initials: string
  role: Role | null
  isPaid: () => boolean
  logout: () => void
}) {
  return (
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
              {userName}
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

  // Both authenticated and public paths use NavItem[] shape
  const mobileNavItems: NavItem[] = user && role ? authNavItems : PUBLIC_BOTTOM_NAV

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
          {user && role && (
            <AvatarDropdown
              userName={user?.name}
              initials={initials}
              role={role}
              isPaid={isPaid}
              logout={logout}
            />
          )}
        </div>
      </header>

      {/* ---------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAV                                            */}
      {/* ---------------------------------------------------------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t-4 border-foreground bg-background md:hidden">
        <div className="flex h-16 items-stretch">
          {mobileNavItems.map((item) => {
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
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-background" />
      </nav>
    </>
  )
}
