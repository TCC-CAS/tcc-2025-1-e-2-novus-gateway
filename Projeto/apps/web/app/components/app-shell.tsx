"use client";

import { Link, useLocation } from "react-router";
import {
  Home,
  User,
  Search,
  MessageCircle,
  Shield,
  ShieldAlert,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Crown,
  Zap,
} from "lucide-react";
import { useNavItems } from "~/lib/auth";
import { useAuth } from "~/lib/auth/auth-context";
import { usePlan } from "~/lib/plan";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import type { NavItem } from "~/lib/auth/permissions";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  user: User,
  search: Search,
  "message-circle": MessageCircle,
  shield: Shield,
  "shield-alert": ShieldAlert,
  users: Users,
  "layout-dashboard": LayoutDashboard,
};

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Home;
  return <Icon className={className} />;
}

function isActive(pathname: string, href: string) {
  if (href === "/jogador" || href === "/time" || href === "/admin") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const navItems = useNavItems();
  const { user, logout } = useAuth();
  const { planId, isPaid } = usePlan();
  const location = useLocation();

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <div className="flex min-h-dvh flex-col bg-background selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      {/* Desktop top bar */}
      <header className="sticky top-0 z-30 hidden border-b-4 border-foreground bg-primary md:block">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <Link
            to={navItems[0]?.href ?? "/"}
            className="font-display text-3xl tracking-wider text-foreground transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary-foreground">PRO</span>
          </Link>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const active = isActive(location.pathname, item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group relative flex items-center gap-2 border-2 px-4 py-2 font-display text-lg tracking-widest uppercase transition-all",
                    active
                      ? "border-foreground bg-foreground text-background shadow-[4px_4px_0px_0px_var(--color-background)] dark:shadow-[4px_4px_0px_0px_var(--color-primary)] -translate-y-1"
                      : "border-transparent text-foreground hover:border-foreground hover:bg-background hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)]",
                  )}
                >
                  <NavIcon
                    icon={item.icon}
                    className={cn(
                      "size-5",
                      active
                        ? "text-primary"
                        : "text-foreground group-hover:text-primary",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

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
              <div className="border-b-4 border-foreground bg-muted/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl tracking-wide uppercase text-foreground">
                    {user?.name}
                  </p>
                  <span className={`px-2 py-0.5 font-display text-[10px] tracking-widest ${isPaid() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-foreground/20"}`}>
                    {planId === "free" ? "FREE" : planId.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  {user?.email}
                </p>
              </div>
              <div className="p-2">
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-none font-bold tracking-widest uppercase focus:bg-primary focus:text-primary-foreground"
                >
                  <Link to="/planos" className="gap-3 py-3">
                    {isPaid() ? <Crown className="size-5 text-primary" /> : <Zap className="size-5 text-primary" />}
                    {isPaid() ? "MEU PLANO" : "FAZER UPGRADE"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-none font-bold tracking-widest uppercase focus:bg-primary focus:text-primary-foreground"
                >
                  <Link to="/configuracoes" className="gap-3 py-3">
                    <Settings className="size-5" />
                    CONFIGURAÇÕES
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-foreground/20" />
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
        </div>
      </header>

      {/* Mobile top bar (compact) */}
      <header className="sticky top-0 z-30 border-b-4 border-foreground bg-primary md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link
            to={navItems[0]?.href ?? "/"}
            className="font-display text-2xl tracking-wider text-foreground"
          >
            VÁRZEA<span className="text-primary-foreground">PRO</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="size-10 rounded-none border-2 border-foreground bg-background p-0 shadow-[2px_2px_0px_0px_var(--color-foreground)] dark:shadow-[2px_2px_0px_0px_var(--color-foreground)]"
              >
                <Avatar className="size-full rounded-none">
                  <AvatarFallback className="rounded-none bg-primary text-sm font-display text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-none border-4 border-foreground bg-background p-0 shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] mt-2"
            >
              <div className="border-b-4 border-foreground bg-muted/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl tracking-wide uppercase text-foreground">
                    {user?.name}
                  </p>
                  <span className={`px-2 py-0.5 font-display text-[10px] tracking-widest ${isPaid() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-foreground/20"}`}>
                    {planId === "free" ? "FREE" : planId.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase truncate">
                  {user?.email}
                </p>
              </div>
              <div className="p-2">
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-none font-bold tracking-widest uppercase focus:bg-primary focus:text-primary-foreground"
                >
                  <Link to="/planos" className="gap-3 py-3">
                    {isPaid() ? <Crown className="size-5 text-primary" /> : <Zap className="size-5 text-primary" />}
                    {isPaid() ? "MEU PLANO" : "UPGRADE"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-none font-bold tracking-widest uppercase focus:bg-primary focus:text-primary-foreground"
                >
                  <Link to="/configuracoes" className="gap-3 py-3">
                    <Settings className="size-5" />
                    CONFIGURAÇÕES
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-foreground/20" />
                <DropdownMenuItem
                  onSelect={logout}
                  className="cursor-pointer rounded-none font-bold tracking-widest uppercase text-destructive focus:bg-destructive focus:text-destructive-foreground"
                >
                  <div className="flex items-center gap-3 py-2 w-full">
                    <LogOut className="size-5" />
                    SAIR
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 pb-24 md:pb-8 pt-4 md:pt-8 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t-4 border-foreground bg-background md:hidden">
        <div className="flex h-16 items-stretch">
          {navItems.map((item) => {
            const active = isActive(location.pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-widest uppercase transition-colors border-r-2 border-foreground/20 last:border-r-0",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {active && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                )}
                <NavIcon
                  icon={item.icon}
                  className={cn(
                    "size-6",
                    active ? "text-primary" : "text-foreground",
                  )}
                />
                <span className="sr-only sm:not-sr-only sm:mt-1">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        {/* Safe area for iPhones with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background" />
      </nav>
    </div>
  );
}
