import { useState, useEffect } from "react"
import { Link } from "react-router"
import { cn } from "~/lib/utils"

const STORAGE_KEY = "varzea-cookie-consent"

type ConsentState = "pending" | "all" | "essential" | null

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>("pending")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setConsent(stored ? (JSON.parse(stored).choice as ConsentState) : null)
    } catch {
      setConsent(null)
    }
  }, [])

  function handleChoice(choice: "all" | "essential") {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, timestamp: Date.now() })
      )
    } catch {
      // localStorage unavailable — still dismiss
    }
    setConsent(choice)
  }

  // "pending" = SSR / not yet read localStorage → render nothing to avoid hydration mismatch
  if (consent !== null) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-60",
        "border-t-0 border-foreground bg-background",
        "shadow-[0_-6px_0px_0px_var(--color-foreground)]",
        "animate-in slide-in-from-bottom-4 duration-300"
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-5 sm:px-12 md:flex-row md:items-center">
        {/* Text */}
        <div className="flex-1 space-y-1">
          <p className="font-display text-xl tracking-wide text-foreground">
            COOKIES & PRIVACIDADE
          </p>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-2xl">
            Usamos cookies essenciais para o funcionamento da plataforma e, com sua
            autorização, cookies de desempenho para melhorar sua experiência. Conforme a{" "}
            <span className="font-bold text-foreground">LGPD (Lei nº 13.709/2018)</span>,
            você pode escolher quais aceitar.{" "}
            <Link
              to="/privacidade#cookies"
              className="text-foreground underline decoration-2 underline-offset-4 hover:text-primary transition-colors whitespace-nowrap"
            >
              Saiba mais
            </Link>
            .
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleChoice("essential")}
            className="h-auto rounded-none border-2 border-foreground bg-background px-5 py-3 font-display text-base tracking-widest text-foreground transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-foreground)]"
          >
            APENAS NECESSÁRIOS
          </button>
          <button
            type="button"
            onClick={() => handleChoice("all")}
            className="h-auto rounded-none border-2 border-primary bg-primary px-5 py-3 font-display text-base tracking-widest text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-foreground)]"
          >
            ACEITAR TODOS
          </button>
        </div>
      </div>
    </div>
  )
}

/** Read stored consent choice (use in analytics setup etc.) */
export function getCookieConsent(): "all" | "essential" | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored).choice ?? null) : null
  } catch {
    return null
  }
}
