import { ReportButton } from "~/components/report-button"
import { GlobalHeader } from "~/components/global-header"
import { useParams, useNavigate, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "~/lib/auth/auth-context"
import { playersApi, messagingApi, favoritesApi, galleryApi, connectionsApi } from "~/lib/api-client"
import { ConnectionButton } from "~/components/connection-button"
import { canSearchPlayers } from "~/lib/auth"
import { OptimizedImage } from "~/components/optimized-image"
import { GalleryGrid } from "~/components/gallery-grid"
import { Button } from "~/components/ui/button"
import { MessageCircle, Users, MapPin, Activity, Trophy, Heart, ArrowLeft, Star } from "lucide-react"
import { toast } from "sonner"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Perfil do jogador - VárzeaPro" }]
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

  const { data: connectionStatus } = useQuery({
    queryKey: ["connection-status", profile?.userId],
    queryFn: () => connectionsApi.getStatus(profile!.userId),
    enabled: !!user && !!profile && !isOwnProfile,
  })
  const isConnected = connectionStatus?.status === "accepted"

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
      <GlobalHeader />

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

      {!isLoading && !profile && (
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <p className="font-display text-xs tracking-[0.35em] uppercase text-primary mb-4">Erro 404</p>
          <h1 className="font-display text-5xl uppercase font-black text-foreground mb-4">JOGADOR NÃO ENCONTRADO</h1>
          <p className="text-muted-foreground mb-8">Esse perfil não existe ou foi removido.</p>
          <Link to="/jogadores" className="font-display text-sm tracking-widest uppercase border-2 border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors">
            VER TODOS OS JOGADORES
          </Link>
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
                    {profile.cardTier && profile.cardTier !== "none" && (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 font-display text-xs tracking-widest mb-2",
                        profile.cardTier === "gold" && "bg-amber-500 text-white",
                        profile.cardTier === "legendary" && "bg-yellow-400 text-yellow-900",
                      )}>
                        <Star className="size-3 fill-current" />
                        <span>{profile.cardTier === "gold" ? "CRAQUE" : "FENÔMENO"}</span>
                      </div>
                    )}
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
                      disabled={contactMutation.isPending || !isConnected}
                      title={!isConnected ? "Conecte-se ao jogador antes de mandar proposta" : undefined}
                      className="rounded-none border-2 border-background bg-background px-8 py-4 h-auto font-display text-lg tracking-widest text-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] hover:border-primary disabled:opacity-50 flex items-center gap-2"
                    >
                      <MessageCircle className="size-5" />
                      MANDAR PROPOSTA
                    </Button>
                  )}
                  {user && !isOwnProfile && (
                    <ConnectionButton targetUserId={profile.userId} />
                  )}
                  {profile.phone && (
                    <a
                      href={`https://wa.me/${profile.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 border-2 border-green-600 bg-green-600 text-white px-4 py-2 font-display text-xs tracking-widest uppercase hover:bg-green-700 hover:border-green-700 transition-colors shadow-[3px_3px_0px_0px_theme(colors.green.800)] hover:-translate-y-0.5"
                    >
                      <svg viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WHATSAPP
                    </a>
                  )}
                  {profile.phone && (
                    <a
                      href="/jogador/mensagens"
                      className="flex items-center gap-2 border-2 border-background/60 px-4 py-2 font-display text-xs tracking-widest uppercase text-background hover:bg-background/10 transition-colors"
                    >
                      <MessageCircle className="size-4" />
                      MENSAGEM
                    </a>
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

          {/* HISTÓRICO DE CLUBES */}
          {profile.careerHistory && profile.careerHistory.length > 0 && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-xs tracking-[0.35em] uppercase text-muted-foreground mb-5">Histórico de clubes</h2>
                <div className="space-y-3">
                  {profile.careerHistory.map((entry, idx) => (
                    <div key={idx} className="border-2 border-foreground p-4 flex flex-wrap gap-4 items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-xl font-black text-foreground uppercase">{entry.clubName}</p>
                        <p className="font-display text-sm tracking-widest text-muted-foreground mt-0.5">{entry.period}</p>
                        {entry.championships && (
                          <p className="text-sm font-medium text-muted-foreground mt-1">{entry.championships}</p>
                        )}
                      </div>
                      {(entry.gamesPlayed !== undefined || entry.goals !== undefined || entry.assists !== undefined) && (
                        <div className="flex gap-4 shrink-0">
                          {entry.gamesPlayed !== undefined && (
                            <div className="text-center">
                              <p className="font-display text-2xl font-black text-foreground">{entry.gamesPlayed}</p>
                              <p className="font-display text-[9px] tracking-widest text-muted-foreground uppercase">jogos</p>
                            </div>
                          )}
                          {entry.goals !== undefined && (
                            <div className="text-center">
                              <p className="font-display text-2xl font-black text-foreground">{entry.goals}</p>
                              <p className="font-display text-[9px] tracking-widest text-muted-foreground uppercase">gols</p>
                            </div>
                          )}
                          {entry.assists !== undefined && (
                            <div className="text-center">
                              <p className="font-display text-2xl font-black text-foreground">{entry.assists}</p>
                              <p className="font-display text-[9px] tracking-widest text-muted-foreground uppercase">assist.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ESTATÍSTICAS */}
          {profile.detailedStats && Object.values(profile.detailedStats).some((v) => v !== undefined) && (
            <section className="border-b-4 border-foreground px-6 py-10">
              <div className="mx-auto max-w-7xl">
                <h2 className="font-display text-xs tracking-[0.35em] uppercase text-muted-foreground mb-5">Estatísticas da carreira</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {([
                    { key: "gamesPlayed", label: "JOGOS" },
                    { key: "goals", label: "GOLS" },
                    { key: "assists", label: "ASSISTÊNCIAS" },
                    { key: "cleanSheets", label: "CLEAN SHEETS" },
                  ] as const).map(({ key, label }) =>
                    profile.detailedStats?.[key] !== undefined ? (
                      <div key={key} className="border-2 border-foreground p-4 text-center">
                        <p className="font-display text-4xl font-black text-foreground">{profile.detailedStats[key]}</p>
                        <p className="font-display text-[9px] tracking-widest text-muted-foreground uppercase mt-1">{label}</p>
                      </div>
                    ) : null
                  )}
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
          {(canContact || (user && !isOwnProfile) || profile.phone) && (
            <div className="sm:hidden border-t-4 border-foreground bg-background px-4 py-4 space-y-3">
              {canContact && (
                <Button
                  type="button"
                  onClick={() => contactMutation.mutate()}
                  disabled={contactMutation.isPending || !isConnected}
                  title={!isConnected ? "Conecte-se ao jogador antes de mandar proposta" : undefined}
                  className="w-full h-14 rounded-none border-2 border-foreground bg-foreground font-display text-xl tracking-widest text-background hover:bg-primary hover:border-primary transition-all uppercase gap-2 disabled:opacity-50"
                >
                  <MessageCircle className="size-5" />
                  MANDAR PROPOSTA
                </Button>
              )}
              {user && !isOwnProfile && (
                <ConnectionButton targetUserId={profile.userId} className="w-full justify-center" />
              )}
              {profile.phone && (
                <a
                  href={`https://wa.me/${profile.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 border-2 border-green-600 bg-green-600 text-white px-4 py-3 font-display text-sm tracking-widest uppercase hover:bg-green-700 hover:border-green-700 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="size-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WHATSAPP
                </a>
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

    </div>
  )
}
