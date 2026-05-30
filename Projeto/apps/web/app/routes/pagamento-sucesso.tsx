import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Button } from "~/components/ui/button"
import { CheckCircle, Clock, ArrowLeft, Loader2, XCircle } from "lucide-react"
import { subscriptionApi } from "~/lib/api-client"

export function meta() {
  return [
    { title: "Pagamento - VarzeaPro" },
  ]
}

type ActivationState = "polling" | "activated" | "timeout" | "error"

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<ActivationState>("polling")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)
  const MAX_ATTEMPTS = 10 // 10 × 3s = 30s

  const mpStatus = searchParams.get("status") // "approved" | "pending" | "failure" | null
  const isPending = mpStatus === "pending"
  const isFailure = mpStatus === "failure"

  useEffect(() => {
    if (isFailure) {
      setState("error")
      return
    }

    intervalRef.current = setInterval(async () => {
      attemptsRef.current += 1
      try {
        const usage = await subscriptionApi.getUsage()
        if (usage.planId !== "free") {
          setState("activated")
          clearInterval(intervalRef.current!)
          return
        }
      } catch {
        // network error — keep trying
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState("timeout")
        clearInterval(intervalRef.current!)
      }
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isFailure])

  if (isFailure) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-lg border-4 border-destructive bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-destructive)]">
          <XCircle className="mx-auto size-16 text-destructive" />
          <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
            PAGAMENTO RECUSADO
          </h1>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Seu pagamento não foi aprovado. Tente novamente com outro método de pagamento.
          </p>
          <Button
            asChild
            className="mt-8 h-14 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to="/planos">
              <ArrowLeft className="size-5" />
              TENTAR NOVAMENTE
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (state === "polling") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-lg border-4 border-primary bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <Loader2 className="mx-auto size-16 text-primary animate-spin" />
          <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
            {isPending ? "PAGAMENTO EM ANÁLISE" : "CONFIRMANDO PAGAMENTO..."}
          </h1>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            {isPending
              ? "Seu pagamento está sendo processado. Assim que confirmado, seu plano será ativado automaticamente."
              : "Verificando a confirmação do pagamento. Isso pode levar alguns segundos."}
          </p>
        </div>
      </div>
    )
  }

  if (state === "activated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-lg border-4 border-primary bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-primary)]">
          <CheckCircle className="mx-auto size-16 text-primary" />
          <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
            PLANO ATIVADO!
          </h1>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Seu pagamento foi confirmado e o plano está ativo. Aproveite todas as funcionalidades do VarzeaPro.
          </p>
          <Button
            asChild
            className="mt-8 h-14 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
          >
            <Link to="/">
              <ArrowLeft className="size-5" />
              VOLTAR AO INÍCIO
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // timeout — webhook may be delayed
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg border-4 border-amber-500 bg-background p-12 text-center shadow-[8px_8px_0px_0px_theme(colors.amber.500)]">
        <Clock className="mx-auto size-16 text-amber-500" />
        <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
          AGUARDANDO CONFIRMAÇÃO
        </h1>
        <p className="mt-4 text-lg font-medium text-muted-foreground">
          O pagamento foi recebido mas a ativação está demorando mais que o normal.
          Seu plano será ativado em breve — verifique a página de planos em alguns minutos.
        </p>
        <Button
          asChild
          className="mt-8 h-14 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
        >
          <Link to="/planos">
            <ArrowLeft className="size-5" />
            VER MEUS PLANOS
          </Link>
        </Button>
      </div>
    </div>
  )
}
