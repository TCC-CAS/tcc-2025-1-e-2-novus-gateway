import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "~/lib/auth/auth-context";
import { usePlan } from "~/lib/plan";
import { PlanGate, UpsellCard } from "~/lib/plan/plan-gate";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { mockTeamSummaries } from "../../../mocks/fixtures/teams";
import {
  UserPlus,
  ArrowRight,
  User,
  Search,
  MessageCircle,
  Trophy,
  Eye,
  BadgeCheck,
} from "lucide-react";

export function meta() {
  return [{ title: "Início - VárzeaPro" }];
}

const PROFILE_STEPS = ["Nome", "Posição", "Região", "Foto", "Bio"];
const PROFILE_COMPLETED = 3;

export default function JogadorHome() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const suggested = mockTeamSummaries.slice(0, 4);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-12 px-4 py-8 sm:px-6">
      {/* Greeting */}
      <div className="flex items-end justify-between border-b-4 border-foreground pb-6">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-foreground uppercase">
            SALVE,{" "}
            <span className="text-primary">
              {user?.name?.split(" ")[0] ?? "JOGADOR"}
            </span>
          </h1>
          <p className="mt-2 font-bold tracking-widest text-muted-foreground uppercase">
            A BOLA ESTÁ ROLANDO. ENCONTRE TIMES E VÁ PRO JOGO.
          </p>
        </div>
      </div>

      {/* Profile completion banner - BRUTALIST STYLE */}
      <section className="relative overflow-hidden border-4 border-foreground bg-primary p-6 shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)]">
        {/* Decorative noise */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-10 mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")',
          }}
        />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-3xl tracking-wide text-primary-foreground">
              NÃO SE ESCONDA
            </h3>
            <p className="mt-1 font-bold tracking-widest text-primary-foreground/80 uppercase text-sm">
              PERFIL COMPLETO É CONVOCAÇÃO CERTA. {PROFILE_COMPLETED}/
              {PROFILE_STEPS.length} PASSOS.
            </p>
            <div className="mt-4 flex h-6 w-full max-w-sm border-2 border-foreground bg-primary-foreground/20 p-0.5">
              <div
                className="h-full bg-foreground transition-all"
                style={{
                  width: `${(PROFILE_COMPLETED / PROFILE_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <Button
            asChild
            className="shrink-0 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 py-6 font-display text-xl tracking-widest text-background hover:bg-background hover:text-foreground hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all uppercase"
          >
            <Link to="/jogador/perfil/editar">
              COMPLETAR
              <ArrowRight className="size-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Quick actions - BRUTALIST BENTO */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/jogador/perfil"
          className="group relative flex flex-col items-center gap-4 border-4 border-foreground bg-background p-8 text-center shadow-[4px_4px_0px_0px_var(--color-primary)] dark:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:hover:shadow-[8px_8px_0px_0px_var(--color-foreground)]"
        >
          <div className="flex size-16 items-center justify-center border-2 border-foreground bg-primary transition-transform group-hover:scale-110 group-hover:bg-foreground">
            <User className="size-8 text-foreground group-hover:text-background" />
          </div>
          <span className="font-display text-2xl tracking-widest text-foreground uppercase group-hover:text-primary">
            SEU PERFIL
          </span>
        </Link>

        <Link
          to="/jogador/buscar-times"
          className="group relative flex flex-col items-center gap-4 border-4 border-foreground bg-background p-8 text-center shadow-[4px_4px_0px_0px_var(--color-primary)] dark:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:hover:shadow-[8px_8px_0px_0px_var(--color-foreground)]"
        >
          <div className="flex size-16 items-center justify-center border-2 border-foreground bg-primary transition-transform group-hover:scale-110 group-hover:bg-foreground">
            <Search className="size-8 text-foreground group-hover:text-background" />
          </div>
          <span className="font-display text-2xl tracking-widest text-foreground uppercase group-hover:text-primary">
            MERCADO
          </span>
        </Link>

        <Link
          to="/jogador/mensagens"
          className="group relative flex flex-col items-center gap-4 border-4 border-foreground bg-background p-8 text-center shadow-[4px_4px_0px_0px_var(--color-primary)] dark:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:hover:shadow-[8px_8px_0px_0px_var(--color-foreground)]"
        >
          <div className="flex size-16 items-center justify-center border-2 border-foreground bg-primary transition-transform group-hover:scale-110 group-hover:bg-foreground">
            <MessageCircle className="size-8 text-foreground group-hover:text-background" />
          </div>
          <span className="font-display text-2xl tracking-widest text-foreground uppercase group-hover:text-primary">
            RESENHA
          </span>
        </Link>
      </section>

      {/* Suggested teams - BRUTALIST GRID */}
      <section className="pt-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end justify-between border-b-4 border-foreground pb-4">
          <h2 className="font-display text-4xl tracking-wide text-foreground uppercase">
            PENEIRA ABERTA
          </h2>
          <Button
            variant="outline"
            asChild
            className="gap-2 rounded-none border-2 border-foreground bg-background font-bold tracking-widest uppercase transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)] self-start sm:self-auto"
          >
            <Link to="/jogador/buscar-times">
              VER TODOS
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="border-4 border-foreground bg-background p-4"
              >
                <Skeleton className="h-8 w-3/4 rounded-none bg-muted/50" />
                <Skeleton className="mt-4 h-4 w-1/2 rounded-none bg-muted/50" />
                <Skeleton className="mt-6 h-6 w-full rounded-none bg-muted/50" />
              </div>
            ))
          ) : suggested.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center border-4 border-dashed border-foreground bg-muted/10 py-16 text-center">
              <UserPlus className="size-16 text-muted-foreground opacity-50" />
              <p className="mt-6 font-display text-3xl tracking-widest text-foreground uppercase">
                SEM SINAL DE JOGO
              </p>
              <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                AJUSTE SEU FILTRO PARA ENCONTRAR VAGAS
              </p>
              <Button
                asChild
                className="mt-6 rounded-none border-2 border-primary bg-primary px-8 py-6 font-display text-xl tracking-widest text-primary-foreground hover:bg-foreground hover:text-background hover:border-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)] transition-all uppercase"
              >
                <Link to="/jogador/buscar-times">IR PRO MERCADO</Link>
              </Button>
            </div>
          ) : (
            suggested.map((team) => (
              <Link
                key={team.id}
                to={`/times/${team.id}`}
                className="group flex flex-col justify-between border-4 border-foreground bg-background p-5 transition-transform hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_var(--color-primary)] dark:hover:shadow-[6px_6px_0px_0px_var(--color-primary)] relative overflow-hidden"
              >
                {/* Hover Decoration */}
                <div className="absolute -right-8 -top-8 size-24 rotate-12 bg-primary opacity-0 transition-opacity blur-2xl group-hover:opacity-20" />

                <div>
                  <h3 className="font-display text-3xl tracking-wide text-foreground uppercase leading-[0.9] group-hover:text-primary transition-colors">
                    {team.name}
                  </h3>
                  <div className="mt-4 flex items-center gap-2">
                    <Trophy className="size-4 text-muted-foreground" />
                    <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
                      {team.level}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Search className="size-4 text-muted-foreground" />
                    <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
                      {team.region || "SEM REGIÃO"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t-2 border-dashed border-foreground/30 pt-4">
                  <p className="mb-2 font-display text-sm tracking-widest text-foreground opacity-60 uppercase">
                    BUSCANDO:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {team.openPositions.slice(0, 3).map((pos) => (
                      <span
                        key={pos}
                        className="border-2 border-foreground bg-muted/50 px-2 py-1 font-display text-sm tracking-widest text-foreground uppercase group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                      >
                        {pos}
                      </span>
                    ))}
                    {team.openPositions.length > 3 && (
                      <span className="border-2 border-foreground bg-muted/50 px-2 py-1 font-display text-xs tracking-widest text-foreground uppercase flex items-center">
                        +{team.openPositions.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
      {/* Profile views upsell */}
      <section className="pt-4">
        <PlanGate
          feature="profileViews"
          fallback={
            <div>
              <div className="mb-4 flex items-center gap-3 border-b-4 border-foreground pb-4">
                <Eye className="size-6 text-primary" />
                <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
                  QUEM VIU SEU PERFIL
                </h2>
              </div>
              <div className="relative overflow-hidden">
                {/* Blurred preview */}
                <div className="pointer-events-none select-none blur-sm opacity-60">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 border-2 border-foreground p-4"
                      >
                        <div className="size-10 border-2 border-foreground bg-muted" />
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="mt-1 h-3 w-20 bg-muted/60 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <UpsellCard
                    title="3 TIMES VIRAM SEU PERFIL"
                    description="Descubra quais times estão de olho em você com o plano CRAQUE"
                    planName="CRAQUE"
                    compact
                  />
                </div>
              </div>
            </div>
          }
        >
          <div className="mb-4 flex items-center gap-3 border-b-4 border-foreground pb-4">
            <Eye className="size-6 text-primary" />
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              QUEM VIU SEU PERFIL
            </h2>
            <BadgeCheck className="size-5 text-primary" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            RECURSO DISPONÍVEL NO PLANO CRAQUE
          </p>
        </PlanGate>
      </section>
    </div>
  );
}
