import { Link, Navigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { playersApi, galleryApi, ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { GalleryUpload } from "~/components/gallery-upload";
import { GalleryGrid } from "~/components/gallery-grid";
import {
  User,
  Edit,
  Eye,
  Trophy,
  Calendar,
  MapPin,
  Activity,
} from "lucide-react";
import { OptimizedImage } from "~/components/optimized-image";

export function meta() {
  return [{ title: "Meu perfil - VárzeaPro" }];
}

export default function JogadorPerfil() {
  const queryClient = useQueryClient()
  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ["player", "me"],
    queryFn: () => playersApi.getMe(),
  });

  const { data: galleryData } = useQuery({
    queryKey: ["gallery", "mine"],
    queryFn: () => galleryApi.listMine(),
  });

  const handleGalleryChange = () => {
    queryClient.invalidateQueries({ queryKey: ["gallery", "mine"] })
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return <Navigate to="/jogador/perfil/editar" replace />;
    }
    return (
      <div className="container px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="font-display tracking-widest text-2xl text-destructive uppercase">
          ERRO AO CARREGAR PERFIL
        </p>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="container px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="font-display tracking-widest text-2xl animate-pulse text-primary uppercase">
          CARREGANDO O CRAQUE...
        </p>
      </div>
    );
  }

  return (
    <div className="container space-y-12 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b-4 border-foreground pb-6">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-foreground uppercase">
            MEU PERFIL
          </h1>
          <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
            COMO OS TIMES TE VÊEM NO MERCADO
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            asChild
            className="gap-2 rounded-none border-2 border-foreground bg-background font-bold tracking-widest uppercase transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to={`/jogadores/${profile.id}`}>
              <Eye className="size-4" />
              <span className="hidden sm:inline">VISÃO PUBLICA</span>
            </Link>
          </Button>
          <Button
            asChild
            className="gap-2 rounded-none border-2 border-foreground bg-primary font-bold tracking-widest text-primary-foreground uppercase transition-all hover:-translate-y-1 hover:bg-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to="/jogador/perfil/editar">
              <Edit className="size-4" />
              EDITAR
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)] relative overflow-hidden sm:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary opacity-20 blur-[80px]" />

        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-start">
          {/* Avatar Block */}
          <OptimizedImage
            src={profile.photoUrl}
            size="xl"
            rounded
            alt={profile.name}
            className="shrink-0 !size-32 sm:!size-48 border-4 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]"
            fallback={
              <div className="flex size-full items-center justify-center bg-primary">
                <User className="size-16 text-foreground sm:size-24" />
              </div>
            }
          />

          <div className="flex-1 space-y-6">
            <div>
              <h2 className="font-display text-5xl tracking-wide sm:text-7xl uppercase leading-[0.9] text-foreground">
                {profile.name}
              </h2>

              <div className="mt-6 flex flex-wrap gap-2">
                {(profile.positions ?? []).map((p) => (
                  <span
                    key={p}
                    className="border-2 border-foreground bg-primary px-3 py-1.5 font-display text-lg tracking-widest text-primary-foreground uppercase shadow-[2px_2px_0px_0px_var(--color-foreground)] dark:shadow-[2px_2px_0px_0px_var(--color-foreground)]"
                  >
                    {p}
                  </span>
                ))}
                {(profile.positions ?? []).length === 0 && (
                  <span className="border-2 border-destructive bg-destructive/10 px-3 py-1.5 font-display text-lg tracking-widest text-destructive uppercase">
                    SEM POSIÇÃO DEFINIDA
                  </span>
                )}
              </div>
            </div>

            <div className="max-w-3xl">
              <h3 className="mb-2 font-bold tracking-widest text-muted-foreground uppercase text-xs">
                SOBRE O JOGADOR
              </h3>
              {profile.bio ? (
                <p className="text-lg font-medium leading-relaxed text-foreground border-l-4 border-primary pl-4">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase italic pb-4 border-b-2 border-dashed border-border">
                  CHUTEIRA NO PREGO. NENHUMA HISTÓRIA CONTADA.
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4 sm:gap-6 border-t-2 border-dashed border-foreground/20">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Activity className="size-4" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    HABILIDADES
                  </span>
                </div>
                {(profile.skills ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(profile.skills ?? []).slice(0, 3).map((skill, i) => (
                      <span
                        key={i}
                        className="text-sm font-bold tracking-widest text-foreground uppercase"
                      >
                        {skill}
                        {i < (profile.skills ?? []).length - 1 && i < 2 ? "," : ""}
                      </span>
                    ))}
                    {(profile.skills ?? []).length > 3 && (
                      <span className="text-sm font-bold tracking-widest text-primary uppercase">
                        +{profile.skills.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                    —
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Trophy className="size-4" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    FÍSICO
                  </span>
                </div>
                <div className="flex gap-2 text-sm font-bold tracking-widest text-foreground uppercase">
                  {(profile.height ?? profile.weight) ? (
                    <>
                      {profile.height && <span>{profile.height}CM</span>}
                      {profile.weight && <span>{profile.weight}KG</span>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              <div className="space-y-1 col-span-2 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Calendar className="size-4" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    DISPONIBILIDADE
                  </span>
                </div>
                {profile.availability ? (
                  <p className="text-sm font-bold tracking-widest text-foreground uppercase">
                    {profile.availability}
                  </p>
                ) : (
                  <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="space-y-6">
        <div className="border-b-4 border-foreground pb-4">
          <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
            GALERIA
          </h2>
          <p className="mt-1 text-sm font-bold tracking-widest text-muted-foreground uppercase">
            MOSTRE SEUS MELHORES MOMENTOS
          </p>
        </div>

        <GalleryUpload onUploadComplete={handleGalleryChange} />

        <GalleryGrid
          items={galleryData?.data ?? []}
          isOwner
          onDelete={async (id) => {
            await galleryApi.deleteItem(id)
            handleGalleryChange()
          }}
          onToggleHighlight={async (id, isHighlight) => {
            await galleryApi.update(id, { isHighlight })
            handleGalleryChange()
          }}
        />
      </div>
    </div>
  );
}
