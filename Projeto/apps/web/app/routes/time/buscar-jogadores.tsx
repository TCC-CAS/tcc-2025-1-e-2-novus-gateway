import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "~/lib/api-client";
import { usePlan } from "~/lib/plan";
import { UpsellCard } from "~/lib/plan/plan-gate";
import { isUnlimited } from "~shared/contracts";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { POSITIONS } from "~shared/contracts";
import {
  Filter,
  ArrowRight,
  Search as SearchIcon,
  MapPin,
  Activity,
} from "lucide-react";

export function meta() {
  return [{ title: "Buscar jogadores - VárzeaPro" }];
}

export default function TimeBuscarJogadores() {
  const [position, setPosition] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { getSearchResultsLimit } = usePlan();
  const searchLimit = getSearchResultsLimit();
  const isLimited = !isUnlimited(searchLimit);

  const { data, isLoading } = useQuery({
    queryKey: ["search", "players", { position, page }],
    queryFn: () =>
      searchApi.players({
        page,
        pageSize: 12,
        position: position as import("~shared/contracts").Position | undefined,
      }),
  });

  const visiblePlayers = useMemo(() => {
    if (!data) return [];
    if (isLimited) return data.data.slice(0, searchLimit);
    return data.data;
  }, [data, isLimited, searchLimit]);

  const hiddenCount = (data?.data.length ?? 0) - visiblePlayers.length;

  return (
    <div className="container space-y-8 px-4 py-8 sm:px-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b-4 border-foreground pb-8">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-foreground uppercase">
            CAÇA-TALENTOS
          </h1>
          <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
            TRAGA REFORÇOS DE PESO PARA O SEU ELENCO
          </p>
        </div>

        <div className="flex items-center gap-4 bg-background border-4 border-foreground p-2 shadow-[4px_4px_0px_0px_var(--color-primary)] dark:shadow-[4px_4px_0px_0px_var(--color-primary)]">
          <div className="flex items-center gap-2 pl-2">
            <Filter className="size-5 text-foreground" />
            <span className="font-display text-lg tracking-widest text-foreground uppercase pt-1 hidden sm:inline">
              POSIÇÃO:
            </span>
          </div>
          <Select
            value={position ?? "all"}
            onValueChange={(v) => setPosition(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="w-[200px] h-12 rounded-none border-2 border-foreground bg-muted/50 font-bold tracking-widest uppercase focus:ring-0 focus:border-primary transition-colors">
              <SelectValue placeholder="QUALQUER POSIÇÃO" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-4 border-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]">
              <SelectItem
                value="all"
                className="font-bold tracking-widest uppercase cursor-pointer rounded-none focus:bg-primary focus:text-primary-foreground"
              >
                TODAS AS POSIÇÕES
              </SelectItem>
              {POSITIONS.map((p) => (
                <SelectItem
                  key={p}
                  value={p}
                  className="font-bold tracking-widest uppercase cursor-pointer rounded-none focus:bg-primary focus:text-primary-foreground"
                >
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <SearchIcon className="size-16 animate-pulse text-primary/50 mb-4" />
          <p className="font-display tracking-widest text-2xl animate-pulse text-primary uppercase">
            Mapeando olheiros...
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePlayers.map((player) => (
              <div
                key={player.id}
                className="group flex flex-col justify-between border-4 border-foreground bg-background transition-transform hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_var(--color-primary)] dark:hover:shadow-[8px_8px_0px_0px_var(--color-primary)] relative"
              >
                <div className="p-5 pb-0 flex-1">
                  <h3 className="font-display text-4xl tracking-wide text-foreground uppercase leading-[0.9] group-hover:text-primary transition-colors">
                    {player.name}
                  </h3>

                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
                        SEM REGIÃO DEFINIDA
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 mt-4">
                  <div className="border-t-2 border-dashed border-foreground/30 pt-4 pb-6">
                    <p className="mb-3 font-bold tracking-widest text-[10px] text-foreground opacity-60 uppercase">
                      ATUAÇÃO EM CAMPO:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {player.positions.map((pos) => (
                        <span
                          key={pos}
                          className="border border-foreground bg-muted/50 px-2.5 py-1 font-display text-sm tracking-widest text-foreground uppercase"
                        >
                          {pos}
                        </span>
                      ))}
                      {player.positions.length === 0 && (
                        <span className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                          Posição indefinida
                        </span>
                      )}
                    </div>
                  </div>

                  {player.skills.length > 0 && (
                    <div className="border-t-2 border-dashed border-foreground/30 pt-4 pb-6">
                      <p className="mb-2 font-display text-sm tracking-widest text-foreground opacity-60 uppercase flex items-center gap-1">
                        <Activity className="size-3" /> DESTAQUES
                      </p>
                      <p className="font-bold tracking-widest text-[11px] text-muted-foreground uppercase leading-relaxed">
                        {player.skills.slice(0, 3).join(" · ")}
                        {player.skills.length > 3 && " · +"}
                      </p>
                    </div>
                  )}

                  <Button
                    asChild
                    className="w-full h-14 rounded-none border-2 border-foreground bg-foreground font-display text-xl tracking-widest text-background uppercase transition-all hover:bg-background hover:text-foreground hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)] group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground gap-2"
                  >
                    <Link to={`/jogadores/${player.id}`}>
                      ANALISAR CRAQUE
                      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}

            {data.data.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center border-4 border-dashed border-foreground bg-muted/10 py-24 text-center">
                <p className="font-display text-4xl tracking-widest text-foreground uppercase">
                  NENHUM JOGADOR ENCONTRADO
                </p>
                <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                  TENTE ALTERAR O FILTRO DE POSIÇÃO
                </p>
              </div>
            )}
          </div>

          {hiddenCount > 0 ? (
            <div className="mt-8">
              <UpsellCard
                title={`+${hiddenCount} JOGADORES DISPONÍVEIS`}
                description={`Seu plano mostra apenas ${searchLimit} resultados por busca. Desbloqueie todos os jogadores com o plano TITULAR.`}
                planName="TITULAR"
              />
            </div>
          ) : null}

          {data.meta.totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-12 mb-8 pt-8 border-t-4 border-foreground">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-12 rounded-none border-2 border-foreground bg-background px-6 font-display text-lg tracking-widest uppercase transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                ANTERIOR
              </Button>
              <div className="flex items-center justify-center border-2 border-foreground bg-muted/50 px-6 font-display text-xl tracking-widest text-foreground">
                {page} <span className="text-muted-foreground mx-1">/</span>{" "}
                {data.meta.totalPages}
              </div>
              <Button
                variant="outline"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-12 rounded-none border-2 border-foreground bg-background px-6 font-display text-lg tracking-widest uppercase transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                PRÓXIMA
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
