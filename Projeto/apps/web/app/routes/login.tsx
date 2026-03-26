import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoginRequestSchema, type LoginRequest } from "~shared/contracts";
import { authApi, playersApi, teamsApi } from "~/lib/api-client";
import { useAuth } from "~/lib/auth/auth-context";
import { getHomeForRole } from "~/lib/auth/permissions";
import { ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldGroup, FieldSet } from "~/components/ui/field";
import { Label } from "~/components/ui/label";

export function meta() {
  return [{ title: "Entrar - VárzeaPro" }];
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginRequest) {
    setIsSubmitting(true);
    try {
      const res = await authApi.login(data);
      const sessionUser = { ...res.user, planId: res.user.planId ?? "free" } as Parameters<typeof login>[0];
      login(sessionUser, "");

      let hasProfile = false;
      if (res.user.role === "admin") {
        hasProfile = true;
      } else {
        try {
          if (res.user.role === "player") await playersApi.getMe();
          else await teamsApi.getMe();
          hasProfile = true;
        } catch {
          hasProfile = false;
        }
      }

      const home = getHomeForRole(res.user.role as "player" | "team" | "admin");
      const next = redirectTo ?? (hasProfile ? home : "/onboarding");
      navigate(next, { replace: true });
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Erro ao entrar. Tente novamente.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background selection:bg-primary selection:text-primary-foreground md:flex-row">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      {/* LEFT SIDE: BRUTALIST BRANDING & MOOD */}
      <aside className="relative flex flex-col justify-between overflow-hidden border-b-8 border-primary bg-foreground p-8 md:w-1/2 md:border-b-0 md:border-r-12 md:p-12 lg:w-[45%]">
        <div className="relative z-10 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-4xl tracking-wider text-background transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
          <div className="h-4 w-4 rounded-none bg-primary mix-blend-difference"></div>
        </div>

        <div className="relative z-10 mt-20 md:mt-0">
          <div className="mb-6 inline-block bg-primary px-3 py-1 font-display text-xl tracking-widest text-primary-foreground">
            ACESSO RESTRITO
          </div>
          <h1 className="font-display text-[15vw] leading-[0.8] tracking-tight text-background md:text-[8vw] lg:text-[10vw]">
            VOLTE <br />
            <span className="text-transparent [-webkit-text-stroke:2px_var(--color-background)] dark:[-webkit-text-stroke:2px_var(--color-background)]">
              PRO JOGO
            </span>
          </h1>
          <p className="mt-8 max-w-sm border-l-4 border-primary pl-4 text-lg font-medium text-background/80">
            A arquibancada tá cheia. Entre na sua conta para não perder a
            convocação.
          </p>
        </div>

        {/* Abstract background elements */}
        <div className="absolute -bottom-1/4 -left-1/4 h-[50vh] w-[50vw] rotate-12 bg-primary/20 blur-[100px]"></div>
      </aside>

      {/* RIGHT SIDE: BENTO BOX FORM */}
      <main className="relative flex flex-1 items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md bg-background p-8 border-4 border-foreground shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)] transition-shadow hover:shadow-[12px_12px_0px_0px_var(--color-primary)]">
          <div className="mb-10 text-center">
            <h2 className="font-display text-5xl tracking-wide text-foreground">
              ENTRAR
            </h2>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldSet>
              <FieldGroup className="space-y-5">
                <Field className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="font-display text-xl tracking-wide uppercase"
                  >
                    E-mail
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
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="font-display text-xl tracking-wide uppercase"
                    >
                      Senha
                    </Label>
                    <Link
                      to="/recuperar-senha"
                      className="text-sm font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors uppercase"
                    >
                      Esqueceu?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="font-bold tracking-wide text-destructive text-sm mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </Field>
              </FieldGroup>
            </FieldSet>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 h-auto w-full rounded-none border-2 border-primary bg-primary py-5 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] uppercase"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-8 text-center font-bold tracking-widest text-muted-foreground uppercase">
            Sem convite ainda?{" "}
            <Link
              to="/cadastro"
              className="text-foreground hover:text-primary transition-colors underline decoration-2 underline-offset-4"
            >
              Cadastrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
