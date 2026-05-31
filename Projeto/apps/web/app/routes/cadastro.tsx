import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PLAYER_SEXES, SignUpRequestSchema, type PlayerSex, type SignUpRequest } from "~shared/contracts";
import { authApi } from "~/lib/api-client";
import { useAuth } from "~/lib/auth/auth-context";
import { ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldGroup, FieldSet } from "~/components/ui/field";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { Users, User } from "lucide-react";

function formatCpf(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11)
}

export function meta() {
  return [{ title: "Cadastrar - VárzeaPro" }];
}

const ROLES: {
  value: "player" | "team";
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "player",
    label: "JOGADOR",
    description: "BUSCO TIMES E PARTIDAS",
    icon: <User className="size-8" />,
  },
  {
    value: "team",
    label: "TIME",
    description: "BUSCO JOGADORES PRO ELENCO",
    icon: <Users className="size-8" />,
  },
];

const PLAYER_SEX_LABELS: Record<PlayerSex, string> = {
  male: "MASCULINO",
  female: "FEMININO",
  rather_not_say: "PREFIRO NÃO DIZER",
};

export default function Cadastro() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const form = useForm<SignUpRequest>({
    resolver: zodResolver(SignUpRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "player",
      sex: undefined,
      cpf: "",
      teamName: "",
    },
  });

  const role = form.watch("role");

  async function onSubmit(data: SignUpRequest) {
    if (!termsAccepted) {
      toast.error("Você deve aceitar os Termos de Uso e a Política de Privacidade.")
      return
    }
    setIsSubmitting(true);
    try {
      const res = await authApi.signUp({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        sex: data.role === "player" ? data.sex : undefined,
        cpf: data.cpf,
        teamName: data.teamName,
      });
      const sessionUser = { ...res.user, planId: res.user.planId ?? "free" } as Parameters<typeof login>[0];
      login(sessionUser);
      toast.success("Conta criada! Complete seu perfil.");
      navigate("/onboarding", { replace: true });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : "Erro ao cadastrar. Tente novamente.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background selection:bg-primary selection:text-primary-foreground md:flex-row-reverse">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      {/* RIGHT SIDE: BRUTALIST BRANDING & MOOD */}
      <aside className="relative flex flex-col justify-between overflow-hidden border-b-8 border-foreground bg-primary p-8 md:w-1/2 md:border-b-0 md:border-l-12 md:p-12 lg:w-[45%]">
        <div className="relative z-10 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-4xl tracking-wider text-foreground transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary-foreground">PRO</span>
          </Link>
          <div className="h-4 w-4 rounded-none bg-foreground"></div>
        </div>

        <div className="relative z-10 mt-20 md:mt-0">
          <div className="mb-6 inline-block bg-foreground px-3 py-1 font-display text-xl tracking-widest text-background">
            FORMAÇÃO DE ELENCO
          </div>
          <h1 className="font-display text-[15vw] leading-[0.8] tracking-tight text-foreground md:text-[8vw] lg:text-[10vw]">
            ASSINE <br />
            <span className="text-transparent [-webkit-text-stroke:2px_var(--color-foreground)] dark:[-webkit-text-stroke:2px_var(--color-foreground)]">
              O CONTRATO
            </span>
          </h1>
          <p className="mt-8 max-w-sm border-l-4 border-foreground pl-4 text-lg font-medium text-foreground/90">
            Mais de 2.500 jogadores estão esperando. Crie seu passe gratuito
            agora mesmo e mude seu jogo.
          </p>
        </div>

        {/* Abstract background elements */}
        <div className="absolute -bottom-1/4 right-0 h-[60vh] w-[60vw] -rotate-12 bg-background/20 blur-[100px]"></div>
      </aside>

      {/* LEFT SIDE: BENTO BOX FORM */}
      <main className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg bg-background p-8 border-4 border-foreground shadow-[-8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[-8px_8px_0px_0px_var(--color-foreground)] transition-shadow hover:shadow-[-12px_12px_0px_0px_var(--color-primary)]">
          <div className="mb-10 lg:text-left text-center">
            <h2 className="font-display text-5xl tracking-wide text-foreground">
              NOVO REFORÇO
            </h2>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldSet>
              <FieldGroup className="space-y-5">
                <Field className="space-y-2">
                  <Label className="font-display text-xl tracking-wide uppercase">
                    CADASTRAR COMO:
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() =>
                          form.setValue("role", r.value as "player" | "team")
                        }
                        className={cn(
                          "group relative flex flex-col items-start gap-4 border-2 p-5 text-left transition-all",
                          role === r.value
                            ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                            : "border-foreground bg-background text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                        )}
                      >
                        <div
                          className={cn(
                            "transition-colors",
                            role === r.value
                              ? "text-primary-foreground"
                              : "text-primary",
                          )}
                        >
                          {r.icon}
                        </div>
                        <div>
                          <span className="block font-display text-3xl tracking-wide">
                            {r.label}
                          </span>
                          <span
                            className={cn(
                              "mt-1 block text-xs font-bold tracking-widest",
                              role === r.value
                                ? "text-primary-foreground/90"
                                : "text-muted-foreground",
                            )}
                          >
                            {r.description}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="cpf"
                      className="font-display text-xl tracking-wide"
                    >
                      CPF
                    </Label>
                    <Input
                      id="cpf"
                      placeholder="Somente números (11 dígitos)"
                      maxLength={11}
                      disabled={isSubmitting}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                      value={form.watch("cpf") ?? ""}
                      onChange={(e) => {
                        form.setValue("cpf", formatCpf(e.target.value), { shouldValidate: true })
                      }}
                    />
                    {form.formState.errors.cpf && (
                      <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                        {form.formState.errors.cpf.message}
                      </p>
                    )}
                  </Field>

                  {role !== "team" ? (
                    <>
                      <Field className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="name"
                          className="font-display text-xl tracking-wide"
                        >
                          NOME COMPLETO
                        </Label>
                        <Input
                          id="name"
                          autoComplete="name"
                          disabled={isSubmitting}
                          placeholder="Seu nome completo"
                          className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                          {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                          <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </Field>

                      <Field className="space-y-2 md:col-span-2">
                        <Label className="font-display text-xl tracking-wide">
                          SEXO
                        </Label>
                        <Select
                          value={form.watch("sex") ?? ""}
                          onValueChange={(value) =>
                            form.setValue("sex", value as PlayerSex, { shouldValidate: true })
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg uppercase font-bold tracking-widest focus:ring-0 focus:border-primary transition-colors">
                            <SelectValue placeholder="SELECIONE" />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-2 border-foreground">
                            {PLAYER_SEXES.map((sex) => (
                              <SelectItem key={sex} value={sex} className="font-bold tracking-widest uppercase text-xs">
                                {PLAYER_SEX_LABELS[sex]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="name"
                          className="font-display text-xl tracking-wide"
                        >
                          NOME DO RESPONSÁVEL
                        </Label>
                        <Input
                          id="name"
                          autoComplete="name"
                          disabled={isSubmitting}
                          placeholder="Seu nome completo"
                          className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                          {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                          <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </Field>
                      <Field className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="teamName"
                          className="font-display text-xl tracking-wide"
                        >
                          NOME DO TIME
                        </Label>
                        <Input
                          id="teamName"
                          disabled={isSubmitting}
                          placeholder="Nome do seu time"
                          className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                          {...form.register("teamName")}
                        />
                        {form.formState.errors.teamName && (
                          <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                            {form.formState.errors.teamName.message}
                          </p>
                        )}
                      </Field>
                    </>
                  )}

                  <Field className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="email"
                      className="font-display text-xl tracking-wide"
                    >
                      E-MAIL
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      disabled={isSubmitting}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </Field>

                  <Field className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="font-display text-xl tracking-wide"
                    >
                      SENHA
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                      {...form.register("password")}
                    />
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Mín. 8 caracteres, com maiúscula, minúscula, número e símbolo.
                    </p>
                    {form.formState.errors.password && (
                      <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </Field>

                  <Field className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="font-display text-xl tracking-wide"
                    >
                      CONFIRMAR
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                      {...form.register("confirmPassword")}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>

            {/* TERMS ACCEPTANCE */}
            <button
              type="button"
              onClick={() => setTermsAccepted(!termsAccepted)}
              className={cn(
                "flex w-full items-start gap-3 border-2 p-4 text-left transition-all",
                termsAccepted
                  ? "border-primary bg-primary/10"
                  : "border-foreground bg-muted/30 hover:border-primary"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-none border-2 transition-colors",
                  termsAccepted
                    ? "border-primary bg-primary"
                    : "border-foreground bg-background"
                )}
              >
                {termsAccepted && (
                  <svg viewBox="0 0 10 10" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1.5 5L4 7.5L8.5 2.5" />
                  </svg>
                )}
              </span>
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase leading-relaxed">
                Li e aceito os{" "}
                <Link
                  to="/termos"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="text-foreground underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
                >
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                  to="/privacidade"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="text-foreground underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
                >
                  Política de Privacidade
                </Link>
                .
              </p>
            </button>

            <Button
              type="submit"
              disabled={isSubmitting || !termsAccepted}
              className="mt-8 h-auto w-full rounded-none border-2 border-primary bg-primary py-5 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isSubmitting ? "CADASTRANDO..." : "CADASTRAR"}
            </Button>
          </form>

          <p className="mt-8 text-center font-bold tracking-widest text-muted-foreground">
            JÁ É CONHECIDO?{" "}
            <Link
              to="/login"
              className="text-foreground hover:text-primary transition-colors underline decoration-2 underline-offset-4"
            >
              ENTRAR
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
