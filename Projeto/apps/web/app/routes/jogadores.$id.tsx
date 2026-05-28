import { ReportButton } from "~/components/report-button";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "~/lib/auth/auth-context";
import { playersApi, messagingApi, favoritesApi, galleryApi } from "~/lib/api-client";
import { canSearchPlayers } from "~/lib/auth";
import { OptimizedImage } from "~/components/optimized-image";
import { GalleryGrid } from "~/components/gallery-grid";
import { Button } from "~/components/ui/button";
import { MessageCircle, User, MapPin, Activity, Trophy, Heart } from "lucide-react";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Perfil do jogador - VárzeaPro" }];
}

export default function JogadorPublicProfile() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const canContact = !!user && canSearchPlayers(role);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: () => playersApi.getById(id!),
    enabled: !!id,
  });

  const contactMutation = useMutation({
    mutationFn: () => messagingApi.createConversation({ playerId: id! }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      const dest = role === "team" ? "/time/mensagens" : "/jogador/mensagens";
      navigate(`${dest}?conversationId=${conversation.id}`);
    },
  });

  const { data: favorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesApi.list(),
    enabled: !!user,
  });

  const isFavorited = !!favorites?.data?.some((f) => f.targetUser.id === profile?.userId);
  const isOwnProfile = !!user && !!profile && user.id === profile.userId;

  const { data: galleryData } = useQuery({
    queryKey: ["gallery", profile?.userId],
    queryFn: () => galleryApi.listByUser(profile!.userId),
    enabled: !!profile?.userId,
  });

  const favoriteMutation = useMutation({
    mutationFn: () =>
      isFavorited
        ? favoritesApi.remove(profile!.userId)
        : favoritesApi.add(profile!.userId),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["favorites"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(["favorites"]);

      // Optimistically update
      queryClient.setQueryData(["favorites"], (old: typeof favorites) => {
        if (!old) return old;
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
            ];
        return { ...old, data: newData, meta: { ...old.meta, total: old.meta.total + (isFavorited ? -1 : 1) } };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      queryClient.setQueryData(["favorites"], context?.previous);
      toast.error("Erro ao atualizar favoritos.");
    },
    onSuccess: () => {
      toast.success(isFavorited ? "Favorito removido." : "Jogador favoritado!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  if (isLoading || !profile) {
    return (
      <div className="container px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <User className="size-16 animate-pulse text-primary/50 mb-4" />
        <p className="font-display tracking-widest text-2xl animate-pulse text-primary uppercase">
          BUSCANDO REGISTRO...
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl space-y-12 px-4 py-8 sm:px-6 sm:py-12 relative overflow-hidden">
      {/* Background Noise & Decorations */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")',
        }}
      />
      <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative z-10 border-4 border-foreground bg-background shadow-[12px_12px_0px_0px_var(--color-primary)] dark:shadow-[12px_12px_0px_0px_var(--color-primary)]">
        {/* Header Section */}
        <div className="border-b-4 border-foreground bg-primary p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 h-40 w-40 bg-background/10 rotate-12 blur-sm" />
          <div className="absolute bottom-0 right-0 h-1/2 w-full bg-linear-to-t from-background/40 to-transparent" />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col items-center text-center gap-6 sm:flex-row sm:text-left sm:gap-10 min-w-0">
                <OptimizedImage
                  src={profile.photoUrl}
                  alt={`Foto de ${profile.name}`}
                  size="xl"
                  rounded={false}
                  fallback={<User className="size-16 text-primary sm:size-24" />}
                  className="shadow-[6px_6px_0px_0px_var(--color-foreground)] dark:shadow-[6px_6px_0px_0px_var(--color-foreground)] shrink-0"
                />

                <div className="min-w-0">
                  <h1 className="font-display text-5xl tracking-wide text-primary-foreground uppercase sm:text-7xl leading-[0.9] break-words">
                    {profile.name}
                  </h1>

                  <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-3">
                    {profile.positions.map((p) => (
                      <span
                        key={p}
                        className="border-2 border-foreground bg-foreground text-background px-4 py-1.5 font-display text-lg tracking-widest uppercase shadow-[2px_2px_0px_0px_var(--color-background)]"
                      >
                        {p}
                      </span>
                    ))}
                    {profile.positions.length === 0 && (
                      <span className="border-2 border-foreground text-foreground px-4 py-1.5 font-display text-lg tracking-widest uppercase opacity-70">
                        POSIÇÃO INDEFINIDA
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden sm:flex flex-col items-stretch gap-3 lg:min-w-[18rem] lg:items-end lg:shrink-0">
                <div className="flex flex-wrap justify-end gap-2">
                  {user && !isOwnProfile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => favoriteMutation.mutate()}
                      disabled={favoriteMutation.isPending}
                      className={`rounded-none border-2 border-foreground font-display tracking-widest uppercase transition-all whitespace-nowrap ${
                        isFavorited
                          ? "bg-primary text-primary-foreground hover:bg-primary/80"
                          : "bg-background text-foreground hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      <Heart className={`size-4 mr-1 ${isFavorited ? "fill-current" : ""}`} />
                      {isFavorited ? "FAVORITADO" : "FAVORITAR"}
                    </Button>
                  )}
                  <ReportButton entityType="player" entityId={id!} />
                </div>
                {canContact && (
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => contactMutation.mutate()}
                    disabled={contactMutation.isPending}
                    className="h-12 w-full max-w-full rounded-none border-2 border-foreground bg-background px-6 font-display text-xl tracking-widest text-primary hover:bg-foreground hover:text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all uppercase flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                  >
                    <MessageCircle className="size-5" />
                    MANDAR PROPOSTA
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-8 sm:p-12 space-y-12">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="col-span-1 border-l-4 border-primary pl-4">
              <h3 className="font-display tracking-widest text-xl text-foreground uppercase flex items-center gap-2 mb-2">
                <Trophy className="size-5 text-primary" /> FÍSICO
              </h3>
              {profile.height || profile.weight ? (
                <div className="space-y-1">
                  {profile.height && (
                    <p className="font-bold tracking-widest text-sm text-muted-foreground uppercase">
                      ALTURA:{" "}
                      <span className="text-foreground text-lg">
                        {profile.height} CMC
                      </span>
                    </p>
                  )}
                  {profile.weight && (
                    <p className="font-bold tracking-widest text-sm text-muted-foreground uppercase">
                      PESO:{" "}
                      <span className="text-foreground text-lg">
                        {profile.weight} KG
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="font-bold tracking-widest text-[11px] text-muted-foreground uppercase italic pb-4">
                  NÃO INFORMADO
                </p>
              )}
            </div>

            <div className="col-span-1 border-l-4 border-primary pl-4">
              <h3 className="font-display tracking-widest text-xl text-foreground uppercase flex items-center gap-2 mb-2">
                <Activity className="size-5 text-primary" /> DISPONIBILIDADE
              </h3>
              {profile.availability ? (
                <p className="font-bold tracking-widest text-lg text-foreground uppercase">
                  {profile.availability}
                </p>
              ) : (
                <p className="font-bold tracking-widest text-[11px] text-muted-foreground uppercase italic pb-4">
                  NÃO INFORMADO
                </p>
              )}
            </div>

            <div className="col-span-1 border-l-4 border-primary pl-4">
              <h3 className="font-display tracking-widest text-xl text-foreground uppercase flex items-center gap-2 mb-2">
                <MapPin className="size-5 text-primary" /> REGIÃO
              </h3>
              <p className="font-bold tracking-widest text-[11px] text-muted-foreground uppercase italic pb-4">
                {profile.region || "REGIÃO NÃO INFORMADA"}
              </p>
            </div>
          </div>

          <div className="border-t-4 border-foreground pt-10">
            <h3 className="mb-6 font-display tracking-widest text-3xl text-foreground uppercase border-b-2 border-dashed border-foreground/30 pb-2 inline-block">
              HABILIDADES & DESTAQUES
            </h3>
            {profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="border-2 border-foreground bg-muted/30 px-4 py-2 font-display text-xl tracking-widest text-foreground uppercase shadow-[2px_2px_0px_0px_var(--color-primary)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase italic pb-4">
                NENHUMA HABILIDADE CADASTRADA.
              </p>
            )}
          </div>

          <div className="border-t-4 border-foreground pt-10">
            <h3 className="mb-4 font-display tracking-widest text-3xl text-foreground uppercase">
              SOBRE O JOGADOR
            </h3>
            {profile.bio ? (
              <p className="text-xl font-medium leading-relaxed text-muted-foreground bg-muted/10 p-6 border-l-4 border-foreground">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase italic pb-4">
                SEM BIOGRAFIA CADASTRADA.
              </p>
            )}
          </div>

          {/* Public Gallery */}
          {galleryData && galleryData.data.length > 0 && (
            <div className="border-t-4 border-foreground pt-10">
              <h3 className="mb-6 font-display tracking-widest text-3xl text-foreground uppercase border-b-2 border-dashed border-foreground/30 pb-2 inline-block">
                GALERIA
              </h3>
              <GalleryGrid items={galleryData.data} />
            </div>
          )}
        </div>

        {/* Mobile Action Area */}
        {(canContact || (user && !isOwnProfile)) && (
          <div className="border-t-4 border-foreground p-6 sm:hidden bg-primary/10 space-y-3">
            {canContact && (
              <Button
                type="button"
                onClick={() => contactMutation.mutate()}
                disabled={contactMutation.isPending}
                className="w-full h-16 rounded-none border-4 border-foreground bg-primary px-6 font-display text-2xl tracking-widest text-primary-foreground hover:bg-foreground hover:text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all uppercase disabled:opacity-50"
              >
                <MessageCircle className="size-6 mr-2" />
                MANDAR PROPOSTA
              </Button>
            )}
            {user && !isOwnProfile && (
              <Button
                type="button"
                onClick={() => favoriteMutation.mutate()}
                disabled={favoriteMutation.isPending}
                className={`w-full h-14 rounded-none border-4 border-foreground px-6 font-display text-xl tracking-widest uppercase transition-all disabled:opacity-50 ${
                  isFavorited
                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                    : "bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
                }`}
              >
                <Heart className={`size-5 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                {isFavorited ? "FAVORITADO" : "FAVORITAR"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
