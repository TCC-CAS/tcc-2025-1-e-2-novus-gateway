import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { Button } from "~/components/ui/button"
import { CheckCircle, ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "~/lib/auth/auth-context"
import { subscriptionApi, ApiError } from "~/lib/api-client"
import { toast } from "sonner"

export function meta() {
  return [
    { title: "Pagamento Confirmado - VarzeaPro" },
  ]
}

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [activating, setActivating] = useState(true)
  const [activated, setActivated] = useState(false)

  const planId = searchParams.get("planId")

  useEffect(() => {
    if (!planId || !user || activated) {
      if (!planId) setActivating(false)
      return
    }

    async function activate() {
      try {
        await subscriptionApi.upgrade({ planId: planId! })
        setActivated(true)
        toast.success("Plano ativado com sucesso!")
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Erro ao ativar plano. Tente novamente na página de planos."
        )
      } finally {
        setActivating(false)
      }
    }

    activate()
  }, [planId, user, activated])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg border-4 border-primary bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-primary)]">
        {activating ? (
          <>
            <Loader2 className="mx-auto size-16 text-primary animate-spin" />
            <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
              PROCESSANDO...
            </h1>
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              Ativando seu plano, aguarde um momento.
            </p>
          </>
        ) : (
          <>
            <CheckCircle className="mx-auto size-16 text-primary" />
            <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
              PAGAMENTO CONFIRMADO!
            </h1>
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              {activated
                ? "Seu plano foi ativado com sucesso. Aproveite todas as funcionalidades do VarzeaPro."
                : "Seu pagamento foi recebido. Se o plano não estiver ativo, acesse a página de planos."}
            </p>
            <Button
              asChild
              className="mt-8 h-14 gap-2 rounded-none border-2 border-foreground bg-foreground px-8 font-display text-xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
            >
              <Link to="/">
                <ArrowLeft className="size-5" />
                VOLTAR AO INICIO
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
