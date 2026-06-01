"use client";

import { Link } from "react-router";
import { usePlan } from "./plan-context";
import { Lock, Zap } from "lucide-react";
import { Button } from "~/components/ui/button";

type PlanGateProps = {
  feature: "profileViews" | "videoHighlights" | "expandedProfile" | "advancedFilters" | "analytics" | "bulkOutreach" | "smartRecommendations" | "featuredListing";
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function PlanGate({ feature, children, fallback }: PlanGateProps) {
  const { limits } = usePlan();

  const featureMap: Record<PlanGateProps["feature"], boolean> = {
    profileViews: limits.profileViews,
    videoHighlights: limits.videoHighlights,
    expandedProfile: limits.expandedProfile,
    advancedFilters: limits.advancedFilters,
    analytics: limits.analytics,
    bulkOutreach: limits.bulkOutreach,
    smartRecommendations: limits.smartRecommendations,
    featuredListing: limits.featuredListing,
  };

  if (featureMap[feature]) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;
  return null;
}

type UpsellCardProps = {
  title: string;
  description: string;
  planName: string;
  compact?: boolean;
};

export function UpsellCard({ title, description, planName, compact }: UpsellCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 border-2 border-dashed border-primary/40 bg-primary/5 p-3">
        <Lock className="size-4 shrink-0 text-primary" />
        <p className="flex-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {description}
        </p>
        <Button
          asChild
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-none border-2 border-primary bg-primary px-3 font-display text-xs tracking-widest text-primary-foreground hover:bg-foreground hover:border-foreground hover:text-background"
        >
          <Link to="/planos">
            <Zap className="size-3" />
            {planName}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden border-4 border-dashed border-primary/30 bg-primary/5 p-8 text-center">
      <div className="absolute -right-6 -top-6 size-24 rotate-12 bg-primary/10 blur-2xl" />
      <Lock className="mx-auto size-10 text-primary/60" />
      <h3 className="mt-4 font-display text-2xl tracking-wide text-foreground uppercase">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {description}
      </p>
      <Button
        asChild
        className="mt-6 gap-2 rounded-none border-2 border-primary bg-primary px-8 py-5 font-display text-xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:bg-foreground hover:border-foreground hover:text-background hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
      >
        <Link to="/planos">
          <Zap className="size-5" />
          ASSINAR {planName}
        </Link>
      </Button>
    </div>
  );
}

type MessageLimitBannerProps = {
  remaining: number;
  total: number;
};

export function MessageLimitBanner({ remaining, total }: MessageLimitBannerProps) {
  if (remaining > 3) return null;

  const isExhausted = remaining <= 0;

  return (
    <div
      className={`flex items-center gap-3 border-2 px-4 py-3 ${
        isExhausted
          ? "border-destructive/50 bg-destructive/10"
          : "border-primary/30 bg-primary/5"
      }`}
    >
      <Zap
        className={`size-4 shrink-0 ${
          isExhausted ? "text-destructive" : "text-primary"
        }`}
      />
      <p className="flex-1 text-xs font-bold uppercase tracking-widest text-foreground">
        {isExhausted
          ? "LIMITE DE CONVERSAS ATINGIDO ESTE MÊS"
          : `${remaining}/${total} CONVERSAS RESTANTES ESTE MÊS`}
      </p>
      <Button
        asChild
        size="sm"
        className="h-8 shrink-0 gap-1.5 rounded-none border-2 border-primary bg-primary px-3 font-display text-xs tracking-widest text-primary-foreground hover:bg-foreground hover:border-foreground hover:text-background"
      >
        <Link to="/planos">UPGRADE</Link>
      </Button>
    </div>
  );
}
