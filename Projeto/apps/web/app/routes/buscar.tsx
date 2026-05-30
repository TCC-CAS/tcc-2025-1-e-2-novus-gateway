import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { searchApi } from "~/lib/api-client"
import { useAuth } from "~/lib/auth/auth-context"
import { usePlan } from "~/lib/plan/plan-context"
import { POSITIONS, TEAM_LEVELS } from "~shared/contracts"
import type { TeamSummary, PlayerSummary } from "~shared/contracts"
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
import { cn } from "~/lib/utils"
import {
  Filter,
  ArrowRight,
  MapPin,
  User,
  Shield,
  Search,
  Star,
  Crown,
  Zap,
  TrendingUp,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export function meta() {
  return [{ title: "Buscar - VárzeaPro" }]
}

const PLAYER_LEVELS = [
  { value: "iniciante", label: "INICIANTE" },
  { value: "amador", label: "AMADOR" },
  { value: "intermediario", label: "INTERMEDIÁRIO" },
  { value: "avancado", label: "AVANÇADO" },
]

const POSITION_LABELS: Record<string, string> = {
  goleiro: "GOLEIRO",
  lateral: "LATERAL",
  zagueiro: "ZAGUEIRO",
  volante: "VOLANTE",
  meia: "MEIA",
  atacante: "ATACANTE",
}

const TEAM_LEVEL_LABELS: Record<string, string> = {
  amador: "AMADOR",
  recreativo: "RECREATIVO",
  "semi-profissional": "SEMI-PROFISSIONAL",
  outro: "OUTRO",
}

/* ─── Skeletons ─────────────────────────────────────────────────────────────── */

function TeamCardSkeleton() {
  return (
    <div className="border-2 border-foreground animate-pulse">
      <div className="aspect-[4/3] bg-foreground/8 flex items-center justify-center relative overflow-hidden">
        <div className="size-20 bg-foreground/15 rounded-sm" />
        <div className="absolute top-2 right-2 h-4 w-12 bg-foreground/20" />
      </div>
      <div className="p-3 border-t-2 border-foreground/10 space-y-2">
        <div className="h-4 bg-foreground/20 w-3/4" />
        <div className="h-3 bg-foreground/10 w-1/2" />
        <div className="flex gap-1 mt-2">
          <div className="h-5 w-14 bg-primary/15" />
          <div className="h-5 w-16 bg-primary/15" />
        </div>
      </div>
      <div className="px-3 py-2 border-t border-foreground/10 flex items-center justify-between">
        <div className="h-3 w-12 bg-foreground/15" />
        <div className="h-3 w-3 bg-foreground/15" />
      </div>
    </div>
  )
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

/* ─── Team Card ─────────────────────────────────────────────────────────────── */

function TeamCard({ team }: { team: TeamSummary }) {
  const isGold = team.cardTier === "gold"
  const isLegendary = team.cardTier === "legendary"
  const isPremium = isGold || isLegendary

  return (
    <Link
      to={`/times/${team.id}`}
      className={cn(
        "group block bg-background cursor-pointer transition-all duration-200 hover:-translate-y-1 relative",
        isLegendary
          ? "border-[3px] border-primary shadow-[0_0_14px_2px_var(--color-primary)/30] hover:shadow-[4px_4px_0px_0px_var(--color-primary),0_0_20px_4px_var(--color-primary)/40]"
          : isGold
            ? "border-[3px] border-amber-400 shadow-[0_0_10px_1px_theme(colors.amber.400/25)] hover:shadow-[4px_4px_0px_0px_theme(colors.amber.400),0_0_18px_3px_theme(colors.amber.400/35)]"
            : "border-2 border-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
      )}
    >
      {/* Premium top stripe — visual anchor that screams "destaque" */}
      {isLegendary && (
        <div className="h-1 w-full bg-primary" />
      )}
      {isGold && (
        <div className="h-1 w-full bg-amber-400" />
      )}

      <div className="aspect-[4/3] relative overflow-hidden bg-foreground/5 flex items-center justify-center border-b-2 border-foreground/10 group-hover:border-primary transition-colors duration-200">
        {team.logoUrl ? (
          <OptimizedImage
            src={team.logoUrl}
            alt={team.name}
            className="size-20 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Shield className={cn(
              "size-14 transition-colors duration-200",
              isPremium ? "text-foreground/25 group-hover:text-foreground/40" : "text-foreground/15 group-hover:text-foreground/30",
            )} />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-foreground/20">Sem escudo</span>
          </div>
        )}

        {/* Tier badge — EM DESTAQUE language triggers social proof */}
        {isLegendary && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground font-display text-[10px] tracking-widest uppercase px-2 py-1 font-black leading-none shadow-sm">
            <Crown className="size-3" />
            EM DESTAQUE
          </div>
        )}
        {isGold && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-amber-900 font-display text-[10px] tracking-widest uppercase px-2 py-1 font-black leading-none shadow-sm">
            <Star className="size-3 fill-amber-900" />
            EM DESTAQUE
          </div>
        )}

        <span className="absolute top-2 right-2 bg-foreground text-background font-display text-[10px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
          {TEAM_LEVEL_LABELS[team.level] ?? team.level.toUpperCase()}
        </span>

        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-foreground/8 to-transparent" />
      </div>

      <div className="p-3">
        <p className={cn(
          "font-display font-black uppercase text-base tracking-wide leading-tight truncate transition-colors duration-200 group-hover:text-primary",
          isPremium && "text-foreground",
        )}>
          {team.name}
        </p>
        {team.region && (
          <p className="flex items-center gap-1 text-muted-foreground text-sm font-bold tracking-wide mt-0.5">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{team.region}</span>
          </p>
        )}

        {team.openPositions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {team.openPositions.slice(0, 3).map((pos) => (
              <span
                key={pos}
                className="border border-primary/40 bg-primary/8 text-primary font-display text-[10px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none"
              >
                {POSITION_LABELS[pos] ?? pos.toUpperCase()}
              </span>
            ))}
            {team.openPositions.length > 3 && (
              <span className="text-muted-foreground font-display text-[10px] tracking-widest uppercase px-1 py-0.5 leading-none">
                +{team.openPositions.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={cn(
        "px-3 py-2 flex items-center justify-between border-t-2 transition-colors duration-200",
        isLegendary
          ? "border-primary/20 bg-primary/5 group-hover:bg-primary/10 group-hover:border-primary/40"
          : isGold
            ? "border-amber-400/20 bg-amber-400/5 group-hover:bg-amber-400/10 group-hover:border-amber-400/40"
            : "border-foreground/10 group-hover:border-primary",
      )}>
        <span className={cn(
          "font-display text-[10px] tracking-[0.2em] uppercase",
          isLegendary ? "text-primary font-black" : isGold ? "text-amber-600 font-black" : "text-muted-foreground",
        )}>
          {isPremium ? "VER TIME ↗" : "Ver time"}
        </span>
        <ArrowRight className={cn(
          "size-3 group-hover:translate-x-0.5 transition-all duration-200",
          isLegendary ? "text-primary" : isGold ? "text-amber-500" : "text-muted-foreground group-hover:text-primary",
        )} />
      </div>
    </Link>
  )
}

/* ─── Player Card ───────────────────────────────────────────────────────────── */

function PlayerCard({ player }: { player: PlayerSummary }) {
  const isGold = player.cardTier === "gold"
  const isLegendary = player.cardTier === "legendary"
  const isPremium = isGold || isLegendary

  return (
    <Link
      to={`/jogadores/${player.id}`}
      className={cn(
        "group block bg-background cursor-pointer transition-all duration-200 hover:-translate-y-1",
        isLegendary
          ? "border-[3px] border-primary shadow-[0_0_14px_2px_var(--color-primary)/30] hover:shadow-[4px_4px_0px_0px_var(--color-primary),0_0_22px_5px_var(--color-primary)/40]"
          : isGold
            ? "border-[3px] border-amber-400 shadow-[0_0_10px_1px_theme(colors.amber.400/25)] hover:shadow-[4px_4px_0px_0px_theme(colors.amber.400),0_0_18px_3px_theme(colors.amber.400/35)]"
            : "border-2 border-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
      )}
    >
      {/* Premium top stripe */}
      {isLegendary && <div className="h-1 w-full bg-primary" />}
      {isGold && <div className="h-1 w-full bg-amber-400" />}

      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        {player.photoUrl ? (
          <OptimizedImage
            src={player.photoUrl}
            alt={player.name}
            className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={cn(
            "size-full flex flex-col items-center justify-center gap-3",
            isLegendary
              ? "bg-gradient-to-b from-primary/10 to-primary/20"
              : isGold
                ? "bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30"
                : "bg-foreground/5",
          )}>
            <User className={cn(
              "size-14",
              isLegendary ? "text-primary/30" : isGold ? "text-amber-400/40" : "text-foreground/15",
            )} />
            <span className="font-display text-xs tracking-[0.25em] uppercase text-foreground/25">Sem foto</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-foreground/95 via-foreground/50 to-transparent" />

        {/* Position badges — top left */}
        {player.positions.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-4.5rem)]">
            {player.positions.slice(0, 2).map((pos) => (
              <span
                key={pos}
                className="bg-primary text-primary-foreground font-display text-[10px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none"
              >
                {POSITION_LABELS[pos] ?? pos.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Tier badge — top right. "EM DESTAQUE" creates social proof + scarcity feeling */}
        {isLegendary && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-primary text-primary-foreground font-display text-[10px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none shadow-sm">
            <Crown className="size-3" />
            LENDA
          </div>
        )}
        {isGold && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-amber-400 text-amber-900 font-display text-[10px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none shadow-sm">
            <Star className="size-3 fill-amber-900" />
            CRAQUE
          </div>
        )}
        {!isPremium && player.level && (
          <span className="absolute top-2 right-2 bg-background border-2 border-foreground font-display text-[10px] tracking-widest uppercase px-1.5 py-0.5 font-black text-foreground leading-none">
            {PLAYER_LEVELS.find((l) => l.value === player.level)?.label ?? player.level?.toUpperCase()}
          </span>
        )}

        {/* Name + location */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-display text-lg leading-tight tracking-wide font-black uppercase truncate drop-shadow-sm text-background">
            {player.name}
          </p>
          {player.region && (
            <p className="flex items-center gap-1 text-background/65 text-sm font-bold tracking-wide mt-0.5">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{player.region}</span>
            </p>
          )}
        </div>
      </div>

      {/* Bottom strip */}
      <div className={cn(
        "px-3 py-2 flex items-center justify-between border-t-2 transition-colors duration-200",
        isLegendary
          ? "border-primary/20 bg-primary/5 group-hover:bg-primary/10 group-hover:border-primary/40"
          : isGold
            ? "border-amber-400/20 bg-amber-400/5 group-hover:bg-amber-400/10 group-hover:border-amber-400/40"
            : "border-foreground/10 group-hover:border-primary",
      )}>
        <span className={cn(
          "font-display text-[10px] tracking-[0.2em] uppercase",
          isLegendary ? "text-primary font-black" : isGold ? "text-amber-600 font-black" : "text-muted-foreground",
        )}>
          {isPremium ? "VER PERFIL ↗" : "Ver perfil"}
        </span>
        <ArrowRight className={cn(
          "size-3 group-hover:translate-x-0.5 transition-all duration-200",
          isLegendary ? "text-primary" : isGold ? "text-amber-500" : "text-muted-foreground group-hover:text-primary",
        )} />
      </div>
    </Link>
  )
}

/* ─── Results header with premium count — social proof + status signal ───────── */

function ResultsHeader({ total, premiumCount, label }: { total: number; premiumCount: number; label: string }) {
  if (total === 0) return null
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <span className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground">
          {total} {label} encontrado{total !== 1 ? "s" : ""}
        </span>
        {premiumCount > 0 && (
          <span className="flex items-center gap-1 bg-primary/10 border border-primary/30 text-primary font-display text-[10px] tracking-widest uppercase px-2 py-0.5 font-black">
            <Zap className="size-3 fill-primary" />
            {premiumCount} em destaque
          </span>
        )}
      </div>
      <span className="font-display text-[10px] tracking-widest text-muted-foreground uppercase flex items-center gap-1">
        <TrendingUp className="size-3" />
        Premium aparecem primeiro
      </span>
    </div>
  )
}

/* ─── Upgrade CTA — loss aversion + scarcity ─────────────────────────────────── */

function UpgradeCTA({ type }: { type: "player" | "team" }) {
  const isTeam = type === "team"
  return (
    <div className="border-4 border-dashed border-foreground/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="size-10 border-2 border-foreground flex items-center justify-center shrink-0">
          <Lock className="size-5 text-foreground" />
        </div>
        <div>
          <p className="font-display text-sm tracking-widest uppercase font-black text-foreground">
            {isTeam ? "Seu time não aparece em destaque" : "Você não aparece em destaque"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-bold">
            {isTeam
              ? "Times premium aparecem antes de você na busca dos jogadores."
              : "Jogadores premium aparecem antes de você na busca dos times."}
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="rounded-none border-2 border-primary bg-primary text-primary-foreground font-display tracking-widest uppercase shrink-0 hover:-translate-y-0.5 transition-transform">
        <Link to="/planos">VER PLANOS →</Link>
      </Button>
    </div>
  )
}

/* ─── Times Tab ─────────────────────────────────────────────────────────────── */

function TimesTab() {
  const { role } = useAuth()
  const { planId } = usePlan()
  const [name, setName] = useState("")
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [region, setRegion] = useState("")
  const [openPosition, setOpenPosition] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)

  const hasFilters = !!(name || level || region || openPosition)

  function resetFilters() {
    setName(""); setLevel(undefined); setRegion(""); setOpenPosition(undefined); setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["buscar-times", { name, level, region, openPosition, page }],
    queryFn: () =>
      searchApi.teams({
        name: name || undefined,
        level: level as any,
        region: region || undefined,
        openPosition: openPosition || undefined,
        page,
        pageSize: 12,
        order: "desc",
      }),
  })

  const premiumCount = data?.data.filter((t: TeamSummary) => t.cardTier && t.cardTier !== "none").length ?? 0
  const isFree = !planId || planId === "free"

  return (
    <div className="flex flex-col gap-6">
      {/* Filters — padrão do projeto */}
      <div className="flex flex-wrap items-center gap-3 bg-background border-4 border-foreground p-2 shadow-[4px_4px_0px_0px_var(--color-primary)]">
        <div className="flex items-center gap-2 pl-2">
          <Filter className="size-5 text-foreground" />
          <span className="font-display text-sm tracking-widest text-foreground uppercase hidden sm:inline">FILTROS:</span>
        </div>

        <Input
          placeholder="Nome do time"
          value={name}
          onChange={(e) => { setName(e.target.value); setPage(1) }}
          className="w-[160px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs focus:ring-0 focus-visible:ring-0 focus:border-primary placeholder:normal-case placeholder:font-normal"
        />

        <Select value={level ?? "all"} onValueChange={(v) => { setLevel(v === "all" ? undefined : v); setPage(1) }}>
          <SelectTrigger className="w-[160px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
            <SelectValue placeholder="NÍVEL" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-4 border-foreground">
            <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
            {TEAM_LEVELS.map((l) => (
              <SelectItem key={l} value={l} className="font-bold tracking-widest uppercase text-xs">{TEAM_LEVEL_LABELS[l] ?? l.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={openPosition ?? "all"} onValueChange={(v) => { setOpenPosition(v === "all" ? undefined : v); setPage(1) }}>
          <SelectTrigger className="w-[160px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
            <SelectValue placeholder="POSIÇÃO ABERTA" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-4 border-foreground">
            <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODAS</SelectItem>
            {POSITIONS.map((pos) => (
              <SelectItem key={pos} value={pos} className="font-bold tracking-widest uppercase text-xs">{POSITION_LABELS[pos] ?? pos.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="REGIÃO"
          value={region}
          onChange={(e) => { setRegion(e.target.value); setPage(1) }}
          className="w-[130px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus-visible:ring-0 focus:border-primary placeholder:normal-case"
        />

        {hasFilters && (
          <Button type="button" variant="outline" onClick={resetFilters} className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase h-10 hover:bg-muted">
            LIMPAR
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <TeamCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && data && data.data.length === 0 && (
        <div className="border-4 border-foreground p-16 text-center">
          <Shield className="size-16 text-foreground/15 mx-auto mb-4" />
          <p className="font-display text-2xl tracking-widest text-foreground uppercase">Nenhum time encontrado</p>
          <p className="text-muted-foreground mt-2">Tente ajustar os filtros</p>
          {hasFilters && (
            <Button variant="outline" className="mt-6 rounded-none border-2 border-foreground font-display tracking-widest hover:bg-muted" onClick={resetFilters}>
              VER TODOS
            </Button>
          )}
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <ResultsHeader total={data.meta.total} premiumCount={premiumCount} label="time" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.data.map((team: TeamSummary) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>

          {isFree && role === "player" && <UpgradeCTA type="player" />}

          {data.meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4 mr-1" />
                ANTERIOR
              </Button>
              <div className="border-2 border-foreground px-5 py-2 font-display text-sm tracking-widest bg-foreground text-background">
                {page} / {data.meta.totalPages}
              </div>
              <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                PRÓXIMO
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Jogadores Tab ─────────────────────────────────────────────────────────── */

function JogadoresTab() {
  const { role } = useAuth()
  const { planId } = usePlan()
  const [name, setName] = useState("")
  const [position, setPosition] = useState<string | undefined>(undefined)
  const [region, setRegion] = useState("")
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)

  const hasFilters = !!(name || position || region || level)

  function resetFilters() {
    setName(""); setPosition(undefined); setRegion(""); setLevel(undefined); setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["buscar-jogadores", { name, position, region, level, page }],
    queryFn: () =>
      searchApi.players({
        name: name || undefined,
        position: position as any,
        region: region || undefined,
        level: level as any,
        page,
        pageSize: 12,
        order: "desc",
      }),
  })

  const premiumCount = data?.data.filter((p: PlayerSummary) => p.cardTier && p.cardTier !== "none").length ?? 0
  const isFree = !planId || planId === "free"

  return (
    <div className="flex flex-col gap-6">
      {/* Filters — padrão do projeto */}
      <div className="flex flex-wrap items-center gap-3 bg-background border-4 border-foreground p-2 shadow-[4px_4px_0px_0px_var(--color-primary)]">
        <div className="flex items-center gap-2 pl-2">
          <Filter className="size-5 text-foreground" />
          <span className="font-display text-sm tracking-widest text-foreground uppercase hidden sm:inline">FILTROS:</span>
        </div>

        <Input
          placeholder="Nome do jogador"
          value={name}
          onChange={(e) => { setName(e.target.value); setPage(1) }}
          className="w-[160px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs focus:ring-0 focus-visible:ring-0 focus:border-primary placeholder:normal-case placeholder:font-normal"
        />

        <Select value={position ?? "all"} onValueChange={(v) => { setPosition(v === "all" ? undefined : v); setPage(1) }}>
          <SelectTrigger className="w-[140px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
            <SelectValue placeholder="POSIÇÃO" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-4 border-foreground">
            <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODAS</SelectItem>
            {POSITIONS.map((pos) => (
              <SelectItem key={pos} value={pos} className="font-bold tracking-widest uppercase text-xs">{POSITION_LABELS[pos] ?? pos.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={level ?? "all"} onValueChange={(v) => { setLevel(v === "all" ? undefined : v); setPage(1) }}>
          <SelectTrigger className="w-[140px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
            <SelectValue placeholder="NÍVEL" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-4 border-foreground">
            <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
            {PLAYER_LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value} className="font-bold tracking-widest uppercase text-xs">{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="REGIÃO"
          value={region}
          onChange={(e) => { setRegion(e.target.value); setPage(1) }}
          className="w-[130px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus-visible:ring-0 focus:border-primary placeholder:normal-case"
        />

        {hasFilters && (
          <Button type="button" variant="outline" onClick={resetFilters} className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase h-10 hover:bg-muted">
            LIMPAR
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <PlayerCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && data && data.data.length === 0 && (
        <div className="border-4 border-foreground p-16 text-center">
          <User className="size-16 text-foreground/15 mx-auto mb-4" />
          <p className="font-display text-2xl tracking-widest text-foreground uppercase">Nenhum jogador encontrado</p>
          <p className="text-muted-foreground mt-2">Tente ajustar os filtros</p>
          {hasFilters && (
            <Button variant="outline" className="mt-6 rounded-none border-2 border-foreground font-display tracking-widest hover:bg-muted" onClick={resetFilters}>
              VER TODOS
            </Button>
          )}
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <ResultsHeader total={data.meta.total} premiumCount={premiumCount} label="jogador" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.data.map((player: PlayerSummary) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>

          {isFree && role === "team" && <UpgradeCTA type="team" />}

          {data.meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4 mr-1" />
                ANTERIOR
              </Button>
              <div className="border-2 border-foreground px-5 py-2 font-display text-sm tracking-widest bg-foreground text-background">
                {page} / {data.meta.totalPages}
              </div>
              <Button variant="outline" className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                PRÓXIMO
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function Buscar() {
  const { role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const defaultTab = role === "team" ? "jogadores" : "times"
  const tab = searchParams.get("tab") ?? defaultTab

  useEffect(() => {
    if (!searchParams.get("tab")) {
      setSearchParams({ tab: defaultTab }, { replace: true })
    }
  }, [defaultTab])

  function setTab(value: string) {
    setSearchParams({ tab: value }, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Search className="size-5" />
          <h1 className="text-2xl font-black uppercase tracking-tight">BUSCAR</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {tab === "times" ? "Encontre times para entrar" : "Encontre jogadores para recrutar"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-2 border-foreground">
        <button
          type="button"
          onClick={() => setTab("times")}
          className={cn(
            "flex-1 py-3 font-display text-sm tracking-widest uppercase transition-colors border-r-2 border-foreground",
            tab === "times"
              ? "bg-foreground text-background"
              : "bg-background text-foreground hover:bg-muted",
          )}
        >
          TIMES
        </button>
        <button
          type="button"
          onClick={() => setTab("jogadores")}
          className={cn(
            "flex-1 py-3 font-display text-sm tracking-widest uppercase transition-colors",
            tab === "jogadores"
              ? "bg-foreground text-background"
              : "bg-background text-foreground hover:bg-muted",
          )}
        >
          JOGADORES
        </button>
      </div>

      {/* Tab content */}
      {tab === "times" ? <TimesTab /> : <JogadoresTab />}
    </div>
  )
}
