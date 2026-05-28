import { useState } from "react"
import { Link, useLocation } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, type ShowcasePlayer } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { OptimizedImage } from "~/components/optimized-image"
import { MapPin, Users, ArrowRight, Search as SearchIcon, Home, LogIn, Shield, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Jogadores - VárzeaPro" }]
}

const PUBLIC_NAV = [
  { label: "Início", href: "/", icon: Home },
  { label: "Times", href: "/times", icon: Shield },
  { label: "Jogadores", href: "/jogadores", icon: Users },
  { label: "Entrar", href: "/login", icon: LogIn },
]

function PublicNav() {
  const location = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t-4 border-foreground bg-background md:hidden">
      <div className="flex h-16 items-stretch">
        {PUBLIC_NAV.map((item) => {
          const active = location.pathname === item.href
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
              <item.icon
                className={cn("size-6", active ? "text-primary" : "text-foreground")}
              />
              <span className="sr-only sm:not-sr-only sm:mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-background" />
    </nav>
  )
}

function PlayerCardSkeleton() {
  return (
    <div className="border-2 border-foreground bg-muted animate-pulse">
      <div className="aspect-[2/3] bg-foreground/10 relative overflow-hidden">
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/8 to-transparent"
          style={{ animation: "shimmer 1.8s ease-in-out infinite" }}
        />
        {/* Position badge placeholder */}
        <div className="absolute top-2 left-2 h-4 w-12 bg-primary/20" />
        {/* Level badge placeholder */}
        <div className="absolute top-2 right-2 h-4 w-10 bg-foreground/20" />
        {/* Name placeholder */}
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

function PlayerCard({ player }: { player: ShowcasePlayer }) {
  return (
    <Link
      to={`/jogadores/${player.id}`}
      className="group block border-2 border-foreground bg-background cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
    >
      {/* Photo — tall trading-card aspect ratio */}
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

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-foreground/95 via-foreground/50 to-transparent" />

        {/* Position badges — top left */}
        {player.positions.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-4.5rem)]">
            {player.positions.slice(0, 2).map((pos) => (
              <span
                key={pos}
                className="bg-primary text-primary-foreground font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none"
              >
                {pos}
              </span>
            ))}
            {player.positions.length > 2 && (
              <span className="bg-primary/80 text-primary-foreground font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
                +{player.positions.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Level badge — top right */}
        {player.level && (
          <span className="absolute top-2 right-2 bg-background border-2 border-foreground font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black text-foreground leading-none">
            {player.level}
          </span>
        )}

        {/* Name + location overlay at photo bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3 pb-3">
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

      {/* Bottom strip */}
      <div className="px-3 py-2 flex items-center justify-between border-t-2 border-foreground/10 group-hover:border-primary transition-colors duration-200">
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Ver perfil</span>
        <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </Link>
  )
}

export default function JogadoresPublicos() {
  const [region, setRegion] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["public", "players", { page, region: regionFilter }],
    queryFn: () => publicApi.players({ page, pageSize: 12, region: regionFilter || undefined }),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setRegionFilter(region)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* HEADER — mesma navbar da home */}
      <header className="sticky top-0 z-20 border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-display text-2xl tracking-wider text-foreground transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/times"
              className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary md:block"
            >
              TIMES
            </Link>
            <Link
              to="/jogadores"
              className="hidden font-display text-xl tracking-wide text-primary border-b-2 border-primary md:block"
            >
              JOGADORES
            </Link>
            <Link
              to="/planos"
              className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary md:block"
            >
              PLANOS
            </Link>
            <Link
              to="/login"
              className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary sm:block"
            >
              ENTRAR
            </Link>
            <Button
              asChild
              className="rounded-none border-2 border-primary bg-primary px-6 font-display text-xl tracking-wider text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] hover:bg-primary"
            >
              <Link to="/cadastro">JOGAR AGORA</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO — editorial brutalist */}
        <section className="border-b-[8px] border-primary bg-foreground px-6 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <p className="font-display text-sm tracking-[0.35em] text-primary uppercase mb-3">
                Descubra talentos
              </p>
              <h1 className="font-display leading-[0.85] tracking-tight text-background text-[14vw] md:text-[9vw] lg:text-[7vw]">
                DESCUBRA
                <br />
                <span className="text-transparent [-webkit-text-stroke:2px_var(--color-primary)]">
                  JOGADORES
                </span>
              </h1>
            </div>
            <p className="max-w-sm border-l-4 border-primary pl-5 text-lg font-medium leading-relaxed text-background/65 md:text-right md:border-l-0 md:border-r-4 md:pr-5 md:pl-0">
              Encontre o talento certo para o seu time. Filtre por região e descubra quem está disponível perto de você.
            </p>
          </div>
        </section>

        {/* SEARCH BAR */}
        <section className="border-b-4 border-foreground bg-background px-6 py-4">
          <div className="mx-auto max-w-7xl">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
              <Input
                placeholder="Filtrar por região..."
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="max-w-sm rounded-none border-2 border-foreground font-display tracking-wide focus-visible:ring-0 focus-visible:border-primary transition-colors"
              />
              <Button
                type="submit"
                className="rounded-none border-2 border-foreground bg-foreground px-5 font-display tracking-widest text-background transition-all hover:bg-primary hover:border-primary hover:-translate-y-0.5"
              >
                <SearchIcon className="size-4 mr-2" />
                BUSCAR
              </Button>
              {regionFilter && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-2 border-foreground font-display text-sm tracking-widest hover:bg-muted"
                  onClick={() => { setRegion(""); setRegionFilter(""); setPage(1) }}
                >
                  LIMPAR
                </Button>
              )}
            </form>
            {regionFilter && (
              <p className="mt-2 font-display text-xs tracking-widest text-muted-foreground uppercase">
                Região: <span className="text-primary font-black">{regionFilter}</span>
              </p>
            )}
          </div>
        </section>

        {/* PLAYER GRID */}
        <section className="px-6 py-10">
          <div className="mx-auto max-w-7xl">
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 18 }).map((_, i) => (
                  <PlayerCardSkeleton key={i} />
                ))}
              </div>
            )}

            {data && data.data.length === 0 && (
              <div className="border-4 border-foreground p-16 text-center">
                <Users className="size-16 text-foreground/15 mx-auto mb-4" />
                <p className="font-display text-2xl tracking-widest text-foreground uppercase">
                  Nenhum jogador encontrado
                </p>
                <p className="text-muted-foreground mt-2">Tente uma região diferente</p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-none border-2 border-foreground font-display tracking-widest hover:bg-muted"
                  onClick={() => { setRegion(""); setRegionFilter(""); setPage(1) }}
                >
                  VER TODOS
                </Button>
              </div>
            )}

            {data && data.data.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="font-display text-xs tracking-[0.25em] text-muted-foreground uppercase">
                    <span className="text-foreground font-black text-sm">{data.meta.total}</span>{" "}
                    jogadores encontrados
                  </p>
                  <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                    Pg. {page}/{data.meta.totalPages}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {data.data.map((player: ShowcasePlayer) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>

                {/* Pagination */}
                {data.meta.totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      ANTERIOR
                    </Button>
                    <div className="border-2 border-foreground px-5 py-2 font-display text-sm tracking-widest bg-foreground text-background">
                      {page} / {data.meta.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-none border-2 border-foreground font-display tracking-widest text-sm hover:bg-muted disabled:opacity-40"
                      disabled={page === data.meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      PRÓXIMO
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="border-t-4 border-foreground bg-foreground px-6 py-16">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="font-display text-sm tracking-[0.3em] text-primary uppercase mb-2">Pronto para jogar?</p>
              <h2 className="font-display text-[8vw] md:text-[4vw] leading-[0.9] text-background font-black uppercase">
                CRIE SEU PERFIL
              </h2>
              <p className="mt-4 text-background/60 font-medium">
                Conecte-se a times e jogadores da sua região — grátis.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-auto rounded-none bg-primary border-2 border-primary px-10 py-5 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-background)]"
            >
              <Link to="/cadastro">CRIAR CONTA GRÁTIS</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Mobile bottom nav */}
      <PublicNav />
    </div>
  )
}
