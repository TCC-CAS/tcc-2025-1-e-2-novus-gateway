// app/routes/times.tsx
import { useState, useEffect } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, searchApi, playersApi, type PublicTeam } from "~/lib/api-client"
import { useAuth } from "~/lib/auth/auth-context"
import { TEAM_LEVELS, POSITIONS, TEAM_LINEUP_SEXES } from "~shared/contracts"
import type { TeamLineupSex, TeamSummary } from "~shared/contracts"
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
import { cn } from "~/lib/utils"
import {
  MapPin,
  Shield,
  ArrowRight,
  Search as SearchIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react"

export function meta() {
  return [{ title: "Times - VárzeaPro" }]
}

// Union of PublicTeam (has city) + TeamSummary (no city)
type CardTeam = {
  id: string
  name: string
  lineupSex?: string
  logoUrl?: string | null
  level: string
  region?: string | null
  city?: string | null
  openPositions: string[]
  cardTier?: "none" | "gold" | "legendary"
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
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {team.cardTier && team.cardTier !== "none" && (
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 font-display text-[8px] tracking-widest font-black leading-none",
              team.cardTier === "gold" && "bg-amber-500 text-white",
              team.cardTier === "legendary" && "bg-yellow-400 text-yellow-900",
            )}>
              <Star className="size-2.5 fill-current" />
              <span>{team.cardTier === "gold" ? "CRAQUE" : "FENÔMENO"}</span>
            </div>
          )}
          <span className="bg-foreground text-background font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
            {team.level}
          </span>
        </div>
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
  // Any authenticated user can use the full search endpoint
  const canSearch = !!user

  // Shared
  const [region, setRegion] = useState("")
  const [lineupSex, setLineupSex] = useState<TeamLineupSex | undefined>(undefined)
  const [page, setPage] = useState(1)

  // Player filters (only shown/used when canSearch)
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [openPosition, setOpenPosition] = useState<string | undefined>(undefined)

  // Public filter (submit-based)
  const [regionFilter, setRegionFilter] = useState("")
  const [lineupSexFilter, setLineupSexFilter] = useState<TeamLineupSex | undefined>(undefined)

  // Auto-fill position from player profile when role === "player"
  const { data: myProfile } = useQuery({
    queryKey: ["myPlayerProfile"],
    queryFn: () => playersApi.getMe(),
    enabled: role === "player",
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  useEffect(() => {
    if (myProfile?.positions?.length && !openPosition) {
      setOpenPosition(myProfile.positions[0])
    }
  }, [myProfile, openPosition])

  // ---------------------------------------------------------------- //
  // Public query (team, admin, unauthenticated)                        //
  // ---------------------------------------------------------------- //
  const { data: publicData, isLoading: publicLoading } = useQuery({
    queryKey: ["public", "teams", { page, region: regionFilter, lineupSex: lineupSexFilter }],
    queryFn: () => publicApi.teams({ page, pageSize: 12, region: regionFilter || undefined, lineupSex: lineupSexFilter }),
    enabled: !canSearch,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  // ---------------------------------------------------------------- //
  // Player search query (full filters)                                 //
  // ---------------------------------------------------------------- //
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search", "teams", { level, region, lineupSex, openPosition, page }],
    queryFn: () =>
      searchApi.teams({
        page,
        pageSize: 12,
        order: "asc",
        level: level as "amador" | "recreativo" | "semi-profissional" | "outro" | undefined,
        lineupSex,
        region: region || undefined,
        openPosition: openPosition || undefined,
      }),
    enabled: canSearch,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const isLoading = canSearch ? searchLoading : publicLoading
  const rawData = canSearch ? searchData : publicData
  const teams: CardTeam[] = (rawData?.data ?? []) as CardTeam[]

  function handlePublicSearch(e: React.FormEvent) {
    e.preventDefault()
    setRegionFilter(region)
    setLineupSexFilter(lineupSex)
    setPage(1)
  }

  function resetFilters() {
    setRegion("")
    setRegionFilter("")
    setLineupSex(undefined)
    setLineupSexFilter(undefined)
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
            {canSearch ? (
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
                <Select value={lineupSex ?? "all"} onValueChange={(v) => { setLineupSex(v === "all" ? undefined : (v as TeamLineupSex)); setPage(1) }}>
                  <SelectTrigger className="w-[150px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="ELENCO" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
                    {TEAM_LINEUP_SEXES.map((value) => (
                      <SelectItem key={value} value={value} className="font-bold tracking-widest uppercase text-xs">
                        {value === "male" ? "MASCULINO" : "FEMININO"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {(level || region || lineupSex || openPosition) && (
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
                <Select value={lineupSex ?? "all"} onValueChange={(v) => setLineupSex(v === "all" ? undefined : (v as TeamLineupSex))}>
                  <SelectTrigger className="w-[160px] rounded-none border-2 border-foreground font-display tracking-wide focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="Elenco" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
                    {TEAM_LINEUP_SEXES.map((value) => (
                      <SelectItem key={value} value={value} className="font-bold tracking-widest uppercase text-xs">
                        {value === "male" ? "MASCULINO" : "FEMININO"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" className="rounded-none border-2 border-foreground bg-foreground px-5 font-display tracking-widest text-background transition-all hover:bg-primary hover:border-primary hover:-translate-y-0.5">
                  <SearchIcon className="size-4 mr-2" />
                  BUSCAR
                </Button>
                {(regionFilter || lineupSexFilter) && (
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
        {!user && (
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
