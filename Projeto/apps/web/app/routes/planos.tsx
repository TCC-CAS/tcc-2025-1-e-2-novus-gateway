import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/lib/auth/auth-context";
import { usePlan } from "~/lib/plan";
import { subscriptionApi, ApiError } from "~/lib/api-client";
import { Button } from "~/components/ui/button";
import { getPlansForRole, isUnlimited, PLAN_CONFIGS } from "~shared/contracts";
import type { PlanConfig, PlanId } from "~shared/contracts";
import {
  Check,
  X,
  Zap,
  Shield,
  Crown,
  Star,
  Flame,
  ArrowLeft,
  MessageCircle,
  Search,
  Video,
  BadgeCheck,
  Users,
  BarChart3,
  Sparkles,
  Headphones,
  ChevronDown,
  XCircle,
  AlertTriangle,
  Pause,
  Settings,
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
  fenomeno: <Flame className="size-8" />,
  profissional: <Crown className="size-8" />,
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
    label: "GALERIA DE MÍDIA",
    icon: <Video className="size-4" />,
    getValue: (p) =>
      p.limits.maxGalleryItems === 0
        ? false
        : `Até ${p.limits.maxGalleryItems} itens`,
  },
  {
    label: "VÍDEO HIGHLIGHT",
    icon: <Video className="size-4" />,
    getValue: (p) => p.limits.videoHighlights,
  },
  {
    label: "CARTA ESPECIAL NO PERFIL",
    icon: <BarChart3 className="size-4" />,
    getValue: (p) => p.limits.cardTier !== "none",
  },
  {
    label: "DESTAQUE NA BUSCA",
    icon: <Search className="size-4" />,
    getValue: (p) => p.limits.featuredListing,
  },
  {
    label: "BADGE VERIFICADO",
    icon: <BadgeCheck className="size-4" />,
    getValue: (p) => p.limits.verifiedBadge,
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
    getValue: (p) => `${p.limits.searchResults} / busca`,
  },
  {
    label: "MENSAGENS / MÊS",
    icon: <MessageCircle className="size-4" />,
    getValue: (p) => `${p.limits.conversations}`,
  },
  {
    label: "CONVITES DE PARTIDA / MÊS",
    icon: <Zap className="size-4" />,
    getValue: (p) => (p.limits.matchInvites > 0 ? `${p.limits.matchInvites}` : false),
  },
  {
    label: "VAGAS ABERTAS",
    icon: <Users className="size-4" />,
    getValue: (p) => `${p.limits.openPositions}`,
  },
  {
    label: "FILTROS AVANÇADOS",
    icon: <Search className="size-4" />,
    getValue: (p) => p.limits.advancedFilters,
  },
  {
    label: "RECOMENDAÇÕES POR ESTILO",
    icon: <Sparkles className="size-4" />,
    getValue: (p) => (p.limits.smartRecommendations ? "Melhores por perfil" : false),
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
    a: "Não. Todo jogador aparece nos resultados de busca. CRAQUE e FENÔMENO recebem destaque visual — borda especial e seção em evidência no topo da página. A relevância (posição, região, disponibilidade) ainda define quem aparece: o destaque é uma camada visual, não uma vantagem de alcance.",
  },
  {
    q: "Por que times precisam de um plano pago?",
    a: "O plano gratuito PELADA permite buscar jogadores, enviar mensagens e convidar para partidas com limites modestos. O plano Profissional amplia todos esses limites — mais buscas, mais mensagens, mais convites por mês, filtros avançados e recomendações por perfil — para times que recrutam com frequência.",
  },
  {
    q: "Por que não fizeram um aplicativo?",
    a: "Web primeiro: sem esperar aprovação de loja, funciona em qualquer celular com navegador, e é muito mais rápido de construir e validar. A plataforma pode ser instalada como PWA diretamente na tela inicial do celular. Um app nativo é o próximo passo natural após validar o modelo com usuários reais.",
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
  const { user, role } = useAuth()
  const { planId: effectivePlanId, usage, refreshUsage } = usePlan()
  const [view, setView] = useState<"player" | "team">(
    role === "team" ? "team" : "player"
  )
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [managingModal, setManagingModal] = useState<"idle" | "options" | "pause-confirm" | "cancel-confirm">("idle")
  const [pausing, setPausing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const plans = getPlansForRole(view)
  const features = view === "player" ? PLAYER_FEATURES : TEAM_FEATURES
  const currentPlanId = effectivePlanId
  const isPaid = currentPlanId !== "free"
  const isPaused = usage?.cancelAtPeriodEnd ?? false
  const isPermanentlyCanceled = usage?.status === "canceled"

  const planLabel = PLAN_CONFIGS[currentPlanId]?.name ?? "LIVRE"

  const handleCheckout = async (planId: PlanId) => {
    if (!user) return
    setUpgrading(planId)
    try {
      const { initPoint } = await subscriptionApi.checkout({ planId })
      window.location.href = initPoint
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Erro ao iniciar checkout. Tente novamente."
      )
      setUpgrading(null)
    }
  }

  const handlePause = async () => {
    setPausing(true)
    try {
      await subscriptionApi.pause()
      await refreshUsage()
      setManagingModal("idle")
      toast.success("Assinatura pausada. Acesso mantido até o fim do período.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao pausar. Tente novamente.")
    } finally {
      setPausing(false)
    }
  }

  const handleCancel = async () => {
    setCanceling(true)
    try {
      await subscriptionApi.cancel()
      await refreshUsage()
      setManagingModal("idle")
      toast.success("Assinatura cancelada.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao cancelar. Tente novamente.")
    } finally {
      setCanceling(false)
    }
  }

  const handleReactivate = async () => {
    setReactivating(true)
    try {
      await subscriptionApi.reactivate()
      await refreshUsage()
      toast.success("Assinatura reativada!")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao reativar. Tente novamente.")
    } finally {
      setReactivating(false)
    }
  }

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
              Jogadores constroem o currículo. Times acessam os dados para contratar.
              A busca é sempre por relevância — nunca por quem paga mais.
            </p>
          </div>

          {/* Current subscription status — only for authenticated users */}
          {user && (
            <div className="mx-auto mb-12 max-w-3xl">
              <div className={`border-4 p-6 ${
                isPermanentlyCanceled
                  ? "border-destructive bg-destructive/5"
                  : isPaused
                  ? "border-amber-500 bg-amber-500/10"
                  : isPaid
                  ? "border-primary bg-primary/5"
                  : "border-foreground/20 bg-muted/5"
              }`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-sm uppercase tracking-widest text-muted-foreground">
                      SEU PLANO ATUAL
                    </p>
                    <p className="mt-1 font-display text-3xl tracking-wide text-foreground">
                      {planLabel}
                    </p>

                    {isPaused && !isPermanentlyCanceled && (
                      <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Pause className="size-4" />
                        <span className="text-sm font-bold uppercase tracking-widest">
                          Pausada — válida até {usage?.periodResetAt ? new Date(usage.periodResetAt).toLocaleDateString("pt-BR") : "o fim do período"}
                        </span>
                      </div>
                    )}

                    {isPermanentlyCanceled && (
                      <div className="mt-2 flex items-center gap-2 text-destructive">
                        <XCircle className="size-4" />
                        <span className="text-sm font-bold uppercase tracking-widest">
                          Cancelada permanentemente
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    {isPermanentlyCanceled && (
                      <Button
                        className="gap-2 rounded-none border-2 border-primary bg-primary px-6 font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
                        onClick={() => handleCheckout(currentPlanId as PlanId)}
                        disabled={upgrading === currentPlanId}
                      >
                        <Zap className="size-4" />
                        ASSINAR NOVAMENTE
                      </Button>
                    )}

                    {isPaused && !isPermanentlyCanceled && (
                      <Button
                        variant="outline"
                        className="gap-2 rounded-none border-2 border-primary font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground"
                        onClick={handleReactivate}
                        disabled={reactivating}
                      >
                        <Zap className="size-4" />
                        {reactivating ? "REATIVANDO..." : "REATIVAR ASSINATURA"}
                      </Button>
                    )}

                    {isPaid && !isPaused && !isPermanentlyCanceled && (
                      <Button
                        variant="outline"
                        className="gap-2 rounded-none border-2 border-foreground font-bold uppercase tracking-widest hover:bg-foreground hover:text-background"
                        onClick={() => setManagingModal("options")}
                      >
                        <Settings className="size-4" />
                        GERENCIAR
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal — options */}
              {managingModal === "options" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="w-full max-w-md border-4 border-foreground bg-background p-8 shadow-[8px_8px_0px_0px_var(--color-primary)]">
                    <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
                      Gerenciar Assinatura
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Plano <strong>{planLabel}</strong> — o que deseja fazer?
                    </p>

                    <div className="mt-6 space-y-3">
                      <Button
                        className="h-auto w-full flex-col items-start gap-1 rounded-none border-2 border-primary bg-primary px-6 py-4 text-left text-primary-foreground hover:bg-primary/90"
                        onClick={() => setManagingModal("pause-confirm")}
                      >
                        <span className="flex items-center gap-2 font-display text-xl tracking-wide uppercase">
                          <Pause className="size-5" />
                          Pausar assinatura
                        </span>
                        <span className="text-sm font-normal text-primary-foreground/80">
                          Mantém seu acesso até o fim do período. Pode reativar a qualquer momento.
                        </span>
                      </Button>

                      <button
                        type="button"
                        className="w-full text-left text-sm font-bold uppercase tracking-widest text-destructive underline underline-offset-4 hover:text-destructive/80"
                        onClick={() => setManagingModal("cancel-confirm")}
                      >
                        Cancelar definitivamente
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      className="mt-6 w-full rounded-none border-2 border-foreground/30 font-bold uppercase tracking-widest"
                      onClick={() => setManagingModal("idle")}
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              )}

              {/* Modal — pause confirm */}
              {managingModal === "pause-confirm" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="w-full max-w-md border-4 border-amber-500 bg-background p-8 shadow-[8px_8px_0px_0px_theme(colors.amber.500)]">
                    <div className="flex items-center gap-3">
                      <Pause className="size-8 text-amber-500" />
                      <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
                        Pausar Assinatura
                      </h2>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Seu acesso ao plano <strong>{planLabel}</strong> será mantido até{" "}
                      <strong>{usage?.periodResetAt ? new Date(usage.periodResetAt).toLocaleDateString("pt-BR") : "o fim do período"}</strong>.
                      Você pode reativar a qualquer momento.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <Button
                        className="flex-1 rounded-none border-2 border-amber-500 bg-amber-500 font-bold uppercase tracking-widest text-white hover:bg-amber-600"
                        onClick={handlePause}
                        disabled={pausing}
                      >
                        {pausing ? "PAUSANDO..." : "CONFIRMAR PAUSA"}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-none border-2 border-foreground/30 font-bold uppercase tracking-widest"
                        onClick={() => setManagingModal("options")}
                        disabled={pausing}
                      >
                        Voltar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal — cancel confirm */}
              {managingModal === "cancel-confirm" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="w-full max-w-md border-4 border-destructive bg-background p-8 shadow-[8px_8px_0px_0px_var(--color-destructive)]">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="size-8 text-destructive" />
                      <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
                        Cancelar Definitivamente?
                      </h2>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Esta ação é <strong>irreversível</strong>. Você perderá o acesso ao plano{" "}
                      <strong>{planLabel}</strong> imediatamente e não poderá reativar esta assinatura.
                      Para usar novamente, precisará assinar do zero.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-none border-2 border-foreground/30 font-bold uppercase tracking-widest"
                        onClick={() => setManagingModal("options")}
                        disabled={canceling}
                      >
                        Voltar
                      </Button>
                      <Button
                        className="rounded-none border-2 border-destructive bg-destructive font-bold uppercase tracking-widest text-white hover:bg-destructive/90"
                        onClick={handleCancel}
                        disabled={canceling}
                      >
                        {canceling ? "CANCELANDO..." : "SIM, CANCELAR"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      !user ? (
                        <Button
                          asChild
                          className="h-14 w-full rounded-none border-2 border-foreground bg-foreground text-background font-display text-xl tracking-widest transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] uppercase"
                        >
                          <Link to="/cadastro">COMEÇAR GRÁTIS</Link>
                        </Button>
                      ) : isPaid ? (
                        <div className="flex h-14 items-center justify-center border-2 border-foreground/10 font-display text-xl tracking-widest text-muted-foreground/40 uppercase">
                          PLANO BASE
                        </div>
                      ) : (
                        <div className="flex h-14 items-center justify-center border-2 border-foreground/30 font-display text-xl tracking-widest text-muted-foreground uppercase">
                          PLANO ATUAL
                        </div>
                      )
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
                            handleCheckout(plan.id as PlanId);
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
                Todo jogador aparece na busca. CRAQUE e FENÔMENO recebem destaque visual —
                borda especial e seção em evidência no topo. A relevância (posição, região,
                disponibilidade) continua sendo o critério de exibição.
              </p>
            </div>
          ) : (
            <div className="mx-auto mt-12 max-w-3xl border-l-4 border-primary bg-primary/5 p-6">
              <p className="font-bold uppercase tracking-widest text-sm text-foreground">
                PELADA deixa buscar, contatar e convidar jogadores com limites modestos.
                PROFISSIONAL amplia todos os limites — mais buscas, mensagens, convites e vagas —
                e adiciona filtros avançados e recomendações por perfil para recrutamento sério.
              </p>
            </div>
          )}

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
