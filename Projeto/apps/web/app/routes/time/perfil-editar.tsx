import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UpsertTeamProfileRequestSchema,
  type UpsertTeamProfileRequest,
  TEAM_LEVELS,
  POSITIONS,
} from "~shared/contracts";
import { teamsApi, ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { Check, Save, X, Shield, Edit3 } from "lucide-react";

const POSITION_LABELS: Record<string, string> = {
  goleiro: "GOLEIRO",
  lateral: "LATERAL",
  zagueiro: "ZAGUEIRO",
  volante: "VOLANTE",
  meia: "MEIA",
  atacante: "ATACANTE",
};

const DAYS_OF_WEEK = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;

export function meta() {
  return [{ title: "Editar time - VárzeaPro" }];
}

export default function TimePerfilEditar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["team", "me"],
    queryFn: () => teamsApi.getMe(),
  });

  const [matchDays, setMatchDays] = useState<string[]>([]);

  const form = useForm<UpsertTeamProfileRequest>({
    resolver: zodResolver(UpsertTeamProfileRequestSchema),
    defaultValues: {
      name: "",
      level: "amador",
      region: "",
      city: "",
      description: "",
      openPositions: [],
      matchDays: [],
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        level: profile.level,
        region: profile.region ?? "",
        city: profile.city ?? "",
        description: profile.description ?? "",
        openPositions: profile.openPositions,
        matchDays: profile.matchDays ?? [],
      });
      setMatchDays(profile.matchDays ?? []);
    }
  }, [profile, form]);

  useEffect(() => {
    form.setValue("matchDays", matchDays);
  }, [matchDays, form]);

  const mutation = useMutation({
    mutationFn: (data: UpsertTeamProfileRequest) => teamsApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "me"] });
      toast.success("Time atualizado!");
      navigate("/time/perfil", { replace: true });
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Erro ao salvar.";
      toast.error(msg);
    },
  });

  const openPositions = form.watch("openPositions") ?? [];

  function togglePosition(pos: string) {
    const current = form.getValues("openPositions") ?? [];
    const next = current.includes(pos)
      ? current.filter((p) => p !== pos)
      : [...current, pos];
    form.setValue("openPositions", next);
  }

  function toggleDay(day: string) {
    setMatchDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="container max-w-2xl px-4 py-8">
        <p className="font-display tracking-widest text-2xl animate-pulse text-primary uppercase pt-10 text-center">
          ARRUMANDO A CASA...
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl px-4 py-8 sm:py-12 relative">
      {/* Decorative Blur */}
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />

      <div className="mb-10 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left sm:gap-6 border-b-4 border-foreground pb-8 relative z-10">
        <div className="flex size-20 shrink-0 items-center justify-center border-4 border-foreground bg-primary shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] mb-4 sm:mb-0">
          <Edit3 className="size-10 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-5xl tracking-wide text-foreground uppercase">
            REFORMA NO CLUBE
          </h1>
          <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase border-l-4 border-primary pl-3 hidden sm:block">
            MANTENHA A SEDE EM ORDEM PARA ATRAIR OS BONS JOGADORES.
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-10 relative z-10"
      >
        {/* Basic info */}
        <section className="space-y-6 border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <div className="border-b-4 border-foreground pb-4">
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              INFORMAÇÕES DO TIME
            </h2>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase opacity-80 mt-1">
              DADOS BÁSICOS DO ELENCO
            </p>
          </div>

          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="font-display text-xl tracking-wide uppercase"
              >
                NOME DO TIME
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                placeholder="Ex.: SEU TIME FC"
              />
              {form.formState.errors.name ? (
                <p className="text-sm font-bold tracking-widest text-destructive uppercase">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label className="font-display text-xl tracking-wide uppercase">
                NÍVEL
              </Label>
              <Select
                value={form.watch("level")}
                onValueChange={(v) =>
                  form.setValue("level", v as UpsertTeamProfileRequest["level"])
                }
              >
                <SelectTrigger className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-bold tracking-widest uppercase focus:ring-0 focus:border-primary transition-colors">
                  <SelectValue placeholder="SELECIONE UM NÍVEL" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-4 border-foreground">
                  {TEAM_LEVELS.map((l) => (
                    <SelectItem
                      key={l}
                      value={l}
                      className="font-bold tracking-widest uppercase cursor-pointer rounded-none focus:bg-primary focus:text-primary-foreground"
                    >
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label
                  htmlFor="region"
                  className="font-display text-xl tracking-wide uppercase"
                >
                  REGIÃO / BAIRRO
                </Label>
                <Input
                  id="region"
                  placeholder="EX.: ZONA SUL"
                  {...form.register("region")}
                  className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-display uppercase focus-visible:ring-0 focus-visible:border-primary transition-colors"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="city"
                  className="font-display text-xl tracking-wide uppercase"
                >
                  CIDADE
                </Label>
                <Input
                  id="city"
                  placeholder="EX.: SÃO PAULO"
                  {...form.register("city")}
                  className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-display uppercase focus-visible:ring-0 focus-visible:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="description"
                className="font-display text-xl tracking-wide uppercase"
              >
                HISTÓRIA DO TIME
              </Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Conte sobre o time, horários de treino, ano de fundação, rivalidades..."
                {...form.register("description")}
                className="rounded-none border-2 border-foreground bg-muted/50 p-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Open positions */}
        <section className="space-y-6 border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)] relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 border-l-4 border-b-4 border-foreground" />

          <div className="border-b-4 border-foreground pb-4 relative z-10">
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              CONTRATAÇÕES
            </h2>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase opacity-80 mt-1">
              QUAIS POSIÇÕES O TIME PRECISA PREENCHER?
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  className={cn(
                    "relative flex items-center justify-center gap-2 border-2 px-4 py-4 font-display text-xl tracking-wide uppercase transition-all",
                    openPositions.includes(pos)
                      ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                      : "border-foreground bg-muted/30 text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                  )}
                >
                  {openPositions.includes(pos) && (
                    <Check className="size-5 shrink-0" />
                  )}
                  <span>{POSITION_LABELS[pos] ?? pos}</span>
                </button>
              ))}
            </div>

            {openPositions.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {openPositions.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-2 border-2 border-foreground bg-foreground text-background px-4 py-2 font-display text-lg tracking-widest uppercase shadow-[2px_2px_0px_0px_var(--color-primary)] dark:shadow-[2px_2px_0px_0px_var(--color-primary)]"
                  >
                    {POSITION_LABELS[p] ?? p}
                    <button
                      type="button"
                      onClick={() => togglePosition(p)}
                      className="ml-1 hover:text-primary transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Match days */}
        <section className="space-y-6 border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <div className="border-b-4 border-foreground pb-4">
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              CALENDÁRIO DE JOGOS
            </h2>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase opacity-80 mt-1">
              QUANDO A BOLA ROLA
            </p>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "border-2 px-6 py-3 font-display text-xl tracking-wide transition-all uppercase flex-1 sm:flex-none",
                  matchDays.includes(day)
                    ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                    : "border-foreground bg-muted/30 text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-4 z-40 flex flex-col-reverse sm:flex-row items-center gap-4 border-4 border-foreground bg-background p-4 shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)] mt-12">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/time/perfil")}
            className="w-full sm:w-auto h-14 rounded-none border-2 border-foreground py-3 px-8 font-display text-xl tracking-widest text-foreground transition-all hover:bg-muted/50 uppercase"
          >
            CANCELAR
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full sm:flex-1 h-14 gap-3 rounded-none border-2 border-primary bg-primary py-3 px-8 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] uppercase disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <Save className="size-6" />
            {mutation.isPending ? "SALVANDO…" : "SALVAR ALTERAÇÕES"}
          </Button>
        </div>
      </form>
    </div>
  );
}
