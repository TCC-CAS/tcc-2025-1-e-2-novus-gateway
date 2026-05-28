import { ReportButton } from "~/components/report-button"
import { useParams, useNavigate, useLocation, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "~/lib/auth/auth-context"
import { playersApi, messagingApi, favoritesApi, galleryApi } from "~/lib/api-client"
import { canSearchPlayers } from "~/lib/auth"
import { OptimizedImage } from "~/components/optimized-image"
import { GalleryGrid } from "~/components/gallery-grid"
import { Button } from "~/components/ui/button"
import { MessageCircle, Users, MapPin, Activity, Trophy, Heart, Home, LogIn, Shield, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Perfil do jogador - VárzeaPro" }]
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

export default function JogadorPublicProfile() {
  const { id } = useParams()
  const { user, role } = useAuth()
  const canContact = !!user && canSearchPlayers(role)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: () => playersApi.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const contactMutation = useMutation({
    mutationFn: () => messagingApi.createConversation({ playerId: id! }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      const dest = role === "team" ? "/time/mensagens" : "/jogador/mensagens"
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

  const { data: galleryData } = useQuery({
    queryKey: ["gallery", profile?.userId],
    queryFn: () => galleryApi.listByUser(profile!.userId),
    enabled: !!profile?.userId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

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
                  role: "player" as const,
                  avatarUrl: profile!.photoUrl ?? null,
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
      toast.success(isFavorited ? "Favorito removido." : "Jogador favoritado!")
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
            <Link to="/times" className="hidden font-display text-xl tracking-wide text-foreground transition-colors hover:text-primary md:block">
              TIMES
            </Link>
            <Link to="/jogadores" className="hidden font-display text-xl tracking-wide text-primary border-b-2 border-primary md:block">
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

      {/* Loading state */}
      {isLoading && (
        <div className="mx-auto max-w-7xl px-6 py-20 flex flex-col items-center gap-6">
          {/* Hero skeleton */}
          <div className="w-full border-b-[8px] border-primary bg-foreground animate-pulse h-64" />
          <div className="w-full grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 border-2 border-foreground/20 bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {profile && (
        <main>
          {/* HERO — dark section com foto + nome */}
          <section className="border-b-[8px] border-primary bg-foreground">
            <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
              <Link
                to="/jogadores"
                className="inline-flex items-center gap-2 font-display text-xs tracking-[0.25em] uppercase text-background/50 hover:text-primary transition-colors mb-8"
              >
                <ArrowLeft className="size-3" />
                Jogadores
              </Link>

              <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
                {/* Left: photo + name */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                  {/* Photo */}
                  <div className="shrink-0 border-4 border-primary shadow-[8px_8px_0px_0px_var(--color-primary)] overflow-hidden bg-muted size-40 sm:size-52">
                    {profile.photoUrl ? (
                      <OptimizedImage
                        src={profile.photoUrl}
                        alt={`Foto de ${profile.name}`}
                        className="size-full object-cover object-top"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-foreground/10">
                        <Users className="size-16 text-background/20" />
                      </div>
                    )}
                  </div>

                  {/* Name + positions */}
                  <div>
                    <p className="font-display text-xs tracking-[0.3em] uppercase text-primary mb-2">
                      Perfil do jogador
                    </p>
                    <h1 className="font-display text-5xl sm:text-7xl leading-[0.85] tracking-tight text-background uppercase">
                      {profile.name}
                    </h1>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {profile.positions.length > 0
                        ? profile.positions.map((pos) => (
                            <span
                              key={pos}
                              className="bg-primary text-primary-foreground font-display text-sm tracking-widest uppercase px-3 py-1 font-black"
                            >
                              {pos}
                            </span>
                          ))
                        : (
                            <span className="border-2 border-background/30 text-background/50 font-display text-sm tracking-widest uppercase px-3 py-1">
                              POSIÇÃO INDEFINIDA
                            </span>
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
                      MANDAR PROPOSTA
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
                    <ReportButton entityType="player" entityId={id!} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* INFO GRID */}
          <section className="border-b-4 border-foreground px-6 py-10">
            <div className="mx-auto max-w-7xl grid gap-6 sm:grid-cols-3">
              <div className="border-2 border-foreground p-5 group hover:border-primary transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="size-4 text-primary" />
                  <h3 className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground">Físico</h3>
                </div>
                {profile.height || profile.weight ? (
                  <div className="space-y-1">
                    {profile.height && (
                      <p className="font-display text-2xl text-foreground font-black">
                        {profile.height}<span className="text-sm text-muted-foreground ml-1">cm</span>
                      </p>
                    )}
                    {profile.weight && (
                      <p className="font-display text-2xl text-foreground font-black">
                        {profile.weight}<span className="text-sm text-muted-foreground ml-1">kg</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="font-display text-sm tracking-widest text-muted-foreground uppercase">Não informado</p>
                )}
              </div>

              <div className="border-2 border-foreground p-5 hover:border-primary transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="size-4 text-primary" />
                  <h3 className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground">Disponibilidade</h3>
                </div>
                {profile.availability ? (
                  <p className="font-display text-xl text-foreground font-black uppercase">{profile.availability}</p>
                ) : (
                  <p className="font-display text-sm tracking-widest text-muted-foreground uppercase">Não informado</p>
                )}
              </div>

              <div className="border-2 border-foreground p-5 hover:border-primary transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="size-4 text-primary" />
                  <h3 className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground">Região</h3>
                </div>
                {profile.region ? (
                  <p className="font-display text-xl text-foreground font-black uppercase">{profile.region}</p>
                ) : (
                  <p className="font-display text-sm tracking-widest text-muted-foreground uppercase">Não informado</p>
                )}
              </div>
            </div>
          </section>

          {/* BIO */}
          {profile.bio && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-xs tracking-[0.35em] uppercase text-muted-foreground mb-5">Sobre o jogador</h2>
                <p className="text-xl font-medium leading-relaxed text-muted-foreground border-l-8 border-primary pl-6 py-1 max-w-3xl">
                  {profile.bio}
                </p>
              </div>
            </section>
          )}

          {/* HABILIDADES */}
          {profile.skills.length > 0 && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-xs tracking-[0.35em] uppercase text-muted-foreground mb-5">Habilidades</h2>
                <div className="flex flex-wrap gap-3">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="border-2 border-foreground bg-muted/30 px-4 py-2 font-display text-lg tracking-widest text-foreground uppercase shadow-[2px_2px_0px_0px_var(--color-primary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* GALERIA */}
          {galleryData && galleryData.data.length > 0 && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-xs tracking-[0.35em] uppercase text-muted-foreground mb-5">
                  Galeria de destaques
                </h2>
                <GalleryGrid items={galleryData.data} />
              </div>
            </section>
          )}

          {/* CTA — não logado */}
          {!user && (
            <section className="border-b-4 border-foreground bg-foreground px-6 py-12">
              <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-1">Quer entrar em contato?</p>
                  <h2 className="font-display text-3xl md:text-5xl leading-[0.9] text-background font-black uppercase">
                    CRIE SUA CONTA
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
                  MANDAR PROPOSTA
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
