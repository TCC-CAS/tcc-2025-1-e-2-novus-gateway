"use client"

import { useState } from "react"
import { useLocation } from "react-router"
import { toast } from "sonner"
import { GlobalHeader } from "~/components/global-header"
import { useAuthState } from "~/lib/auth/auth-context"
import { authApi } from "~/lib/api-client"
import { MailWarning, X } from "lucide-react"

const FULL_BLEED_ROUTES = ["/jogador/mensagens", "/time/mensagens"]

function EmailVerificationBanner() {
  const { user } = useAuthState()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  if (!user || user.emailVerified || dismissed) return null

  async function handleResend() {
    if (!user) return
    setSending(true)
    try {
      await authApi.resendVerificationEmail(user.email)
      toast.success("E-mail de verificação reenviado!")
    } catch {
      toast.error("Erro ao reenviar. Tente novamente.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative z-20 border-b-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <MailWarning className="size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <p className="flex-1 text-sm font-bold tracking-wide text-yellow-800 dark:text-yellow-300 uppercase">
          Verifique seu e-mail{" "}
          <span className="font-mono font-normal lowercase normal-case">{user.email}</span>
          {" "}— acesse sua caixa de entrada e clique no link.
        </p>
        <button
          onClick={handleResend}
          disabled={sending}
          className="shrink-0 border border-yellow-600 px-2 py-0.5 text-xs font-bold tracking-widest text-yellow-700 dark:text-yellow-300 uppercase hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors disabled:opacity-50"
        >
          {sending ? "..." : "Reenviar"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
          aria-label="Fechar aviso"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

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
      <EmailVerificationBanner />

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
