import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { teamsApi } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import {
  Shield,
  Edit,
  Eye,
  Trophy,
  Calendar,
  MapPin,
  Search,
} from "lucide-react";

export function meta() {
  return [{ title: "Meu time - VárzeaPro" }];
}

export default function TimePerfil() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["team", "me"],
    queryFn: () => teamsApi.getMe(),
  });

  if (isLoading || !profile) {
    return (
      <div className="container px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="font-display tracking-widest text-2xl animate-pulse text-primary uppercase">
          MONTANDO TÁTICA...
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
            COMPLEXO DO TIME
          </h1>
          <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
            A VISÃO PÚBLICA DO SEU ELENCO
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            asChild
            className="gap-2 rounded-none border-2 border-foreground bg-background font-bold tracking-widest uppercase transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to={`/times/${profile.id}`}>
              <Eye className="size-4" />
              <span className="hidden sm:inline">VISÃO PUBLICA</span>
            </Link>
          </Button>
          <Button
            asChild
            className="gap-2 rounded-none border-2 border-foreground bg-primary font-bold tracking-widest text-primary-foreground uppercase transition-all hover:-translate-y-1 hover:bg-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to="/time/perfil/editar">
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
          <div className="flex size-32 shrink-0 items-center justify-center border-4 border-foreground bg-primary shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] sm:size-48">
            <Shield className="size-16 text-foreground sm:size-24" />
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <h2 className="font-display text-5xl tracking-wide sm:text-7xl uppercase leading-[0.9] text-foreground">
                {profile.name}
              </h2>

              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 border-2 border-foreground bg-muted/50 px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--color-primary)]">
                  <Trophy className="size-4 text-primary" />
                  <span className="font-bold tracking-widest text-xs text-foreground uppercase">
                    {profile.level}
                  </span>
                </div>
                <div className="flex items-center gap-2 border-2 border-foreground bg-muted/50 px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--color-primary)]">
                  <MapPin className="size-4 text-primary" />
                  <span className="font-bold tracking-widest text-xs text-foreground uppercase">
                    {profile.region ?? "SEM REGIÃO"}
                  </span>
                </div>
              </div>
            </div>

            <div className="max-w-3xl border-t-4 border-foreground pt-6">
              <h3 className="mb-3 font-display tracking-widest text-xl text-foreground uppercase">
                HISTÓRIA DO TIME
              </h3>
              {profile.description ? (
                <p className="text-lg font-medium leading-relaxed text-muted-foreground border-l-4 border-primary pl-4">
                  {profile.description}
                </p>
              ) : (
                <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase italic pb-4 border-b-2 border-dashed border-border">
                  FALTA REGISTRAR A HISTÓRIA. ADICIONE UMA DESCRIÇÃO.
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
              <div className="border-2 border-dashed border-foreground/30 p-4 relative bg-background hover:border-primary transition-colors hover:shadow-[4px_4px_0px_0px_var(--color-primary)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex size-8 items-center justify-center border-2 border-foreground bg-primary">
                    <Search className="size-4 text-foreground" />
                  </div>
                  <span className="font-display text-xl tracking-widest uppercase">
                    POSIÇÕES ABERTAS
                  </span>
                </div>
                {(profile.openPositions ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(profile.openPositions ?? []).map((pos) => (
                      <span
                        key={pos}
                        className="border-2 border-foreground bg-primary/10 px-2 py-1 font-display text-sm tracking-widest text-primary uppercase"
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                    ELENCO FECHADO
                  </span>
                )}
              </div>

              <div className="border-2 border-dashed border-foreground/30 p-4 relative bg-background hover:border-primary transition-colors hover:shadow-[4px_4px_0px_0px_var(--color-primary)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex size-8 items-center justify-center border-2 border-foreground bg-primary">
                    <Calendar className="size-4 text-foreground" />
                  </div>
                  <span className="font-display text-xl tracking-widest uppercase">
                    DIAS DE JOGO
                  </span>
                </div>
                {profile.matchDays && profile.matchDays.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.matchDays.map((day) => (
                      <span
                        key={day}
                        className="border-2 border-foreground bg-foreground text-background px-2 py-1 font-display text-sm tracking-widest uppercase"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                    SEM DATAS CADASTRADAS
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
