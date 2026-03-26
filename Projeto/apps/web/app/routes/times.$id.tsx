import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "~/lib/auth/auth-context";
import { teamsApi, messagingApi } from "~/lib/api-client";
import { canSearchTeams } from "~/lib/auth";
import { Button } from "~/components/ui/button";
import {
  MessageCircle,
  Shield,
  MapPin,
  Trophy,
  Search,
  Calendar,
} from "lucide-react";

export function meta() {
  return [{ title: "Perfil do time - VárzeaPro" }];
}

export default function TimePublicProfile() {
  const { id } = useParams();
  const { role } = useAuth();
  const canContact = canSearchTeams(role);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => teamsApi.getById(id!),
    enabled: !!id,
  });

  const contactMutation = useMutation({
    mutationFn: () => messagingApi.createConversation({ teamId: id! }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      const dest =
        role === "player" ? "/jogador/mensagens" : "/time/mensagens";
      navigate(`${dest}?conversationId=${conversation.id}`);
    },
  });

  if (isLoading || !profile) {
    return (
      <div className="container px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <Shield className="size-16 animate-pulse text-primary/50 mb-4" />
        <p className="font-display tracking-widest text-2xl animate-pulse text-primary uppercase">
          Mapeando time...
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl space-y-12 px-4 py-8 sm:px-6 sm:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -left-20 top-40 h-80 w-80 rounded-full bg-primary/20 blur-[100px]" />

      <div className="border-4 border-foreground bg-background shadow-[12px_12px_0px_0px_var(--color-foreground)] dark:shadow-[12px_12px_0px_0px_var(--color-foreground)] relative z-10">
        {/* Header Block */}
        <div className="border-b-4 border-foreground p-8 sm:p-12 relative">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              <div className="flex size-32 shrink-0 items-center justify-center border-4 border-foreground bg-primary shadow-[6px_6px_0px_0px_var(--color-foreground)] dark:shadow-[6px_6px_0px_0px_var(--color-foreground)] sm:size-48">
                <Shield className="size-20 text-foreground sm:size-28" />
              </div>

              <div className="text-center sm:text-left pt-2 sm:pt-4">
                <h1 className="font-display text-5xl tracking-wide text-foreground uppercase sm:text-7xl leading-[0.9]">
                  {profile.name}
                </h1>

                <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-4">
                  <div className="flex items-center gap-2 border-2 border-foreground bg-muted/50 px-4 py-2 shadow-[2px_2px_0px_0px_var(--color-primary)]">
                    <Trophy className="size-5 text-primary" />
                    <span className="font-bold tracking-widest text-sm text-foreground uppercase">
                      {profile.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-2 border-foreground bg-muted/50 px-4 py-2 shadow-[2px_2px_0px_0px_var(--color-primary)]">
                    <MapPin className="size-5 text-primary" />
                    <span className="font-bold tracking-widest text-sm text-foreground uppercase">
                      {profile.region ?? "SEM REGIÃO"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {canContact && (
              <Button
                type="button"
                onClick={() => contactMutation.mutate()}
                disabled={contactMutation.isPending}
                className="hidden sm:flex h-16 w-16 shrink-0 rounded-none border-4 border-foreground bg-primary p-0 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] self-start mt-4 disabled:opacity-50"
              >
                <MessageCircle className="size-8 text-foreground" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 sm:p-12">
          {profile.description ? (
            <div className="mb-12 border-l-8 border-primary pl-6 py-2 bg-muted/5">
              <p className="text-xl font-medium leading-relaxed text-muted-foreground italic">
                "{profile.description}"
              </p>
            </div>
          ) : (
            <div className="mb-12"></div>
          )}

          <div className="grid gap-8 sm:grid-cols-2">
            {/* Open Positions Grid Item */}
            <div className="border-4 border-foreground p-6 bg-background relative hover:bg-muted/5 transition-colors">
              <div className="absolute -top-6 -right-4 size-12 bg-primary flex items-center justify-center border-2 border-foreground rotate-12">
                <Search className="size-6 text-foreground" />
              </div>
              <h3 className="mb-6 font-display tracking-widest text-2xl text-foreground uppercase">
                BUSCANDO JOGADORES:
              </h3>

              {profile.openPositions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.openPositions.map((pos) => (
                    <span
                      key={pos}
                      className="border-2 border-foreground bg-primary/10 px-3 py-1.5 font-display text-lg tracking-widest text-primary uppercase"
                    >
                      {pos}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-foreground/30 p-4 text-center">
                  <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase opacity-80">
                    ELENCO FECHADO NO MOMENTO
                  </span>
                </div>
              )}
            </div>

            {/* Match Days Grid Item */}
            <div className="border-4 border-foreground p-6 bg-background relative hover:bg-muted/5 transition-colors">
              <div className="absolute -top-6 -right-4 size-12 bg-foreground flex items-center justify-center border-2 border-primary -rotate-6">
                <Calendar className="size-6 text-background" />
              </div>
              <h3 className="mb-6 font-display tracking-widest text-2xl text-foreground uppercase">
                DIAS DE JOGO:
              </h3>

              {profile.matchDays && profile.matchDays.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.matchDays.map((day) => (
                    <span
                      key={day}
                      className="border-2 border-foreground bg-foreground text-background px-3 py-1.5 font-display text-lg tracking-widest uppercase"
                    >
                      {day}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-foreground/30 p-4 text-center">
                  <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase opacity-80">
                    SEM CALENDÁRIO FIXO
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Contact Action */}
        {canContact && (
          <div className="sm:hidden border-t-4 border-foreground p-6 bg-primary/10">
            <Button
              type="button"
              onClick={() => contactMutation.mutate()}
              disabled={contactMutation.isPending}
              className="w-full h-16 rounded-none border-4 border-foreground bg-primary px-6 font-display text-xl tracking-widest text-foreground hover:bg-foreground hover:text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all uppercase gap-3 disabled:opacity-50"
            >
              <MessageCircle className="size-5" />
              ENTRAR EM CONTATO
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
