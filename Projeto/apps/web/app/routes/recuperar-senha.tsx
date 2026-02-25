import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ForgotPasswordRequestSchema,
  type ForgotPasswordRequest,
} from "~shared/contracts";
import { authApi } from "~/lib/api-client";
import { ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldGroup, FieldSet } from "~/components/ui/field";
import { Label } from "~/components/ui/label";

export function meta() {
  return [{ title: "Recuperar senha - VárzeaPro" }];
}

export default function RecuperarSenha() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordRequest) {
    setError(null);
    try {
      await authApi.forgotPassword(data);
      setSent(true);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError("Erro ao enviar. Tente novamente.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[80px]"></div>

      <div className="w-full max-w-md bg-background p-8 border-4 border-foreground shadow-[8px_8px_0px_0px_var(--color-primary)] relative z-10 transition-shadow hover:shadow-[12px_12px_0px_0px_var(--color-foreground)] dark:hover:shadow-[12px_12px_0px_0px_var(--color-foreground)]">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="font-display text-2xl tracking-wider text-foreground transition-transform hover:scale-105 inline-block mb-6"
          >
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
          <h1 className="font-display text-5xl tracking-wide leading-[0.8] mb-2 text-transparent [-webkit-text-stroke:1px_var(--color-foreground)] dark:[-webkit-text-stroke:1px_var(--color-foreground)]">
            PERDEU A <br /> CHUTEIRA?
          </h1>
          <p className="text-muted-foreground font-bold tracking-widest text-sm uppercase mt-4">
            Recupere o acesso à sua conta.
          </p>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <div className="bg-primary/10 border-2 border-primary p-6 inline-block">
              <p className="font-display text-3xl text-primary">
                E-MAIL ENVIADO
              </p>
              <p className="text-sm font-medium text-foreground mt-2">
                Se o e-mail existir, você receberá um link para redefinir a
                senha.
              </p>
            </div>
            <Button
              asChild
              className="mt-8 h-auto w-full rounded-none border-2 border-foreground bg-foreground py-4 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
            >
              <Link to="/login">VOLTAR PARA ENTRAR</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldSet>
              <FieldGroup>
                <Field className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="font-display text-xl tracking-wide text-foreground"
                  >
                    SEU E-MAIL CADASTRADO
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
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
                className="font-bold tracking-wide text-destructive text-sm mt-1 bg-destructive/10 p-2 border border-destructive/20 text-center"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="space-y-4 pt-4">
              <Button
                type="submit"
                className="h-auto w-full rounded-none border-2 border-primary bg-primary py-4 font-display text-xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:hover:shadow-[4px_4px_0px_0px_var(--color-foreground)]"
              >
                ENVIAR CONVITE DE RECUPERAÇÃO
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto w-full rounded-none border-2 border-foreground bg-transparent py-4 font-display text-xl tracking-widest text-foreground transition-all hover:bg-foreground hover:text-background"
              >
                <Link to="/login">LEMBREI, VOLTAR</Link>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
