import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ForgotPasswordRequestSchema,
  type ForgotPasswordRequest,
} from "~shared/contracts";
import { authApi, ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldGroup, FieldSet } from "~/components/ui/field";
import { Label } from "~/components/ui/label";
import { GlobalHeader } from "~/components/global-header";

export function meta() {
  return [{ title: "Recuperar senha - VárzeaPro" }];
}

export default function RecuperarSenha() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordRequest) {
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(data);
      setSent(true);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      <GlobalHeader />

      <div className="flex flex-1 flex-col md:flex-row pb-16 md:pb-0">
        {/* LEFT: branding */}
        <aside className="relative hidden md:flex flex-col justify-between overflow-hidden border-b-8 border-primary bg-foreground p-8 md:w-1/2 md:border-b-0 md:border-r-12 md:p-12 lg:w-[45%]">
          <div className="relative z-10 flex items-center justify-between">
            <Link
              to="/"
              className="font-display text-2xl tracking-wider text-background transition-transform hover:scale-105"
            >
              VÁRZEA<span className="text-primary">PRO</span>
            </Link>
          </div>

          <div className="relative z-10 mt-20 md:mt-0">
            <div className="mb-6 inline-block bg-primary px-3 py-1 font-display text-xl tracking-widest text-primary-foreground">
              RECUPERAR CONTA
            </div>
            <h1 className="font-display text-[15vw] leading-[0.8] tracking-tight text-background md:text-[8vw] lg:text-[10vw]">
              PERDEU <br />
              <span className="text-transparent [-webkit-text-stroke:2px_var(--color-background)] dark:[-webkit-text-stroke:2px_var(--color-background)]">
                A CHAVE?
              </span>
            </h1>
            <p className="mt-8 max-w-sm border-l-4 border-primary pl-4 text-lg font-medium text-background/80">
              Sem problema. Informe seu e-mail e te mandamos um link pra você
              voltar pro campo em segundos.
            </p>
          </div>

          <div className="absolute -bottom-1/4 -left-1/4 h-[50vh] w-[50vw] rotate-12 bg-primary/20 blur-[100px]" />
        </aside>

        {/* RIGHT: form */}
        <main className="relative flex flex-1 items-start justify-center p-8 md:items-center md:p-12">
          <div className="w-full max-w-md bg-background p-8 border-4 border-foreground shadow-[8px_8px_0px_0px_var(--color-foreground)] dark:shadow-[8px_8px_0px_0px_var(--color-foreground)] transition-shadow hover:shadow-[12px_12px_0px_0px_var(--color-primary)]">
            <div className="mb-10 text-center">
              <h2 className="font-display text-5xl tracking-wide text-foreground">
                RECUPERAR
              </h2>
              <p className="mt-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                Acesso à sua conta
              </p>
            </div>

            {sent ? (
              <div className="space-y-6 text-center">
                <div className="bg-primary/10 border-2 border-primary p-6">
                  <p className="font-display text-2xl tracking-wide text-foreground uppercase">
                    E-mail enviado!
                  </p>
                  <p className="text-sm font-medium text-muted-foreground mt-2">
                    Se o e-mail existir, você receberá um link para redefinir
                    sua senha.
                  </p>
                </div>
                <Button
                  asChild
                  className="h-auto w-full rounded-none border-2 border-primary bg-primary py-5 font-display text-xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] uppercase"
                >
                  <Link to="/login">VOLTAR PARA ENTRAR</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FieldSet>
                  <FieldGroup className="space-y-5">
                    <Field className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="font-display text-xl tracking-wide uppercase"
                      >
                        Seu E-mail
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
                  </FieldGroup>
                </FieldSet>

                {error && (
                  <p
                    className="font-bold tracking-wide text-destructive text-sm bg-destructive/10 p-2 border border-destructive/20 text-center"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <div className="space-y-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-auto w-full rounded-none border-2 border-primary bg-primary py-5 font-display text-2xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] uppercase"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Link"}
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-auto w-full rounded-none border-2 border-foreground bg-transparent py-4 font-display text-xl tracking-widest text-foreground transition-all hover:bg-foreground hover:text-background uppercase"
                  >
                    <Link to="/login">Lembrei, voltar</Link>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
