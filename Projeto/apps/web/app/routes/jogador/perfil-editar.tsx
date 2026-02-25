import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UpsertPlayerProfileRequestSchema,
  type UpsertPlayerProfileRequest,
  POSITIONS,
} from "~shared/contracts";
import { playersApi, ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { Check, Save, X, User, Edit3 } from "lucide-react";

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
  return [{ title: "Editar Perfil - VárzeaPro" }];
}

export default function JogadorPerfilEditar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["player", "me"],
    queryFn: () => playersApi.getMe(),
  });

  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);

  const form = useForm<UpsertPlayerProfileRequest>({
    resolver: zodResolver(UpsertPlayerProfileRequestSchema),
    defaultValues: {
      name: "",
      positions: [],
      bio: "",
      skills: [],
      availability: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        positions: profile.positions,
        bio: profile.bio ?? "",
        skills: profile.skills,
        height: profile.height,
        weight: profile.weight,
        birthDate: profile.birthDate ?? "",
        phone: profile.phone ?? "",
        availability: profile.availability ?? "",
      });
      if (profile.availability) {
        setAvailabilityDays(
          profile.availability
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }
    }
  }, [profile, form]);

  useEffect(() => {
    form.setValue("availability", availabilityDays.join(", "));
  }, [availabilityDays, form]);

  const mutation = useMutation({
    mutationFn: (data: UpsertPlayerProfileRequest) => playersApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", "me"] });
      toast.success("Perfil atualizado!");
      navigate("/jogador/perfil", { replace: true });
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Erro ao salvar.";
      toast.error(msg);
    },
  });

  const positions = form.watch("positions");
  const skills = form.watch("skills");

  function togglePosition(pos: string) {
    const current = form.getValues("positions");
    const next = current.includes(pos)
      ? current.filter((p) => p !== pos)
      : [...current, pos];
    form.setValue("positions", next, { shouldValidate: true });
  }

  function toggleDay(day: string) {
    setAvailabilityDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="container max-w-2xl px-4 py-8">
        <p className="font-display tracking-widest text-2xl animate-pulse text-primary uppercase pt-10 text-center">
          PREPARANDO VESTIÁRIO...
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
            EDITAR PERFIL
          </h1>
          <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase border-l-4 border-primary pl-3 hidden sm:block">
            MANTENHA SEU CARTÃO DE VISITAS ATUALIZADO NO MERCADO DA VÁRZEA.
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
              DADOS BÁSICOS
            </h2>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase opacity-80 mt-1">
              QUEM É VOCÊ NA PELADA
            </p>
          </div>

          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="font-display text-xl tracking-wide uppercase"
              >
                NOME EM CAMPO
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
              />
              {form.formState.errors.name ? (
                <p className="text-sm font-bold tracking-widest text-destructive uppercase">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="bio"
                className="font-display text-xl tracking-wide uppercase"
              >
                SOBRE VOCÊ
              </Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Conte sobre sua experiência no futebol, títulos, times que passou..."
                {...form.register("bio")}
                className="rounded-none border-2 border-foreground bg-muted/50 p-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
              />
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="phone"
                className="font-display text-xl tracking-wide uppercase"
              >
                WHATSAPP{" "}
                <span className="text-muted-foreground text-sm tracking-widest">
                  (OPCIONAL)
                </span>
              </Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...form.register("phone")}
                className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors font-mono"
              />
            </div>
          </div>
        </section>

        {/* Positions */}
        <section className="space-y-6 border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)] relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 border-l-4 border-b-4 border-foreground" />

          <div className="border-b-4 border-foreground pb-4 relative z-10">
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              ÁREA DE ATUAÇÃO
            </h2>
          </div>

          <div className="pt-2 relative z-10">
            {form.formState.errors.positions ? (
              <p className="text-sm mb-4 font-bold tracking-widest text-destructive uppercase">
                {form.formState.errors.positions.message}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  className={cn(
                    "relative flex items-center justify-center gap-2 border-2 px-4 py-4 font-display text-xl tracking-wide uppercase transition-all",
                    positions.includes(pos)
                      ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                      : "border-foreground bg-muted/30 text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                  )}
                >
                  {positions.includes(pos) && (
                    <Check className="size-5 shrink-0" />
                  )}
                  <span>{POSITION_LABELS[pos] ?? pos}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="space-y-6 border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <div className="border-b-4 border-foreground pb-4">
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              ARSENAL
            </h2>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase opacity-80 mt-1">
              NO QUE VOCÊ SE DESTACA
            </p>
          </div>

          <div className="space-y-6 pt-2">
            <div className="space-y-3">
              <Input
                placeholder="Ex.: drible, passe longo, finalização, raça"
                value={Array.isArray(skills) ? skills.join(", ") : ""}
                onChange={(e) =>
                  form.setValue(
                    "skills",
                    e.target.value
                      ? e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [],
                  )
                }
                className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
              />
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase opacity-70">
                SEPARE OS PONTOS FORTES POR VÍRGULA
              </p>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {skills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 border-2 border-foreground bg-foreground text-background px-4 py-2 font-display text-lg tracking-widest uppercase shadow-[2px_2px_0px_0px_var(--color-primary)] dark:shadow-[2px_2px_0px_0px_var(--color-primary)]"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() =>
                        form.setValue(
                          "skills",
                          skills.filter((_, idx) => idx !== i),
                        )
                      }
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

        {/* Physical */}
        <section className="space-y-6 border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)]">
          <div className="border-b-4 border-foreground pb-4">
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              ATRIBUTOS FÍSICOS
            </h2>
          </div>

          <div className="pt-2">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label
                  htmlFor="height"
                  className="font-display text-xl tracking-wide uppercase"
                >
                  ALTURA{" "}
                  <span className="text-muted-foreground text-sm tracking-widest">
                    (CM)
                  </span>
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="175"
                  {...form.register("height", { valueAsNumber: true })}
                  className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-display focus-visible:ring-0 focus-visible:border-primary transition-colors"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="weight"
                  className="font-display text-xl tracking-wide uppercase"
                >
                  PESO{" "}
                  <span className="text-muted-foreground text-sm tracking-widest">
                    (KG)
                  </span>
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="75"
                  {...form.register("weight", { valueAsNumber: true })}
                  className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-display focus-visible:ring-0 focus-visible:border-primary transition-colors"
                />
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <Label
                htmlFor="birthDate"
                className="font-display text-xl tracking-wide uppercase"
              >
                DATA DE NASCIMENTO
              </Label>
              <Input
                id="birthDate"
                type="date"
                {...form.register("birthDate")}
                className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-mono focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase block w-full sm:max-w-xs"
              />
            </div>
          </div>
        </section>

        {/* Availability */}
        <section className="space-y-6 border-4 border-foreground bg-background p-6 shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <div className="border-b-4 border-foreground pb-4">
            <h2 className="font-display text-3xl tracking-wide text-foreground uppercase">
              AGENDA
            </h2>
            <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase opacity-80 mt-1">
              QUANDO VOCÊ PODE JOGAR
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
                  availabilityDays.includes(day)
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
            onClick={() => navigate("/jogador/perfil")}
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
