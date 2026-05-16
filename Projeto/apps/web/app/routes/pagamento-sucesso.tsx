import { Link } from "react-router"
import { Button } from "~/components/ui/button"
import { CheckCircle, ArrowLeft } from "lucide-react"

export function meta() {
  return [
    { title: "Pagamento Confirmado - VárzeaPro" },
  ]
}

export default function PagamentoSucesso() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg border-4 border-primary bg-background p-12 text-center shadow-[8px_8px_0px_0px_var(--color-primary)]">
        <CheckCircle className="mx-auto size-16 text-primary" />
        <h1 className="mt-6 font-display text-4xl tracking-wide text-foreground">
          PAGAMENTO CONFIRMADO!
        </h1>
        <p className="mt-4 text-lg font-medium text-muted-foreground">
          Seu plano foi ativado com sucesso. Aproveite todas as funcionalidades do VárzeaPro.
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
