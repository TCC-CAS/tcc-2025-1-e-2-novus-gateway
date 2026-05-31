import { useMemo } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "~/lib/auth/auth-context"
import { usePlan } from "~/lib/plan"
import { PlanGate, UpsellCard } from "~/lib/plan/plan-gate"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { OptimizedImage } from "~/components/optimized-image"
import {
  searchApi,
  playersApi,
  matchInvitesApi,
  connectionsApi,
  type ProfileView,
} from "~/lib/api-client"
import { PLAN_CONFIGS } from "~shared/contracts"
import type { TeamSummary, PlayerMatchInvite } from "~shared/contracts"
import {
  ArrowRight,
  Search,
  MessageCircle,
  Trophy,
  Eye,
  BadgeCheck,
  Crown,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Users,
  Link2,
  Target,
  Sparkles,
  ChevronRight,
  User,
} from "lucide-react"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Início - VárzeaPro" }]
}

// ----------------------------------------------------------------
// Plan Badge
// ----------------------------------------------------------------
function PlanBadge() {
  const { planId } = usePlan()
  const config = PLAN_CONFIGS[planId]
  const isPaid = planId !== "free"

  return (
    <Link
      to="/planos"
      className={cn(
        "flex items-center gap-1.5 border-2 px-3 py-1.5 font-display text-[10px] tracking-widest uppercase transition-all hover:-translate-y-0.5",
        isPaid
          ? "border-primary bg-primary text-primary-foreground hover:shadow-[3px_3px_0px_0px_var(--color-foreground)]"
          : "border-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
      )}
    >
      {isPaid && <Crown className="size-3" />}
      {config?.name ?? "LIVRE"}
    </Link>
  )
}

// ----------------------------------------------------------------
// KPI Card
// ----------------------------------------------------------------
function KpiCard({
  label,
  value,
  to,
  accent = false,
  loading = false,
}: {
  label: string
  value: string | number
  to: string
  accent?: boolean
  loading?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col justify-between border-2 p-4 transition-all hover:-translate-y-0.5",
        accent
          ? "border-primary bg-primary/10 hover:bg-primary/20 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          : "border-foreground bg-background hover:shadow-[4px_4px_0px_0px_var(--color-foreground)]"
      )}
    >
      <span
        className={cn(
          "font-display text-xs tracking-widest uppercase",
          accent ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-10 rounded-none bg-muted/50" />
      ) : (
        <span
          className={cn(
            "font-display text-5xl font-black leading-none mt-1 transition-colors",
            accent
              ? "text-primary group-hover:text-foreground"
              : "text-foreground group-hover:text-primary"
          )}
        >
          {value}
        </span>
      )}
    </Link>
  )
}

// ----------------------------------------------------------------
// Invite Status Icon
// ----------------------------------------------------------------
function InviteStatusIcon({ status }: { status: string }) {
  if (status === "accepted") return <CheckCircle className="size-4 text-primary shrink-0" />
  if (status === "declined") return <XCircle className="size-4 text-destructive shrink-0" />
  return <Clock className="size-4 text-muted-foreground shrink-0" />
}

// ----------------------------------------------------------------
// Pending Invites Panel
// ----------------------------------------------------------------
function ConvitesPanel({
  invites,
  loading,
}: {
  invites: PlayerMatchInvite[]
  loading: boolean
}) {
  const pending = invites.filter((i) => i.status === "pending")

  if (loading) {
    return (
      <div className="h-full min-h-[160px] border-2 border-foreground p-5 space-y-3">
        <Skeleton className="h-3 w-28 rounded-none bg-muted/50" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none bg-muted/50" />
        ))}
      </div>
    )
  }

  if (pending.length === 0) {
    return (
      <div className="h-full min-h-[160px] border-2 border-dashed border-foreground/40 p-5 flex flex-col items-center justify-center gap-3 text-center">
        <Calendar className="size-10 text-muted-foreground/30" />
        <p className="font-display text-sm tracking-widest uppercase text-muted-foreground">
          Nenhum convite pendente
        </p>
        <p className="text-xs text-muted-foreground/60">
          Times poderão te convidar para partidas
        </p>
      </div>
    )
  }

  return (
    <Link
      to="/jogador/convites"
      className="group block h-full min-h-[160px] border-2 border-foreground bg-background p-5 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
          CONVITES{" "}
          <span className="text-foreground font-black">({pending.length})</span>
        </span>
        <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="space-y-2">
        {pending.slice(0, 3).map((invite) => {
          const parsedDate = new Date(invite.match.matchDate + "T00:00:00")
          const dateStr = parsedDate.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          }).toUpperCase()
          return (
            <div
              key={invite.id}
              className="flex items-center gap-3 border border-foreground/20 bg-muted/20 px-3 py-2.5 group-hover:border-primary/30 transition-colors"
            >
              <div className="size-8 border border-foreground/30 bg-muted flex items-center justify-center shrink-0">
                {invite.match.teamLogoUrl ? (
                  <img
                    src={invite.match.teamLogoUrl}
                    alt={invite.match.teamName}
                    className="size-full object-contain"
                  />
                ) : (
                  <Shield className="size-4 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm uppercase tracking-wide truncate text-foreground">
                  {invite.match.teamName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invite.match.opponentName
                    ? `vs ${invite.match.opponentName} · `
                    : ""}
                  {dateStr}
                  {invite.match.matchTime && ` · ${invite.match.matchTime}`}
                </p>
              </div>
              <InviteStatusIcon status={invite.status} />
            </div>
          )
        })}
        {pending.length > 3 && (
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest pt-1">
            + {pending.length - 3} CONVITES
          </p>
        )}
      </div>
    </Link>
  )
}

// ----------------------------------------------------------------
// Stats / Habilidades Panel
// ----------------------------------------------------------------
function HabilidadesPanel({
  skills,
  positions,
  level,
  loading,
}: {
  skills: string[]
  positions: string[]
  level?: string
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="h-full min-h-[160px] border-2 border-foreground p-5 space-y-3">
        <Skeleton className="h-3 w-24 rounded-none bg-muted/50" />
        <div className="flex flex-wrap gap-2 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-none bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Link
      to="/jogador/perfil"
      className="group block h-full min-h-[160px] border-2 border-foreground bg-background p-5 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
          POSIÇÕES & SKILLS
        </span>
        <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>

      {positions.length === 0 && skills.length === 0 ? (
        <div className="flex flex-col items-center py-3 gap-2 text-center">
          <Target className="size-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-bold">
            Complete seu perfil para aparecer no radar dos times
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {positions.map((pos) => (
                <span
                  key={pos}
                  className="border border-primary/50 bg-primary/10 px-2.5 py-1 font-display text-xs tracking-widest text-primary uppercase group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  {pos}
                </span>
              ))}
              {level && (
                <span className="border border-foreground/20 px-2.5 py-1 font-display text-xs tracking-widest text-muted-foreground uppercase">
                  {level}
                </span>
              )}
            </div>
          )}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="border border-foreground/20 bg-muted/30 px-2 py-0.5 font-bold text-[10px] tracking-widest text-muted-foreground uppercase"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="border border-foreground/20 bg-muted/30 px-2 py-0.5 font-bold text-[10px] tracking-widest text-muted-foreground uppercase">
                  +{skills.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Link>
  )
}

// ----------------------------------------------------------------
// Profile Views Panel
// ----------------------------------------------------------------
function ViewsPanel({
  views,
  loading,
}: {
  views: ProfileView[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="border-2 border-foreground p-5 space-y-3">
        <Skeleton className="h-3 w-28 rounded-none bg-muted/50" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none bg-muted/50" />
        ))}
      </div>
    )
  }

  return (
    <PlanGate
      feature="profileViews"
      fallback={
        <div className="border-2 border-foreground p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="size-4 text-primary" />
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
              QUEM VIU SEU PERFIL
            </span>
          </div>
          <UpsellCard
            title="TIMES ESTÃO DE OLHO"
            description="Descubra quais times visitaram seu perfil. Disponível no plano CRAQUE."
            planName="CRAQUE"
            compact
          />
        </div>
      }
    >
      <div className="border-2 border-foreground p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="size-4 text-primary" />
          <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            QUEM VIU SEU PERFIL{" "}
            <span className="text-foreground font-black">({views.length})</span>
          </span>
          {views.length > 0 && <BadgeCheck className="size-4 text-primary ml-auto" />}
        </div>
        {views.length === 0 ? (
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center py-4">
            Nenhuma visualização ainda
          </p>
        ) : (
          <div className="space-y-2">
            {views.slice(0, 4).map((view) => (
              <div
                key={view.id}
                className="flex items-center gap-3 border border-foreground/20 bg-muted/20 px-3 py-2.5"
              >
                <div className="size-8 border border-foreground/30 bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {view.viewer.logoUrl ? (
                    <img
                      src={view.viewer.logoUrl}
                      alt={view.viewer.name}
                      className="size-full object-contain"
                    />
                  ) : (
                    <Shield className="size-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{view.viewer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {view.viewer.city ?? view.viewer.region ?? ""}
                    {(view.viewer.city || view.viewer.region) && " · "}
                    {new Date(view.viewedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Trophy className="size-3.5 text-primary/50 shrink-0" />
              </div>
            ))}
            {views.length > 4 && (
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center pt-1">
                + {views.length - 4} TIMES
              </p>
            )}
          </div>
        )}
      </div>
    </PlanGate>
  )
}

// ----------------------------------------------------------------
// Quick Actions
// ----------------------------------------------------------------
const QUICK_ACTIONS = [
  { to: "/buscar", icon: Search, label: "BUSCAR TIMES" },
  { to: "/jogador/convites", icon: Calendar, label: "CONVITES" },
  { to: "/jogador/mensagens", icon: MessageCircle, label: "MENSAGENS" },
  { to: "/jogador/conexoes", icon: Link2, label: "CONEXÕES" },
]

// ----------------------------------------------------------------
// Main Dashboard
// ----------------------------------------------------------------
export default function JogadorHome() {
  const { user } = useAuth()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["player", "me"],
    queryFn: () => playersApi.getMe(),
    retry: false,
  })

  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ["my-invites"],
    queryFn: () => matchInvitesApi.getMyInvites(),
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const { data: connectionsData, isLoading: connectionsLoading } = useQuery({
    queryKey: ["player", "me", "connections"],
    queryFn: () => connectionsApi.getMyConnections(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const { data: viewsData, isLoading: viewsLoading } = useQuery({
    queryKey: ["player", "me", "views"],
    queryFn: async () => {
      try {
        return await playersApi.getViews()
      } catch {
        return [] as ProfileView[]
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const { data: suggestedData, isLoading: suggestedLoading } = useQuery({
    queryKey: ["suggested-teams-home"],
    queryFn: () =>
      searchApi.teams({ pageSize: 4 } as Parameters<typeof searchApi.teams>[0]),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const invites: PlayerMatchInvite[] = invitesData ?? []
  const pendingCount = invites.filter((i) => i.status === "pending").length
  const connections = connectionsData ?? []
  const views = viewsData ?? []
  const suggested: TeamSummary[] = suggestedData?.data?.slice(0, 4) ?? []

  const profileCompletion = useMemo(() => {
    if (!profile) return { pct: 0 }
    const checks = [
      !!profile.name,
      (profile.positions?.length ?? 0) > 0,
      !!profile.region,
      !!profile.photoUrl,
      !!profile.bio,
    ]
    const done = checks.filter(Boolean).length
    return { pct: Math.round((done / checks.length) * 100) }
  }, [profile])

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 max-w-6xl mx-auto">

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 border-b-4 border-foreground pb-6">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Avatar */}
          <div className="size-16 sm:size-20 border-2 border-foreground shrink-0 overflow-hidden bg-muted flex items-center justify-center">
            {profile?.photoUrl ? (
              <OptimizedImage
                src={profile.photoUrl}
                alt={profile.name}
                className="size-full object-cover object-top"
              />
            ) : (
              <User className="size-8 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-1">
              BEM-VINDO(A) DE VOLTA
            </p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground uppercase leading-none truncate">
              {profileLoading ? (
                <Skeleton className="h-12 w-40 rounded-none bg-muted/50 inline-block" />
              ) : (
                profile?.name?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "JOGADOR"
              )}
            </h1>
            {(profile?.city || profile?.region) && (
              <p className="flex items-center gap-1.5 mt-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <MapPin className="size-3 text-primary shrink-0" />
                {[profile.city, profile.region].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <PlanBadge />
      </div>

      {/* ── PROFILE COMPLETION ──────────────────────────────────── */}
      {!profileLoading && profileCompletion.pct < 100 && (
        <div className="border-l-4 border-primary bg-primary/5 px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-display text-xs tracking-widest uppercase text-primary mb-2">
              PERFIL {profileCompletion.pct}% — PERFIL COMPLETO É CONVOCAÇÃO CERTA
            </p>
            <div className="flex h-1.5 w-full max-w-xs bg-primary/20">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${profileCompletion.pct}%` }}
              />
            </div>
          </div>
          <Button
            asChild
            className="rounded-none border-2 border-primary bg-primary text-primary-foreground font-display text-[10px] tracking-widest uppercase hover:bg-foreground hover:border-foreground transition-colors shrink-0"
          >
            <Link to="/jogador/perfil/editar">COMPLETAR</Link>
          </Button>
        </div>
      )}

      {/* ── KPI STRIP ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="POSIÇÕES"
          value={profile?.positions?.length ?? 0}
          to="/jogador/perfil"
          loading={profileLoading}
        />
        <KpiCard
          label="CONVITES"
          value={pendingCount}
          to="/jogador/convites"
          accent={pendingCount > 0}
          loading={invitesLoading}
        />
        <KpiCard
          label="VISUALIZAÇÕES"
          value={views.length > 0 ? views.length : "—"}
          to="/jogador/perfil"
          loading={viewsLoading}
        />
        <KpiCard
          label="CONEXÕES"
          value={connections.length}
          to="/jogador/conexoes"
          loading={connectionsLoading}
        />
      </div>

      {/* ── BENTO: CONVITES + HABILIDADES ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            CONVITES PARA PARTIDAS
          </p>
          <ConvitesPanel invites={invites} loading={invitesLoading} />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            SEU ARSENAL
          </p>
          <HabilidadesPanel
            skills={profile?.skills ?? []}
            positions={profile?.positions ?? []}
            level={profile?.level}
            loading={profileLoading}
          />
        </div>
      </div>

      {/* ── QUEM VIU + QUICK ACTIONS ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            RADAR DOS TIMES
          </p>
          <ViewsPanel views={views} loading={viewsLoading} />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            AÇÕES RÁPIDAS
          </p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="group flex flex-col items-center gap-2 border-2 border-foreground bg-background px-3 py-4 font-display text-xs tracking-widest uppercase hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-primary)] transition-all text-center"
              >
                <Icon className="size-5 text-primary" />
                <span className="group-hover:text-primary transition-colors leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── PENEIRA ABERTA (times sugeridos) ────────────────────── */}
      <section>
        <div className="flex items-end justify-between border-b-4 border-foreground pb-3 mb-5">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-primary" />
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-foreground uppercase">
              PENEIRA ABERTA
            </h2>
          </div>
          <Button
            variant="outline"
            asChild
            className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-primary)] transition-all self-start sm:self-auto"
          >
            <Link to="/buscar">
              VER TODOS <ArrowRight className="size-3 ml-1.5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {suggestedLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-2 border-foreground p-4 space-y-3">
                <Skeleton className="h-6 w-3/4 rounded-none bg-muted/50" />
                <Skeleton className="h-4 w-1/2 rounded-none bg-muted/50" />
                <div className="flex gap-1.5 mt-2">
                  <Skeleton className="h-6 w-16 rounded-none bg-muted/50" />
                  <Skeleton className="h-6 w-16 rounded-none bg-muted/50" />
                </div>
              </div>
            ))
          ) : suggested.length === 0 ? (
            <div className="col-span-full border-2 border-dashed border-foreground/30 p-12 flex flex-col items-center gap-3 text-center">
              <Users className="size-12 text-muted-foreground/30" />
              <p className="font-display text-xl tracking-widest uppercase text-muted-foreground">
                SEM SINAL DE JOGO
              </p>
              <Button
                asChild
                className="rounded-none border-2 border-primary bg-primary font-display text-xs tracking-widest uppercase"
              >
                <Link to="/buscar">IR PRO MERCADO</Link>
              </Button>
            </div>
          ) : (
            suggested.map((team) => (
              <Link
                key={team.id}
                to={`/times/${team.id}`}
                className="group flex flex-col justify-between border-2 border-foreground bg-background p-4 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all relative overflow-hidden"
              >
                <div className="absolute -right-6 -top-6 size-20 rotate-12 bg-primary opacity-0 blur-2xl group-hover:opacity-20 transition-opacity" />
                <div>
                  <h3 className="font-display text-2xl uppercase tracking-wide text-foreground group-hover:text-primary transition-colors leading-tight">
                    {team.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Trophy className="size-3 text-muted-foreground shrink-0" />
                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                      {team.level}
                    </p>
                    {team.region && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase truncate">
                          {team.region}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {team.openPositions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-foreground/10">
                    <p className="font-display text-[10px] tracking-widest text-muted-foreground uppercase mb-1.5">
                      BUSCANDO:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {team.openPositions.slice(0, 3).map((pos) => (
                        <span
                          key={pos}
                          className="border border-foreground/30 bg-muted/30 px-2 py-0.5 font-display text-[10px] tracking-widest text-foreground uppercase group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                        >
                          {pos}
                        </span>
                      ))}
                      {team.openPositions.length > 3 && (
                        <span className="border border-foreground/20 px-2 py-0.5 font-display text-[10px] tracking-widest text-muted-foreground uppercase">
                          +{team.openPositions.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </section>

      {/* ── SMART RECOMMENDATIONS (gated) ───────────────────────── */}
      <section className="pb-8">
        <PlanGate
          feature="smartRecommendations"
          fallback={
            <div>
              <div className="flex items-center gap-3 border-b-4 border-foreground pb-3 mb-4">
                <Sparkles className="size-4 text-primary" />
                <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
                  TIMES PARA VOCÊ
                </h2>
              </div>
              <div className="relative overflow-hidden">
                <div className="pointer-events-none select-none blur-sm opacity-50">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border-2 border-foreground p-4 space-y-3">
                        <div className="h-5 w-36 bg-muted" />
                        <div className="flex gap-2">
                          <div className="h-5 w-14 bg-primary/20" />
                          <div className="h-5 w-16 bg-primary/20" />
                        </div>
                        <div className="h-3 w-28 bg-muted/60" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <UpsellCard
                    title="TIMES SOB MEDIDA"
                    description="Times que têm vagas na sua posição, filtrados por região e nível. Plano CRAQUE."
                    planName="CRAQUE"
                  />
                </div>
              </div>
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-display text-lg tracking-wide uppercase">
              RECOMENDAÇÕES IA ATIVAS
            </span>
          </div>
        </PlanGate>
      </section>
    </div>
  )
}
