import { ReportButton } from "~/components/report-button"
import { useParams, useNavigate, useLocation, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "~/lib/auth/auth-context"
import { teamsApi, messagingApi, favoritesApi, matchesApi, type RosterMember } from "~/lib/api-client"
import { canSearchTeams } from "~/lib/auth"
import { OptimizedImage } from "~/components/optimized-image"
import { Button } from "~/components/ui/button"
import { MessageCircle, Shield, MapPin, Trophy, Search, Calendar, Heart, User, Home, LogIn, Users, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Perfil do time - VárzeaPro" }]
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
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {active && <div className="absolute top-0 left-0 w-full h-1 bg-primary" />}
              <item.icon className={cn("size-6", active ? "text-primary" : "text-foreground")} />
              <span className="sr-only sm:not-sr-only sm:mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-background" />
    </nav>
  )
}

export default function TimePublicProfile() {
  const { id } = useParams()
  const { user, role } = useAuth()
  const canContact = !!user && canSearchTeams(role)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => teamsApi.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const { data: rosterData } = useQuery({
    queryKey: ["team", id, "roster"],
    queryFn: () => teamsApi.getRoster(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const { data: upcomingMatches } = useQuery({
    queryKey: ["team", id, "matches", "upcoming"],
    queryFn: () => matchesApi.getTeamMatches(id!, { status: "scheduled", pageSize: 1 }),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const { data: recentMatches } = useQuery({
    queryKey: ["team", id, "matches", "completed"],
    queryFn: () => matchesApi.getTeamMatches(id!, { status: "completed", pageSize: 5 }),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const contactMutation = useMutation({
    mutationFn: () => messagingApi.createConversation({ teamId: id! }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      const dest = role === "player" ? "/jogador/mensagens" : "/time/mensagens"
      navigate(`${dest}?conversationId=${conversation.id}`)
    },
  })

  const { data: favorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesApi.list(),
    enabled: !!user,
  })

  const isFavorited = !!favorites?.data?.some((f) => f.targetUser.id === profile?.userId)
  const isOwnProfile = !!user && !!profile && user.id === profile.userId

  const favoriteMutation = useMutation({
    mutationFn: () =>
      isFavorited ? favoritesApi.remove(profile!.userId) : favoritesApi.add(profile!.userId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] })
      const previous = queryClient.getQueryData(["favorites"])
      queryClient.setQueryData(["favorites"], (old: typeof favorites) => {
        if (!old) return old
        const newData = isFavorited
          ? old.data.filter((f) => f.targetUser.id !== profile?.userId)
          : [
              {
                id: "optimistic",
                targetUser: {
                  id: profile!.userId,
                  name: profile!.name,
                  role: "team" as const,
                  avatarUrl: profile!.logoUrl ?? null,
                  profileId: profile!.id,
                },
                createdAt: new Date().toISOString(),
              },
              ...old.data,
            ]
        return { ...old, data: newData, meta: { ...old.meta, total: old.meta.total + (isFavorited ? -1 : 1) } }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["favorites"], context?.previous)
      toast.error("Erro ao atualizar favoritos.")
    },
    onSuccess: () => {
      toast.success(isFavorited ? "Favorito removido." : "Time favoritado!")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] })
    },
  })

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b-4 border-foreground bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-display text-2xl tracking-wider text-foreground transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/times" className="hidden font-display text-xl tracking-wide text-primary border-b-2 border-primary md:block">
              TIMES
            </Link>
            <Link to="/jogadores" className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary md:block">
              JOGADORES
            </Link>
            <Link to="/planos" className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary md:block">
              PLANOS
            </Link>
            <Link to="/login" className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary sm:block">
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

      {/* Loading */}
      {isLoading && (
        <div className="mx-auto max-w-7xl px-6 py-20 flex flex-col items-center gap-6">
          <div className="w-full border-b-[8px] border-primary bg-foreground animate-pulse h-64" />
          <div className="w-full grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 border-2 border-foreground/20 bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {profile && (
        <main>
          {/* HERO */}
          <section className="border-b-[8px] border-primary bg-foreground">
            <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
              <Link
                to="/times"
                className="inline-flex items-center gap-2 font-display text-xs tracking-[0.25em] uppercase text-background/50 hover:text-primary transition-colors mb-8"
              >
                <ArrowLeft className="size-3" />
                Times
              </Link>

              <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
                {/* Left: logo + name */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                  {/* Logo */}
                  <div className="shrink-0 border-4 border-primary shadow-[8px_8px_0px_0px_var(--color-primary)] overflow-hidden bg-background/10 size-40 sm:size-52 flex items-center justify-center">
                    {profile.logoUrl ? (
                      <OptimizedImage
                        src={profile.logoUrl}
                        alt={`Logo do ${profile.name}`}
                        className="size-32 sm:size-40 object-contain"
                      />
                    ) : (
                      <Shield className="size-20 text-background/20" />
                    )}
                  </div>

                  {/* Name + badges */}
                  <div>
                    <p className="font-display text-xs tracking-[0.3em] uppercase text-primary mb-2">
                      Perfil do time
                    </p>
                    <h1 className="font-display text-5xl sm:text-7xl leading-[0.85] tracking-tight text-background uppercase">
                      {profile.name}
                    </h1>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 bg-background/10 border border-background/20 px-3 py-1.5">
                        <Trophy className="size-3.5 text-primary" />
                        <span className="font-display text-sm tracking-widest text-background uppercase font-black">
                          {profile.level}
                        </span>
                      </div>
                      {profile.region && (
                        <div className="flex items-center gap-2 bg-background/10 border border-background/20 px-3 py-1.5">
                          <MapPin className="size-3.5 text-primary" />
                          <span className="font-display text-sm tracking-widest text-background uppercase font-black">
                            {profile.region}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions (desktop) */}
                <div className="hidden sm:flex flex-col gap-3 shrink-0">
                  {canContact && (
                    <Button
                      type="button"
                      onClick={() => contactMutation.mutate()}
                      disabled={contactMutation.isPending}
                      className="rounded-none border-2 border-background bg-background px-8 py-4 h-auto font-display text-lg tracking-widest text-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] hover:border-primary disabled:opacity-50 flex items-center gap-2"
                    >
                      <MessageCircle className="size-5" />
                      ENTRAR EM CONTATO
                    </Button>
                  )}
                  <div className="flex gap-2">
                    {user && !isOwnProfile && (
                      <Button
                        type="button"
                        onClick={() => favoriteMutation.mutate()}
                        disabled={favoriteMutation.isPending}
                        className={cn(
                          "rounded-none border-2 font-display text-sm tracking-widest uppercase px-4 py-2 h-auto transition-all disabled:opacity-50 flex items-center gap-2",
                          isFavorited
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-background/40 bg-transparent text-background hover:border-primary hover:text-primary",
                        )}
                      >
                        <Heart className={cn("size-4", isFavorited && "fill-current")} />
                        {isFavorited ? "FAVORITADO" : "FAVORITAR"}
                      </Button>
                    )}
                    <ReportButton entityType="team" entityId={id!} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* DESCRIÇÃO */}
          {profile.description && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <p className="text-xl font-medium leading-relaxed text-muted-foreground border-l-8 border-primary pl-6 py-1 max-w-3xl">
                  "{profile.description}"
                </p>
              </div>
            </section>
          )}

          {/* POSIÇÕES + DIAS */}
          <section className="border-b-4 border-foreground px-6 py-10">
            <div className="mx-auto max-w-7xl grid gap-6 sm:grid-cols-2">
              {/* Open positions */}
              <div className="border-2 border-foreground p-6 relative group hover:border-primary transition-colors">
                <div className="absolute -top-5 right-4 size-10 bg-primary flex items-center justify-center border-2 border-foreground">
                  <Search className="size-5 text-foreground" />
                </div>
                <h3 className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
                  Buscando jogadores
                </h3>
                {profile.openPositions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.openPositions.map((pos) => (
                      <span
                        key={pos}
                        className="border-2 border-primary bg-primary/8 px-3 py-1.5 font-display text-base tracking-widest text-primary uppercase font-black"
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-display text-sm tracking-widest text-muted-foreground uppercase border-2 border-dashed border-foreground/20 p-4 text-center">
                    Elenco fechado no momento
                  </p>
                )}
              </div>

              {/* Match days */}
              <div className="border-2 border-foreground p-6 relative group hover:border-primary transition-colors">
                <div className="absolute -top-5 right-4 size-10 bg-foreground flex items-center justify-center border-2 border-foreground">
                  <Calendar className="size-5 text-background" />
                </div>
                <h3 className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
                  Dias de jogo
                </h3>
                {profile.matchDays && profile.matchDays.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.matchDays.map((day) => (
                      <span
                        key={day}
                        className="border-2 border-foreground bg-foreground text-background px-3 py-1.5 font-display text-base tracking-widest uppercase font-black"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-display text-sm tracking-widest text-muted-foreground uppercase border-2 border-dashed border-foreground/20 p-4 text-center">
                    Sem calendário fixo
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ELENCO */}
          {rosterData && rosterData.members.length > 0 && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-xs tracking-[0.35em] uppercase text-muted-foreground mb-6">
                  Elenco <span className="text-foreground font-black">({rosterData.members.length})</span>
                </h2>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {rosterData.members.map((member: RosterMember) => (
                    <Link
                      key={member.id}
                      to={`/jogadores/${member.id}`}
                      className="group flex flex-col items-center gap-1.5 cursor-pointer"
                    >
                      <div className="size-14 border-2 border-foreground overflow-hidden bg-muted flex items-center justify-center group-hover:border-primary transition-colors">
                        {member.photoUrl ? (
                          <OptimizedImage
                            src={member.photoUrl}
                            alt={member.name}
                            className="size-full object-cover object-top"
                          />
                        ) : (
                          <User className="size-6 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-display text-[9px] tracking-wide uppercase text-center max-w-[56px] truncate text-muted-foreground group-hover:text-primary transition-colors">
                        {member.name.split(" ")[0]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* PARTIDAS */}
          {((upcomingMatches?.data && upcomingMatches.data.length > 0) ||
            (recentMatches?.data && recentMatches.data.length > 0)) && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-xs tracking-[0.35em] uppercase text-muted-foreground mb-6">Partidas</h2>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Próximo jogo */}
                  {upcomingMatches?.data[0] && (
                    <div className="border-4 border-primary bg-primary/5 p-6">
                      <p className="font-display text-[9px] tracking-[0.3em] uppercase text-primary mb-3">Próximo jogo</p>
                      <p className="font-display text-2xl font-black text-foreground uppercase leading-tight">
                        {upcomingMatches.data[0].opponentName
                          ? `vs ${upcomingMatches.data[0].opponentName}`
                          : "Adversário a confirmar"}
                      </p>
                      <p className="mt-2 font-bold text-muted-foreground text-sm">
                        {new Date(upcomingMatches.data[0].matchDate + "T00:00:00").toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                        {upcomingMatches.data[0].matchTime && ` às ${upcomingMatches.data[0].matchTime}`}
                      </p>
                      {(upcomingMatches.data[0].venueName || upcomingMatches.data[0].neighborhood) && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="size-3" />
                          {[upcomingMatches.data[0].venueName, upcomingMatches.data[0].neighborhood].filter(Boolean).join(" — ")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Últimas partidas */}
                  {recentMatches?.data && recentMatches.data.length > 0 && (
                    <div className="border-2 border-foreground p-6">
                      <p className="font-display text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Últimas partidas</p>
                      <div className="flex flex-col divide-y divide-foreground/10">
                        {recentMatches.data.map((match) => (
                          <div key={match.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                            <div>
                              <p className="font-display text-sm font-black uppercase">
                                {match.opponentName ? `vs ${match.opponentName}` : "Adversário"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(match.matchDate + "T00:00:00").toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            {match.result && (
                              <span className="font-display text-sm font-black text-foreground border-2 border-foreground px-2 py-0.5">
                                {match.result}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* CTA — não logado */}
          {!user && (
            <section className="border-b-4 border-foreground bg-foreground px-6 py-12">
              <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-1">Quer jogar nesse time?</p>
                  <h2 className="font-display text-3xl md:text-5xl leading-[0.9] text-background font-black uppercase">
                    CRIE SEU PERFIL
                  </h2>
                </div>
                <Button
                  asChild
                  className="rounded-none border-2 border-primary bg-primary px-8 py-4 h-auto font-display text-xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-background)]"
                >
                  <Link to="/cadastro">COMEÇAR GRÁTIS</Link>
                </Button>
              </div>
            </section>
          )}

          {/* MOBILE ACTIONS */}
          {(canContact || (user && !isOwnProfile)) && (
            <div className="sm:hidden border-t-4 border-foreground bg-background px-4 py-4 space-y-3">
              {canContact && (
                <Button
                  type="button"
                  onClick={() => contactMutation.mutate()}
                  disabled={contactMutation.isPending}
                  className="w-full h-14 rounded-none border-2 border-foreground bg-foreground font-display text-xl tracking-widest text-background hover:bg-primary hover:border-primary transition-all uppercase gap-2 disabled:opacity-50"
                >
                  <MessageCircle className="size-5" />
                  ENTRAR EM CONTATO
                </Button>
              )}
              {user && !isOwnProfile && (
                <Button
                  type="button"
                  onClick={() => favoriteMutation.mutate()}
                  disabled={favoriteMutation.isPending}
                  className={cn(
                    "w-full h-12 rounded-none border-2 font-display text-lg tracking-widest uppercase transition-all disabled:opacity-50 gap-2",
                    isFavorited
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-foreground bg-background text-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  <Heart className={cn("size-5", isFavorited && "fill-current")} />
                  {isFavorited ? "FAVORITADO" : "FAVORITAR"}
                </Button>
              )}
            </div>
          )}
        </main>
      )}

      <PublicNav />
    </div>
  )
}
