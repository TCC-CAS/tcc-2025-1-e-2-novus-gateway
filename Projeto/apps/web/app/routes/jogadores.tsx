// app/routes/jogadores.tsx
import { useState, useMemo } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, searchApi, type ShowcasePlayer } from "~/lib/api-client"
import { useAuth } from "~/lib/auth/auth-context"
import { usePlan } from "~/lib/plan"
import { UpsellCard } from "~/lib/plan/plan-gate"
import { isUnlimited, POSITIONS, PLAYER_LEVELS, SEX_FILTERS } from "~shared/contracts"
import type { Position, PlayerLevel, SexFilter } from "~shared/contracts"
import { cn } from "~/lib/utils"
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

// Union of ShowcasePlayer shape — city is optional
type CardPlayer = {
  id: string
  name: string
  sex?: string
  photoUrl?: string | null
  positions: string[]
  level?: string | null
  region?: string | null
  city?: string | null
  cardTier?: "none" | "gold" | "legendary"
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
  const tier = player.cardTier ?? "none"
  return (
    <Link
      to={`/jogadores/${player.id}`}
      className={cn(
        "group block bg-background cursor-pointer transition-all duration-200 hover:-translate-y-1",
        tier === "none" && "border-2 border-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
        tier === "gold" && "border-[3px] border-amber-500 hover:shadow-[4px_4px_0px_0px_theme(colors.amber.500)]",
        tier === "legendary" && "border-4 border-yellow-400 hover:shadow-[4px_4px_0px_0px_theme(colors.yellow.400)]",
      )}
    >
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
            tier === "none" && "bg-foreground/5",
            tier === "gold" && "bg-gradient-to-b from-amber-100 to-amber-200",
            tier === "legendary" && "bg-gradient-to-b from-yellow-100 to-yellow-300",
          )}>
            <Users className="size-14 text-foreground/15" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-foreground/95 via-foreground/50 to-transparent" />
        {tier !== "none" && (
          <div className={cn(
            "absolute top-2 left-2 z-10 px-1.5 py-0.5 font-display text-[8px] tracking-widest font-black leading-none",
            tier === "gold" && "bg-amber-500 text-white",
            tier === "legendary" && "bg-yellow-400 text-yellow-900",
          )}>
            {tier === "gold" ? "CRAQUE" : "FENÔMENO"}
          </div>
        )}
        {player.positions.length > 0 && (
          <div className={cn("absolute top-2 flex flex-wrap gap-1", tier !== "none" ? "right-2" : "left-2")}>
            {player.positions.slice(0, 2).map((pos) => (
              <span key={pos} className="bg-primary text-primary-foreground font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
                {pos}
              </span>
            ))}
          </div>
        )}
        {player.level && tier === "none" && (
          <span className="absolute top-2 right-2 bg-background border-2 border-foreground font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black text-foreground leading-none">
            {player.level}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className={cn(
            "font-display text-base leading-tight tracking-wide font-black uppercase truncate drop-shadow-sm",
            tier === "legendary" ? "text-yellow-300" : "text-background",
          )}>
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
      <div className={cn(
        "px-3 py-2 flex items-center justify-between border-t-2 transition-colors duration-200",
        tier === "none" && "border-foreground/10 group-hover:border-primary",
        tier === "gold" && "border-amber-500/30 group-hover:border-amber-500",
        tier === "legendary" && "border-yellow-400/30 group-hover:border-yellow-400",
      )}>
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Ver perfil</span>
        <ArrowRight className={cn(
          "size-3 transition-all duration-200 group-hover:translate-x-0.5",
          tier === "none" && "text-muted-foreground group-hover:text-primary",
          tier === "gold" && "text-amber-500",
          tier === "legendary" && "text-yellow-500",
        )} />
      </div>
    </Link>
  )
}

export default function JogadoresPublicos() {
  const { user, role } = useAuth()
  // Any authenticated user can use the full search endpoint
  const canSearch = !!user

  // Shared filters
  const [region, setRegion] = useState("")
  const [sex, setSex] = useState<SexFilter | undefined>(undefined)
  const [page, setPage] = useState(1)

  // Logged-in filters (only shown/used when canSearch)
  const [position, setPosition] = useState<string | undefined>(undefined)
  const [skills, setSkills] = useState("")
  const [level, setLevel] = useState<string | undefined>(undefined)

  // Public filter state (applied on form submit)
  const [regionFilter, setRegionFilter] = useState("")
  const [sexFilter, setSexFilter] = useState<SexFilter | undefined>(undefined)

  // Plan gating (only relevant for team searchers)
  const { getSearchResultsLimit } = usePlan()
  const searchLimit = getSearchResultsLimit()
  const isLimited = !isUnlimited(searchLimit)

  // ---------------------------------------------------------------- //
  // Public query (player, admin, unauthenticated)                      //
  // ---------------------------------------------------------------- //
  const { data: publicData, isLoading: publicLoading } = useQuery({
    queryKey: ["public", "players", { page, region: regionFilter, sex: sexFilter }],
    queryFn: () => publicApi.players({ page, pageSize: 12, region: regionFilter || undefined, sex: sexFilter }),
    enabled: !canSearch,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  // ---------------------------------------------------------------- //
  // Team search query (full filters, plan gating)                      //
  // ---------------------------------------------------------------- //
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search", "players", { position, skills, region, level, sex, page }],
    queryFn: () =>
      searchApi.players({
        page,
        pageSize: 12,
        order: "asc",
        position: position as Position | undefined,
        skills: skills || undefined,
        region: region || undefined,
        level: level as PlayerLevel | undefined,
        sex,
      }),
    enabled: canSearch,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const isLoading = canSearch ? searchLoading : publicLoading
  const rawData = canSearch ? searchData : publicData

  const visiblePlayers = useMemo<CardPlayer[]>(() => {
    if (!rawData) return []
    const players = rawData.data as CardPlayer[]
    if (role === "team" && isLimited) return players.slice(0, searchLimit)
    return players
  }, [rawData, role, isLimited, searchLimit])

  const hiddenCount = role === "team" ? (rawData?.data.length ?? 0) - visiblePlayers.length : 0

  function handlePublicSearch(e: React.FormEvent) {
    e.preventDefault()
    setRegionFilter(region)
    setSexFilter(sex)
    setPage(1)
  }

  function resetFilters() {
    setRegion("")
    setRegionFilter("")
    setSex(undefined)
    setSexFilter(undefined)
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
            {canSearch ? (
              /* Team: full filters (no submit button — reactive) */
              <div className="flex flex-wrap items-center gap-3 bg-background border-4 border-foreground p-2 shadow-[4px_4px_0px_0px_var(--color-primary)]">
                <div className="flex items-center gap-2 pl-2">
                  <Filter className="size-5 text-foreground" />
                  <span className="font-display text-sm tracking-widest text-foreground uppercase hidden sm:inline">FILTROS:</span>
                </div>
                <Select value={position ?? ""} onValueChange={(v) => { setPosition(v === "all" || v === "" ? undefined : v); setPage(1) }}>
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
                <Select value={sex ?? ""} onValueChange={(v) => { setSex(v === "all" || v === "" ? undefined : (v as SexFilter)); setPage(1) }}>
                  <SelectTrigger className="w-[140px] h-10 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest text-xs uppercase focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="SEXO" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
                    {SEX_FILTERS.map((value) => (
                      <SelectItem key={value} value={value} className="font-bold tracking-widest uppercase text-xs">
                        {value === "male" ? "MASCULINO" : "FEMININO"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={level ?? ""} onValueChange={(v) => { setLevel(v === "all" || v === "" ? undefined : v); setPage(1) }}>
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
                {(position || skills || region || level || sex) && (
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
                <Select value={sex ?? ""} onValueChange={(v) => setSex(v === "all" || v === "" ? undefined : (v as SexFilter))}>
                  <SelectTrigger className="w-[160px] rounded-none border-2 border-foreground font-display tracking-wide focus:ring-0 focus:border-primary">
                    <SelectValue placeholder="SEXO" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-4 border-foreground">
                    <SelectItem value="all" className="font-bold tracking-widest uppercase text-xs">TODOS</SelectItem>
                    {SEX_FILTERS.map((value) => (
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
                {(regionFilter || sexFilter) && (
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
        {!user && (
          <section className="border-t-4 border-foreground bg-foreground px-6 py-16">
            <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <p className="font-display text-sm tracking-[0.3em] text-primary uppercase mb-2">Pronto para jogar?</p>
                <h2 className="font-display text-[8vw] md:text-[4vw] leading-[0.9] text-background font-black uppercase">CRIE SEU PERFIL</h2>
                <p className="mt-4 text-background/60 font-medium">Conecte-se a times e jogadores da sua região — grátis.</p>
              </div>
              <Button asChild size="lg" className="h-auto rounded-none bg-primary border-2 border-primary px-5 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-background)] sm:px-10 sm:py-5 sm:text-2xl">
                <Link to="/cadastro">CRIAR CONTA GRÁTIS</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
