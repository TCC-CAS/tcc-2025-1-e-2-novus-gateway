import { ReportButton } from "~/components/report-button";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "~/lib/auth/auth-context";
import { playersApi, messagingApi } from "~/lib/api-client";
import { canSearchPlayers } from "~/lib/auth";
import { Button } from "~/components/ui/button";
import { MessageCircle, User, MapPin, Activity, Trophy } from "lucide-react";

export function meta() {
  return [{ title: "Perfil do jogador - VárzeaPro" }];
}

export default function JogadorPublicProfile() {
  const { id } = useParams();
  const { role } = useAuth();
  const canContact = canSearchPlayers(role);
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

          <div className="relative z-10 flex flex-col items-center text-center gap-6 sm:flex-row sm:text-left sm:gap-10">
            <div className="flex size-32 shrink-0 items-center justify-center border-4 border-foreground bg-background shadow-[6px_6px_0px_0px_var(--color-foreground)] dark:shadow-[6px_6px_0px_0px_var(--color-foreground)] sm:size-40">
              <User className="size-16 text-primary sm:size-24" />
            </div>

            <div>
              <h1 className="font-display text-5xl tracking-wide text-primary-foreground uppercase sm:text-7xl leading-[0.9]">
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
            {/* Report Button */}
            <div className="absolute top-0 right-0 p-6 sm:p-8">
                <ReportButton entityType="player" entityId={id!} />
            </div>
          </div>

          {canContact && (
            <Button
              type="button"
              size="lg"
              onClick={() => contactMutation.mutate()}
              disabled={contactMutation.isPending}
              className="absolute top-6 right-6 h-12 rounded-none border-2 border-foreground bg-background px-6 font-display text-xl tracking-widest text-primary hover:bg-foreground hover:text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all uppercase hidden sm:flex items-center gap-2 disabled:opacity-50"
            >
              <MessageCircle className="size-5" />
              MANDAR PROPOSTA
            </Button>
          )}
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
                SEM REGIÃO DEFINIDA
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
        </div>

        {/* Mobile Action Area */}
        {canContact && (
          <div className="border-t-4 border-foreground p-6 sm:hidden bg-primary/10">
            <Button
              type="button"
              onClick={() => contactMutation.mutate()}
              disabled={contactMutation.isPending}
              className="w-full h-16 rounded-none border-4 border-foreground bg-primary px-6 font-display text-2xl tracking-widest text-primary-foreground hover:bg-foreground hover:text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all uppercase disabled:opacity-50"
            >
              <MessageCircle className="size-6 mr-2" />
              MANDAR PROPOSTA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
