import { Link } from "react-router";
import { useAuth } from "~/lib/auth/auth-context";
import { usePlan } from "~/lib/plan";
import { getPlansForRole, isUnlimited, PLAN_CONFIGS } from "~shared/contracts";
import { Button } from "~/components/ui/button";
import {
  Settings,
  User,
  Mail,
  ShieldAlert,
  ArrowLeft,
  Zap,
  MessageCircle,
  Search,
  Crown,
} from "lucide-react";

export function meta() {
  return [{ title: "Configurações - VárzeaPro" }];
}

export default function Configuracoes() {
  const { user } = useAuth();
  const { planId, limits, usage, isPaid } = usePlan();
  const role = user?.role === "team" ? "team" : "player";
  const plans = getPlansForRole(role);
  const currentPlan = plans.find((p) => p.id === planId) ?? plans[0];

  return (
    <div className="container max-w-3xl space-y-10 px-4 py-8 sm:px-6 sm:py-12 relative overflow-hidden">
      {/* Decorative Matrix Background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=%2220%22 height=%2220%22 viewBox=%220 0 20 20%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22%23000000%22 fill-opacity=%221%22 fill-rule=%22evenodd%22%3E%3Ccircle cx=%223%22 cy=%223%22 r=%223%22/%3E%3Ccircle cx=%2213%22 cy=%2213%22 r=%223%22/%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="mb-10 flex flex-col items-start gap-4 border-b-4 border-foreground pb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center border-4 border-foreground bg-primary shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]">
            <Settings className="size-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-5xl tracking-wide text-foreground uppercase pt-2">
            CONFIGURAÇÕES
          </h1>
        </div>
        <p className="font-bold tracking-widest text-sm text-muted-foreground uppercase">
          PERFIL E SISTEMA DA CONTA VÁRZEAPRO
        </p>
      </div>

      <div className="space-y-8 relative z-10">
        {/* Account Info Panel */}
        <section className="border-4 border-foreground bg-background shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <div className="border-b-4 border-foreground bg-primary p-4">
            <h2 className="font-display text-3xl tracking-wide text-primary-foreground uppercase">
              DADOS GERAIS
            </h2>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Name Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-display text-xl tracking-wider uppercase text-foreground">
                <User className="size-5 text-primary" />
                NOME REGISTRADO
              </label>
              <div className="border-2 border-foreground bg-muted/30 p-4 font-bold text-lg uppercase tracking-wide">
                {user?.name}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-display text-xl tracking-wider uppercase text-foreground">
                <Mail className="size-5 text-primary" />
                ENDEREÇO DE E-MAIL
              </label>
              <div className="border-2 border-foreground bg-muted/30 p-4 font-mono text-lg lowercase tracking-tight">
                {user?.email}
              </div>
            </div>

            {/* Helper Notice */}
            <div className="mt-8 flex items-start gap-3 border-l-4 border-primary bg-primary/10 p-4">
              <ShieldAlert className="size-5 text-primary shrink-0 mt-0.5" />
              <p className="font-bold tracking-widest text-xs sm:text-sm text-foreground uppercase leading-relaxed">
                ALTERAÇÃO DE E-MAIL, SENHA E EXCLUSÃO DE CONTA ESTARÃO
                DISPONÍVEIS NA PRÓXIMA ATUALIZAÇÃO DO SISTEMA. MANTEREMOS VOCÊ
                INFORMADO.
              </p>
            </div>
          </div>
        </section>

        {/* Plan Section */}
        <section className="border-4 border-foreground bg-background shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <div className="border-b-4 border-foreground bg-foreground p-4 flex items-center justify-between">
            <h2 className="font-display text-3xl tracking-wide text-background uppercase flex items-center gap-3">
              <Crown className="size-6" />
              MEU PLANO
            </h2>
            {isPaid() ? (
              <span className="bg-primary px-3 py-1 font-display text-sm tracking-widest text-primary-foreground">
                ATIVO
              </span>
            ) : null}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-4xl text-foreground uppercase">
                  {currentPlan.name}
                </p>
                <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {currentPlan.description}
                </p>
              </div>
              <div className="text-right">
                {currentPlan.price === 0 ? (
                  <p className="font-display text-3xl text-foreground">GRÁTIS</p>
                ) : (
                  <p className="font-display text-3xl text-foreground">
                    R$ {currentPlan.price.toFixed(2).replace(".", ",")}
                    <span className="text-sm font-bold text-muted-foreground">
                      /mês
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Usage meters */}
            {usage ? (
              <div className="space-y-4 border-t-2 border-dashed border-foreground/20 pt-6">
                <p className="font-display text-xl tracking-wider text-foreground uppercase">
                  USO ESTE MÊS
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border-2 border-foreground p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        CONVERSAS
                      </span>
                    </div>
                    <p className="font-display text-2xl text-foreground">
                      {usage.conversationsUsed}
                      <span className="text-muted-foreground">
                        /{isUnlimited(usage.conversationsLimit) ? "∞" : usage.conversationsLimit}
                      </span>
                    </p>
                    {!isUnlimited(usage.conversationsLimit) ? (
                      <div className="mt-2 flex h-3 w-full border border-foreground bg-muted/20">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, (usage.conversationsUsed / usage.conversationsLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {role === "team" ? (
                    <div className="border-2 border-foreground p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="size-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          RESULTADOS / BUSCA
                        </span>
                      </div>
                      <p className="font-display text-2xl text-foreground">
                        {isUnlimited(usage.searchResultsLimit) ? "∞" : usage.searchResultsLimit}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Upgrade CTA */}
            {!isPaid() ? (
              <div className="border-t-2 border-dashed border-foreground/20 pt-6">
                <Button
                  asChild
                  className="h-14 w-full gap-2 rounded-none border-2 border-primary bg-primary font-display text-xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)] uppercase"
                >
                  <Link to="/planos">
                    <Zap className="size-5" />
                    FAZER UPGRADE
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="border-t-2 border-dashed border-foreground/20 pt-6">
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full gap-2 rounded-none border-2 border-foreground bg-background font-display text-lg tracking-widest text-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] uppercase"
                >
                  <Link to="/planos">GERENCIAR PLANO</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Navigation Action */}
        <div className="pt-8 flex justify-start">
          <Button
            asChild
            className="group h-16 w-full sm:w-auto rounded-none border-4 border-foreground bg-background px-8 font-display text-2xl tracking-widest text-foreground transition-all hover:-translate-y-1 hover:bg-foreground hover:text-background hover:shadow-[6px_6px_0px_0px_var(--color-primary)] dark:hover:shadow-[6px_6px_0px_0px_var(--color-primary)] uppercase gap-4"
          >
            <Link
              to={
                user?.role === "player"
                  ? "/jogador"
                  : user?.role === "team"
                    ? "/time"
                    : "/admin"
              }
            >
              <ArrowLeft className="size-6 transition-transform group-hover:-translate-x-1" />
              VOLTAR AO INÍCIO
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
