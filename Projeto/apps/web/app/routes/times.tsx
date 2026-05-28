import { useState } from "react"
import { Link, useLocation } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, type PublicTeam } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { OptimizedImage } from "~/components/optimized-image"
import { MapPin, Shield, Users, ArrowRight, Search as SearchIcon, Home, LogIn, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Times - VárzeaPro" }]
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

function TeamCardSkeleton() {
  return (
    <div className="border-2 border-foreground animate-pulse">
      {/* Logo area */}
      <div className="aspect-[4/3] bg-foreground/8 flex items-center justify-center relative overflow-hidden">
        <div className="size-20 bg-foreground/15 rounded-sm" />
        <div className="absolute top-2 right-2 h-4 w-12 bg-foreground/20" />
      </div>
      {/* Info area */}
      <div className="p-4 border-t-2 border-foreground/10 space-y-2">
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

function TeamCard({ team }: { team: PublicTeam }) {
  return (
    <Link
      to={`/times/${team.id}`}
      className="group block border-2 border-foreground bg-background cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
    >
      {/* Logo area — landscape with large logo */}
      <div className="aspect-[4/3] relative overflow-hidden bg-foreground/5 flex items-center justify-center border-b-2 border-foreground/10 group-hover:border-primary transition-colors duration-200">
        {team.logoUrl ? (
          <OptimizedImage
            src={team.logoUrl}
            alt={team.name}
            className="size-28 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Shield className="size-16 text-foreground/15 group-hover:text-foreground/30 transition-colors duration-200" />
            <span className="font-display text-[9px] tracking-[0.25em] uppercase text-foreground/20">Sem escudo</span>
          </div>
        )}

        {/* Level badge — top right */}
        <span className="absolute top-2 right-2 bg-foreground text-background font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none">
          {team.level}
        </span>

        {/* Subtle bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-foreground/8 to-transparent" />
      </div>

      {/* Info */}
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

        {/* Open positions */}
        {team.openPositions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {team.openPositions.slice(0, 3).map((pos) => (
              <span
                key={pos}
                className="border border-primary/40 bg-primary/8 text-primary font-display text-[8px] tracking-widest uppercase px-1.5 py-0.5 font-black leading-none"
              >
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

      {/* Bottom strip */}
      <div className="px-3 py-2 flex items-center justify-between border-t-2 border-foreground/10 group-hover:border-primary transition-colors duration-200">
        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Ver time</span>
        <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </Link>
  )
}

export default function TimesPublicos() {
  const [region, setRegion] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["public", "teams", { page, region: regionFilter }],
    queryFn: () => publicApi.teams({ page, pageSize: 12, region: regionFilter || undefined }),
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
              className="hidden font-display text-xl tracking-wide text-primary border-b-2 border-primary md:block"
            >
              TIMES
            </Link>
            <Link
              to="/jogadores"
              className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary md:block"
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
        {/* HERO */}
        <section className="border-b-[8px] border-primary bg-foreground px-6 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <p className="font-display text-sm tracking-[0.35em] text-primary uppercase mb-3">
                Encontre seu time
              </p>
              <h1 className="font-display leading-[0.85] tracking-tight text-background text-[14vw] md:text-[9vw] lg:text-[7vw]">
                ENCONTRE
                <br />
                <span className="text-transparent [-webkit-text-stroke:2px_var(--color-primary)]">
                  TIMES
                </span>
              </h1>
            </div>
            <p className="max-w-sm border-l-4 border-primary pl-5 text-lg font-medium leading-relaxed text-background/65 md:text-right md:border-l-0 md:border-r-4 md:pr-5 md:pl-0">
              Times que buscam jogadores comprometidos. Filtre por região e encontre onde jogar.
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

        {/* TEAMS GRID */}
        <section className="px-6 py-10">
          <div className="mx-auto max-w-7xl">
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <TeamCardSkeleton key={i} />
                ))}
              </div>
            )}

            {data && data.data.length === 0 && (
              <div className="border-4 border-foreground p-16 text-center">
                <Shield className="size-16 text-foreground/15 mx-auto mb-4" />
                <p className="font-display text-2xl tracking-widest text-foreground uppercase">
                  Nenhum time encontrado
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
                    times encontrados
                  </p>
                  <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
                    Pg. {page}/{data.meta.totalPages}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {data.data.map((team: PublicTeam) => (
                    <TeamCard key={team.id} team={team} />
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
              <p className="font-display text-sm tracking-[0.3em] text-primary uppercase mb-2">Pronto para competir?</p>
              <h2 className="font-display text-[8vw] md:text-[4vw] leading-[0.9] text-background font-black uppercase">
                CADASTRE
                <br />
                SEU TIME
              </h2>
              <p className="mt-4 text-background/60 font-medium">
                Junte-se a centenas de times na plataforma — grátis.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-auto rounded-none bg-primary border-2 border-primary px-10 py-5 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-background)]"
            >
              <Link to="/cadastro">CRIAR CONTA</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Mobile bottom nav */}
      <PublicNav />
    </div>
  )
}
