"use client"

import { useLocation } from "react-router"
import { GlobalHeader } from "~/components/global-header"

const FULL_BLEED_ROUTES = ["/jogador/mensagens", "/time/mensagens"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const fullBleed = FULL_BLEED_ROUTES.includes(location.pathname)

  return (
    <div className="flex min-h-dvh flex-col bg-background selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      <GlobalHeader />

      {fullBleed ? (
        <main className="flex-1 relative z-10">
          {children}
        </main>
      ) : (
        <main className="flex-1 pb-20 md:pb-0 relative z-10">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            {children}
          </div>
        </main>
      )}
    </div>
  )
}
