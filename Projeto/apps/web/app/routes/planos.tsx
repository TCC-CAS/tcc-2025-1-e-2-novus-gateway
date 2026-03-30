import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/lib/auth/auth-context";
import { usePlan } from "~/lib/plan";
import { subscriptionApi } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { getPlansForRole, isUnlimited } from "~shared/contracts";
import type { PlanConfig, PlanId } from "~shared/contracts";
import {
  Check,
  X,
  Zap,
  Shield,
  Trophy,
  Crown,
  Star,
  ArrowLeft,
  MessageCircle,
  Search,
  Video,
  Eye,
  BadgeCheck,
  Users,
  BarChart3,
  Send,
  Sparkles,
  Headphones,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export function meta() {
  return [
    { title: "Planos - VárzeaPro" },
    { name: "description", content: "Escolha o plano ideal para você ou seu time." },
  ];
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Shield className="size-8" />,
  craque: <Star className="size-8" />,
  titular: <Trophy className="size-8" />,
  campeao: <Crown className="size-8" />,
};

type FeatureRow = {
  label: string;
  icon: React.ReactNode;
  getValue: (plan: PlanConfig) => string | boolean;
};

const PLAYER_FEATURES: FeatureRow[] = [
  {
    label: "PERFIL COMPLETO",
    icon: <Users className="size-4" />,
    getValue: () => true,
  },
  {
    label: "BUSCAR TIMES",
    icon: <Search className="size-4" />,
    getValue: () => "Sem limite",
  },
  {
    label: "MENSAGENS / MÊS",
    icon: <MessageCircle className="size-4" />,
    getValue: (p) =>
      isUnlimited(p.limits.conversations) ? "Ilimitado" : `${p.limits.conversations}`,
  },
  {
    label: "VÍDEO HIGHLIGHT",
    icon: <Video className="size-4" />,
    getValue: (p) => (p.limits.videoHighlights ? "Até 3 vídeos" : false),
  },
  {
    label: "PERFIL EXPANDIDO",
    icon: <Eye className="size-4" />,
    getValue: (p) => (p.limits.expandedProfile ? "Histórico + Stats" : false),
  },
  {
    label: "BADGE VERIFICADO",
    icon: <BadgeCheck className="size-4" />,
    getValue: (p) => p.limits.verifiedBadge,
  },
  {
    label: "QUEM VIU SEU PERFIL",
    icon: <Eye className="size-4" />,
    getValue: (p) => p.limits.profileViews,
  },
];

const TEAM_FEATURES: FeatureRow[] = [
  {
    label: "PERFIL DO TIME",
    icon: <Shield className="size-4" />,
    getValue: () => true,
  },
  {
    label: "BUSCAR JOGADORES",
    icon: <Search className="size-4" />,
    getValue: (p) =>
      isUnlimited(p.limits.searchResults) ? "Ilimitado" : `${p.limits.searchResults} / busca`,
  },
  {
    label: "MENSAGENS / MÊS",
    icon: <MessageCircle className="size-4" />,
    getValue: (p) =>
      isUnlimited(p.limits.conversations) ? "Ilimitado" : `${p.limits.conversations}`,
  },
  {
    label: "VAGAS ABERTAS",
    icon: <Users className="size-4" />,
    getValue: (p) =>
      isUnlimited(p.limits.openPositions) ? "Ilimitado" : `${p.limits.openPositions}`,
  },
  {
    label: "FILTROS AVANÇADOS",
    icon: <Search className="size-4" />,
    getValue: (p) => p.limits.advancedFilters,
  },
  {
    label: "LISTA DE FAVORITOS",
    icon: <Star className="size-4" />,
    getValue: (p) => {
      if (p.limits.favorites === 0) return false;
      return isUnlimited(p.limits.favorites) ? "Ilimitado" : `Até ${p.limits.favorites}`;
    },
  },
  {
    label: "DESTAQUE NA BUSCA",
    icon: <Zap className="size-4" />,
    getValue: (p) => p.limits.featuredListing,
  },
  {
    label: "ANALYTICS",
    icon: <BarChart3 className="size-4" />,
    getValue: (p) => p.limits.analytics,
  },
  {
    label: "MENSAGEM EM MASSA",
    icon: <Send className="size-4" />,
    getValue: (p) => (p.limits.bulkOutreach ? "Até 10/dia" : false),
  },
  {
    label: "RECOMENDAÇÕES AI",
    icon: <Sparkles className="size-4" />,
    getValue: (p) => p.limits.smartRecommendations,
  },
  {
    label: "SUPORTE PRIORITÁRIO",
    icon: <Headphones className="size-4" />,
    getValue: (p) => p.limits.prioritySupport,
  },
];

const FAQ_ITEMS = [
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Sem multas, sem burocracia. Seu plano continua ativo até o fim do período pago.",
  },
  {
    q: "Jogadores precisam pagar para aparecer na busca?",
    a: "Não. A busca é 100% por relevância (posição, região, disponibilidade). Nenhum plano pago altera a ordem de aparição. O campo de jogo é nivelado.",
  },
  {
    q: "Posso mudar de plano depois?",
    a: "Sim. Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "Todos os planos começam com 7 dias grátis. Se não gostar, cancele sem custo.",
  },
  {
    q: "Quais formas de pagamento aceitam?",
    a: "Cartão de crédito, Pix e boleto bancário.",
  },
];

export default function Planos() {
  const { user, role } = useAuth();
  const [view, setView] = useState<"player" | "team">(
    role === "team" ? "team" : "player"
  );
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const plans = getPlansForRole(view);
  const features = view === "player" ? PLAYER_FEATURES : TEAM_FEATURES;
  const currentPlanId = user?.planId ?? "free";

  const handleUpgrade = async (planId: PlanId) => {
    if (!user) return;
    setUpgrading(planId);
    try {
      await subscriptionApi.upgrade({ planId });
      toast.success("Plano atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar plano. Tente novamente.");
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* Header */}
      <header className="border-b-2 border-border/10 bg-background/80 px-6 py-4 backdrop-blur-md sm:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/"
            className="font-display text-4xl tracking-wider text-foreground transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button
                asChild
                variant="outline"
                className="gap-2 rounded-none border-2 border-foreground font-display text-lg tracking-widest hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-primary)]"
              >
                <Link to={role === "team" ? "/time" : role === "admin" ? "/admin" : "/jogador"}>
                  <ArrowLeft className="size-4" />
                  VOLTAR
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="rounded-none border-2 border-primary bg-primary px-6 font-display text-xl tracking-wider text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] hover:bg-primary"
              >
                <Link to="/cadastro">CRIAR CONTA</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-7xl">
          {/* Hero */}
          <div className="mb-16 text-center">
            <div className="mb-6 inline-block -rotate-1 bg-foreground px-4 py-2 font-display text-xl tracking-widest text-background">
              PLANOS E PREÇOS
            </div>
            <h1 className="font-display text-[10vw] leading-[0.85] tracking-tight text-foreground md:text-[6vw]">
              ESCOLHA SEU{" "}
              <span className="text-transparent [-webkit-text-stroke:2px_var(--color-primary)]">
                ESQUEMA TÁTICO
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg font-medium text-muted-foreground">
              Jogadores jogam de graça. Times investem no elenco.
              A busca de jogadores é sempre por relevância, nunca por quem paga mais.
            </p>
          </div>

          {/* Toggle */}
          <div className="mb-12 flex justify-center">
            <div className="inline-flex border-4 border-foreground shadow-[4px_4px_0px_0px_var(--color-primary)]">
              <button
                type="button"
                className={`px-8 py-4 font-display text-2xl tracking-widest transition-colors ${
                  view === "player"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted/30"
                }`}
                onClick={() => setView("player")}
              >
                JOGADOR
              </button>
              <button
                type="button"
                className={`border-l-4 border-foreground px-8 py-4 font-display text-2xl tracking-widest transition-colors ${
                  view === "team"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted/30"
                }`}
                onClick={() => setView("team")}
              >
                TIME
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div
            className={`mx-auto grid gap-8 ${
              plans.length === 2
                ? "max-w-3xl grid-cols-1 sm:grid-cols-2"
                : "max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {plans.map((plan) => {
              const isCurrent = user && plan.id === currentPlanId;
              const isPopular = plan.popular;

              return (
                <div
                  key={plan.id}
                  className={`group relative flex flex-col border-4 bg-background transition-transform hover:-translate-y-2 ${
                    isPopular
                      ? "border-primary shadow-[8px_8px_0px_0px_var(--color-primary)]"
                      : "border-foreground shadow-[6px_6px_0px_0px_var(--color-foreground)]"
                  }`}
                >
                  {/* Popular badge */}
                  {isPopular ? (
                    <div className="absolute -right-2 -top-4 z-10 rotate-2 bg-primary px-4 py-1 font-display text-sm tracking-widest text-primary-foreground shadow-[2px_2px_0px_0px_var(--color-foreground)]">
                      MAIS POPULAR
                    </div>
                  ) : null}

                  {/* Header */}
                  <div
                    className={`border-b-4 p-6 ${
                      isPopular
                        ? "border-primary bg-primary"
                        : "border-foreground bg-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`${
                          isPopular ? "text-primary-foreground" : "text-background"
                        }`}
                      >
                        {PLAN_ICONS[plan.id] ?? PLAN_ICONS.free}
                      </div>
                      <h2
                        className={`font-display text-4xl tracking-wide ${
                          isPopular ? "text-primary-foreground" : "text-background"
                        }`}
                      >
                        {plan.name}
                      </h2>
                    </div>
                    <p
                      className={`mt-2 text-sm font-bold uppercase tracking-widest ${
                        isPopular
                          ? "text-primary-foreground/80"
                          : "text-background/70"
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="border-b-2 border-dashed border-foreground/20 px-6 py-6">
                    {plan.price === 0 ? (
                      <div className="font-display text-5xl text-foreground">
                        GRÁTIS
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-lg text-muted-foreground">
                          R$
                        </span>
                        <span className="font-display text-5xl text-foreground">
                          {plan.price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="font-bold text-sm uppercase tracking-widest text-muted-foreground">
                          /mês
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex-1 px-6 py-6">
                    <ul className="space-y-3">
                      {features.map((feat) => {
                        const value = feat.getValue(plan);
                        const hasFeature = value !== false;

                        return (
                          <li
                            key={feat.label}
                            className={`flex items-center gap-3 ${
                              hasFeature
                                ? "text-foreground"
                                : "text-muted-foreground/40"
                            }`}
                          >
                            {hasFeature ? (
                              <Check className="size-4 shrink-0 text-primary" />
                            ) : (
                              <X className="size-4 shrink-0" />
                            )}
                            <span className="flex-1 text-sm font-bold uppercase tracking-widest">
                              {feat.label}
                            </span>
                            {typeof value === "string" ? (
                              <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-primary">
                                {value}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="p-6 pt-0">
                    {isCurrent ? (
                      <div className="flex h-14 items-center justify-center border-2 border-foreground/30 font-display text-xl tracking-widest text-muted-foreground uppercase">
                        PLANO ATUAL
                      </div>
                    ) : plan.price === 0 ? (
                      <Button
                        asChild
                        className="h-14 w-full rounded-none border-2 border-foreground bg-background font-display text-xl tracking-widest text-foreground transition-all hover:-translate-y-1 hover:bg-foreground hover:text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)] uppercase"
                      >
                        <Link to={user ? "#" : "/cadastro"}>
                          {user ? "PLANO ATUAL" : "COMEÇAR GRÁTIS"}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        className={`h-14 w-full gap-2 rounded-none border-2 font-display text-xl tracking-widest transition-all hover:-translate-y-1 uppercase ${
                          isPopular
                            ? "border-primary bg-primary text-primary-foreground hover:shadow-[4px_4px_0px_0px_var(--color-foreground)]"
                            : "border-foreground bg-foreground text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
                        }`}
                        disabled={upgrading === plan.id}
                        onClick={() => {
                          if (user) {
                            handleUpgrade(plan.id as PlanId);
                          }
                        }}
                      >
                        {user ? (
                          <>
                            <Zap className="size-5" />
                            {upgrading === plan.id ? "PROCESSANDO..." : "ASSINAR AGORA"}
                          </>
                        ) : (
                          <Link to="/cadastro" className="flex items-center gap-2">
                            <Zap className="size-5" />
                            COMEÇAR AGORA
                          </Link>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fairness Notice for Player view */}
          {view === "player" ? (
            <div className="mx-auto mt-12 max-w-3xl border-l-4 border-primary bg-primary/5 p-6">
              <p className="font-bold uppercase tracking-widest text-sm text-foreground">
                Campo nivelado: A busca de jogadores é 100% por relevância.
                Nenhum plano pago altera sua posição nos resultados.
                O CRAQUE oferece ferramentas de apresentação, não vantagem competitiva.
              </p>
            </div>
          ) : null}

          {/* FAQ */}
          <section className="mx-auto mt-24 max-w-3xl">
            <h2 className="mb-10 text-center font-display text-[8vw] leading-[0.85] text-foreground md:text-[4vw]">
              PERGUNTAS{" "}
              <span className="text-transparent [-webkit-text-stroke:2px_var(--color-foreground)]">
                FREQUENTES
              </span>
            </h2>

            <div className="space-y-4">
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="border-4 border-foreground bg-background transition-colors"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    onClick={() =>
                      setExpandedFaq((prev) => (prev === i ? null : i))
                    }
                  >
                    <span className="font-display text-xl tracking-wide text-foreground uppercase">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`size-6 shrink-0 text-primary transition-transform ${
                        expandedFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === i ? (
                    <div className="border-t-2 border-dashed border-foreground/20 px-5 pb-5 pt-4">
                      <p className="text-base font-medium leading-relaxed text-muted-foreground">
                        {item.a}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="mt-24 bg-foreground p-12 text-center sm:p-16">
            <h2 className="font-display text-[8vw] leading-[0.85] text-background md:text-[4vw]">
              BORA <span className="text-primary">JOGAR</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg font-medium text-background/70">
              Crie sua conta grátis e leve o futebol amador para o próximo nível.
            </p>
            <Button
              asChild
              className="mt-8 h-auto rounded-none border-4 border-primary bg-primary px-10 py-5 font-display text-3xl tracking-widest text-primary-foreground transition-all hover:scale-105 hover:shadow-[6px_6px_0px_0px_var(--color-background)]"
            >
              <Link to={user ? (role === "team" ? "/time" : "/jogador") : "/cadastro"}>
                {user ? "VOLTAR AO JOGO" : "CRIAR CONTA GRÁTIS"}
              </Link>
            </Button>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 sm:px-12">
          <p className="font-display text-2xl tracking-widest text-foreground">
            VÁRZEA<span className="text-primary">PRO</span>
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            &copy; {new Date().getFullYear()} VárzeaPro
          </p>
        </div>
      </footer>
    </div>
  );
}
