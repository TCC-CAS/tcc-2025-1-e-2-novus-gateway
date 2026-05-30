import { useMemo } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "~/lib/auth/auth-context"
import { usePlan } from "~/lib/plan"
import { PlanGate, UpsellCard } from "~/lib/plan/plan-gate"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { OptimizedImage } from "~/components/optimized-image"
import { searchApi, teamsApi, matchesApi, type RosterMember } from "~/lib/api-client"
import { PLAN_CONFIGS } from "~shared/contracts"
import type { PlayerSummary, Match, TeamProfile } from "~shared/contracts"
import {
  Users, ArrowRight, Shield, Search, MessageCircle, MapPin,
  Sparkles, BarChart3, Crown, Calendar, User, ChevronRight,
  Target, Plus, Link2,
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
// Next Match Card
// ----------------------------------------------------------------
function NextMatchCard({
  match,
  loading,
}: {
  match?: Match
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="h-full min-h-[140px] border-2 border-foreground p-5 space-y-3">
        <Skeleton className="h-3 w-24 rounded-none bg-muted/50" />
        <Skeleton className="h-8 w-3/4 rounded-none bg-muted/50" />
        <Skeleton className="h-4 w-1/2 rounded-none bg-muted/50" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="h-full min-h-[140px] border-2 border-dashed border-foreground/40 p-5 flex flex-col items-center justify-center gap-3 text-center">
        <Calendar className="size-10 text-muted-foreground/30" />
        <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
          Nenhum jogo agendado
        </p>
        <Button
          asChild
          variant="outline"
          className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          <Link to="/time/jogos">
            <Plus className="size-3 mr-1.5" />
            AGENDAR JOGO
          </Link>
        </Button>
      </div>
    )
  }

  const parsedDate = new Date(match.matchDate + "T00:00:00")
  const dateStr = parsedDate
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })
    .toUpperCase()
  const daysUntil = Math.ceil(
    (parsedDate.getTime() - Date.now()) / 86_400_000
  )

  return (
    <Link
      to="/time/jogos"
      className="group h-full min-h-[140px] flex flex-col justify-between border-2 border-foreground bg-background p-5 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all"
    >
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="bg-primary px-2 py-0.5 font-display text-[9px] tracking-widest uppercase text-primary-foreground">
            PRÓXIMA PARTIDA
          </span>
          {daysUntil >= 0 && daysUntil <= 3 && (
            <span className="bg-destructive px-2 py-0.5 font-display text-[9px] tracking-widest uppercase text-destructive-foreground animate-pulse">
              EM BREVE
            </span>
          )}
        </div>
        <p className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-foreground group-hover:text-primary transition-colors leading-tight">
          {match.opponentName ? `vs ${match.opponentName}` : "ADVERSÁRIO A DEFINIR"}
        </p>
        <p className="font-bold text-sm tracking-wide text-muted-foreground mt-2">
          {dateStr}
          {match.matchTime && ` · ${match.matchTime}`}
        </p>
        {(match.venueName || match.city) && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            {[match.venueName, match.city].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-foreground/20">
        <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
          {daysUntil === 0
            ? "HOJE"
            : daysUntil === 1
            ? "AMANHÃ"
            : `${daysUntil} DIAS`}
        </span>
        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}

// ----------------------------------------------------------------
// Roster Mini Panel
// ----------------------------------------------------------------
function RosterMini({
  members,
  loading,
}: {
  members: RosterMember[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="h-full min-h-[140px] border-2 border-foreground p-5">
        <div className="flex flex-wrap gap-2 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="size-10 rounded-none bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Link
      to="/time/elenco"
      className="group block h-full min-h-[140px] border-2 border-foreground bg-background p-5 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
          ELENCO{" "}
          <span className="text-foreground font-black">({members.length})</span>
        </span>
        <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      {members.length === 0 ? (
        <div className="flex flex-col items-center py-4 gap-2 text-center">
          <Users className="size-8 text-muted-foreground/30" />
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground/60">
            Elenco vazio — recrute jogadores
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.slice(0, 12).map((m) => (
            <div
              key={m.id}
              className="size-10 border border-foreground/30 overflow-hidden bg-muted flex items-center justify-center group-hover:border-primary/40 transition-colors"
            >
              {m.photoUrl ? (
                <OptimizedImage
                  src={m.photoUrl}
                  alt={m.name}
                  className="size-full object-cover object-top"
                />
              ) : (
                <User className="size-4 text-muted-foreground/50" />
              )}
            </div>
          ))}
          {members.length > 12 && (
            <div className="size-10 border border-foreground/30 bg-muted flex items-center justify-center">
              <span className="font-display text-[10px] text-muted-foreground">
                +{members.length - 12}
              </span>
            </div>
          )}
        </div>
      )}
    </Link>
  )
}

// ----------------------------------------------------------------
// Open Positions Panel
// ----------------------------------------------------------------
function OpenPositionsPanel({
  positions,
  loading,
}: {
  positions: string[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="border-2 border-foreground p-5 space-y-2">
        <Skeleton className="h-3 w-28 rounded-none bg-muted/50" />
        <div className="flex flex-wrap gap-2 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-none bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Link
      to="/time/perfil/editar"
      className="group block border-2 border-foreground bg-background p-5 h-full hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
          VAGAS ABERTAS{" "}
          <span className="text-foreground font-black">({positions.length})</span>
        </span>
        <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      {positions.length === 0 ? (
        <div className="flex flex-col items-center py-3 gap-2 text-center">
          <Target className="size-8 text-muted-foreground/30" />
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground/60">
            Nenhuma vaga definida
          </p>
          <p className="text-xs text-muted-foreground/50">
            Adicione vagas para atrair jogadores
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {positions.map((pos) => (
            <span
              key={pos}
              className="border border-primary/50 bg-primary/10 px-2.5 py-1 font-display text-[10px] tracking-[0.2em] uppercase text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            >
              {pos}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

// ----------------------------------------------------------------
// Analytics / Desempenho Panel
// ----------------------------------------------------------------
function DesempenhoPanel({
  matches,
  loading,
}: {
  matches: Match[]
  loading: boolean
}) {
  const stats = useMemo(() => {
    const completed = matches.filter((m) => m.status === "completed")
    if (completed.length === 0) return null
    let wins = 0, draws = 0, losses = 0
    completed.forEach((m) => {
      if (!m.result) return
      const parts = m.result.split("-").map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (parts[0] > parts[1]) wins++
        else if (parts[0] === parts[1]) draws++
        else losses++
      }
    })
    const withResult = wins + draws + losses
    return { total: completed.length, wins, draws, losses, withResult }
  }, [matches])

  if (loading) {
    return (
      <div className="border-2 border-foreground p-5 space-y-3">
        <Skeleton className="h-3 w-24 rounded-none bg-muted/50" />
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-none bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <PlanGate
      feature="analytics"
      fallback={
        <div className="border-2 border-foreground p-5 h-full">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="size-4 text-primary" />
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
              DESEMPENHO
            </span>
          </div>
          <UpsellCard
            title="ANALYTICS DO TIME"
            description="Vitórias, derrotas, aproveitamento e métricas de recrutamento."
            planName="CAMPEÃO"
            compact
          />
        </div>
      }
    >
      <div className="border-2 border-foreground p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="size-4 text-primary" />
          <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            DESEMPENHO
          </span>
        </div>
        {!stats ? (
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest py-4 text-center">
            Nenhuma partida finalizada ainda
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(
                [
                  {
                    label: "V",
                    value: stats.wins,
                    cls: "text-primary border-primary/40 bg-primary/10",
                  },
                  {
                    label: "E",
                    value: stats.draws,
                    cls: "text-muted-foreground border-foreground/20 bg-muted/20",
                  },
                  {
                    label: "D",
                    value: stats.losses,
                    cls: "text-destructive border-destructive/40 bg-destructive/10",
                  },
                ] as const
              ).map(({ label, value, cls }) => (
                <div key={label} className={cn("border p-2 text-center", cls)}>
                  <span className="font-display text-3xl font-black leading-none">
                    {value}
                  </span>
                  <p className="font-display text-[8px] tracking-widest uppercase opacity-60 mt-0.5">
                    {label === "V" ? "VITÓRIAS" : label === "E" ? "EMPATES" : "DERROTAS"}
                  </p>
                </div>
              ))}
            </div>
            {stats.withResult > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-foreground/10 border border-foreground/20 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(stats.wins / stats.withResult) * 100}%` }}
                  />
                </div>
                <span className="font-display text-xs tracking-widest text-muted-foreground uppercase shrink-0">
                  {Math.round((stats.wins / stats.withResult) * 100)}% APROV.
                </span>
              </div>
            )}
            <p className="font-display text-xs tracking-widest text-muted-foreground uppercase mt-3">
              {stats.total} PARTIDAS REGISTRADAS
            </p>
          </>
        )}
      </div>
    </PlanGate>
  )
}

// ----------------------------------------------------------------
// Quick Actions
// ----------------------------------------------------------------
const QUICK_ACTIONS = [
  { to: "/time/buscar-jogadores", icon: Search, label: "BUSCAR CRAQUES" },
  { to: "/time/jogos", icon: Calendar, label: "JOGOS" },
  { to: "/time/mensagens", icon: MessageCircle, label: "MENSAGENS" },
  { to: "/time/conexoes", icon: Link2, label: "CONEXÕES" },
]

// ----------------------------------------------------------------
// Main Dashboard
// ----------------------------------------------------------------
export default function TimeHome() {
  const { user } = useAuth()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["team", "me"],
    queryFn: () => teamsApi.getMe(),
    retry: false,
  })

  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ["team", "me", "roster"],
    queryFn: async () => {
      const me = await teamsApi.getMe()
      return teamsApi.getRoster(me.id)
    },
    enabled: !!profile,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ["team", "me", "matches", "upcoming-home"],
    queryFn: () => matchesApi.getMyMatches({ status: "scheduled", pageSize: 3 }),
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const { data: completedData, isLoading: completedLoading } = useQuery({
    queryKey: ["team", "me", "matches", "completed-home"],
    queryFn: () => matchesApi.getMyMatches({ status: "completed", pageSize: 20 }),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const { data: suggestedData, isLoading: suggestedLoading } = useQuery({
    queryKey: ["suggested-players-home"],
    queryFn: () =>
      searchApi.players({ pageSize: 4 } as Parameters<typeof searchApi.players>[0]),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const nextMatch = upcomingData?.data?.[0]
  const members = rosterData?.members ?? []
  const openPositions = profile?.openPositions ?? []
  const completedMatches = completedData?.data ?? []
  const suggested: PlayerSummary[] = suggestedData?.data?.slice(0, 4) ?? []

  const profileCompletion = useMemo(() => {
    if (!profile) return { pct: 0 }
    const checks = [
      !!profile.name,
      !!profile.region,
      !!profile.level,
      !!profile.logoUrl,
      !!profile.description,
    ]
    const done = checks.filter(Boolean).length
    return { pct: Math.round((done / checks.length) * 100) }
  }, [profile])

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 max-w-6xl mx-auto">

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 border-b-4 border-foreground pb-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-1">
            PAINEL DO TIME
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground uppercase leading-none truncate">
            {profileLoading ? (
              <Skeleton className="h-12 w-48 rounded-none bg-muted/50 inline-block" />
            ) : (
              profile?.name ?? user?.name ?? "SEU TIME"
            )}
          </h1>
          {(profile?.city || profile?.region) && (
            <p className="flex items-center gap-1.5 mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <MapPin className="size-3 text-primary shrink-0" />
              {[profile.city, profile.region].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <PlanBadge />
          {profile?.level && (
            <span className="border border-foreground/20 px-2 py-0.5 font-display text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
              {profile.level.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* ── PROFILE COMPLETION ──────────────────────────────────── */}
      {!profileLoading && profileCompletion.pct < 100 && (
        <div className="border-l-4 border-primary bg-primary/5 px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-display text-xs tracking-widest uppercase text-primary mb-2">
              PERFIL {profileCompletion.pct}% COMPLETO — COMPLETE PARA ATRAIR MAIS JOGADORES
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
            <Link to="/time/perfil/editar">COMPLETAR</Link>
          </Button>
        </div>
      )}

      {/* ── KPI STRIP ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="ELENCO"
          value={members.length}
          to="/time/elenco"
          loading={rosterLoading || profileLoading}
        />
        <KpiCard
          label="VAGAS"
          value={openPositions.length}
          to="/time/perfil/editar"
          accent={openPositions.length > 0}
          loading={profileLoading}
        />
        <KpiCard
          label="PRÓX. JOGOS"
          value={upcomingData?.data?.length ?? 0}
          to="/time/jogos"
          loading={upcomingLoading}
        />
        <KpiCard
          label="PARTIDAS"
          value={completedMatches.length}
          to="/time/jogos"
          loading={completedLoading}
        />
      </div>

      {/* ── BENTO: PRÓXIMO JOGO + ELENCO ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            PRÓXIMO JOGO
          </p>
          <NextMatchCard match={nextMatch} loading={upcomingLoading} />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            ELENCO
          </p>
          <RosterMini members={members} loading={rosterLoading || profileLoading} />
        </div>
      </div>

      {/* ── BENTO: VAGAS + DESEMPENHO ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            VAGAS ABERTAS
          </p>
          <OpenPositionsPanel positions={openPositions} loading={profileLoading} />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            DESEMPENHO
          </p>
          <DesempenhoPanel matches={completedMatches} loading={completedLoading} />
        </div>
      </div>

      {/* ── QUICK ACTIONS ───────────────────────────────────────── */}
      <section>
        <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-3">
          AÇÕES RÁPIDAS
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 border-2 border-foreground bg-background px-4 py-3 font-display text-xs tracking-widest uppercase hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-primary)] transition-all"
            >
              <Icon className="size-4 text-primary shrink-0" />
              <span className="group-hover:text-primary transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── JOGADORES NO RADAR ──────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between border-b-4 border-foreground pb-3 mb-5">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-primary" />
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-foreground uppercase">
              JOGADORES NO RADAR
            </h2>
          </div>
          <Button
            variant="outline"
            asChild
            className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-primary)] transition-all self-start sm:self-auto"
          >
            <Link to="/time/buscar-jogadores">
              VER TODOS <ArrowRight className="size-3 ml-1.5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {suggestedLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-2 border-foreground p-4 space-y-3">
                <Skeleton className="h-6 w-3/4 rounded-none bg-muted/50" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-none bg-muted/50" />
                  <Skeleton className="h-5 w-14 rounded-none bg-muted/50" />
                </div>
                <Skeleton className="h-4 w-full rounded-none bg-muted/50" />
              </div>
            ))
          ) : suggested.length === 0 ? (
            <div className="col-span-full border-2 border-dashed border-foreground/30 p-12 flex flex-col items-center gap-3 text-center">
              <Users className="size-12 text-muted-foreground/30" />
              <p className="font-display text-xl tracking-widest uppercase text-muted-foreground">
                MERCADO PARADO
              </p>
              <Button
                asChild
                className="rounded-none border-2 border-primary bg-primary font-display text-xs tracking-widest uppercase"
              >
                <Link to="/time/buscar-jogadores">BUSCAR CRAQUES</Link>
              </Button>
            </div>
          ) : (
            suggested.map((player) => (
              <Link
                key={player.id}
                to={`/jogadores/${player.id}`}
                className="group flex flex-col justify-between border-2 border-foreground bg-background p-4 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all relative overflow-hidden"
              >
                <div className="absolute -right-6 -top-6 size-20 rotate-12 bg-primary opacity-0 blur-2xl group-hover:opacity-20 transition-opacity" />
                <div>
                  <h3 className="font-display text-2xl uppercase tracking-wide text-foreground group-hover:text-primary transition-colors leading-tight">
                    {player.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {player.positions.slice(0, 2).map((pos) => (
                      <span
                        key={pos}
                        className="border border-primary/50 bg-primary/10 px-2 py-0.5 font-display text-[9px] tracking-widest text-primary uppercase"
                      >
                        {pos}
                      </span>
                    ))}
                    {player.level && (
                      <span className="border border-foreground/20 px-2 py-0.5 font-display text-xs tracking-widest text-muted-foreground uppercase">
                        {player.level}
                      </span>
                    )}
                  </div>
                </div>
                {player.skills.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-foreground/10">
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase leading-relaxed">
                      {player.skills.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </section>

      {/* ── RECOMENDAÇÕES IA (gated) ─────────────────────────────── */}
      <section className="pb-8">
        <PlanGate
          feature="smartRecommendations"
          fallback={
            <div>
              <div className="flex items-center gap-3 border-b-4 border-foreground pb-3 mb-4">
                <Sparkles className="size-4 text-primary" />
                <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
                  RECOMENDADOS PARA VOCÊ
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
                    title="RECOMENDAÇÕES IA"
                    description="Jogadores selecionados para as vagas abertas do seu time. Plano CAMPEÃO."
                    planName="CAMPEÃO"
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
