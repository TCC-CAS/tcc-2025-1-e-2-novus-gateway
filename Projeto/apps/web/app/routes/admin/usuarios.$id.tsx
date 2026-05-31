import { useParams, Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { adminUsersApi } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { ArrowLeft, User, ShieldBan } from "lucide-react"

export function meta() {
  return [{ title: "Detalhe do usuário - VárzeaPro" }]
}

const ROLE_LABELS: Record<string, string> = {
  player: "JOGADOR",
  team: "TIME",
  admin: "ADMIN",
}

const STATUS_LABELS: Record<string, string> = {
  active: "ATIVO",
  banned: "BANIDO",
  inactive: "INATIVO",
}

export default function AdminUsuarioDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => adminUsersApi.getById(id!),
    enabled: !!id,
  })

  const banMutation = useMutation({
    mutationFn: () => adminUsersApi.ban(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "users", id] })
    },
  })

  if (isLoading || !user) {
    return (
      <div className="pt-8 pb-20">
        <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          CARREGANDO...
        </p>
      </div>
    )
  }

  const isBanned = user.status === "banned"

  return (
    <div className="space-y-8 pt-8 pb-20">
      {/* Back link */}
      <Link
        to="/admin/usuarios"
        className="inline-flex items-center gap-2 font-bold text-xs tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        VOLTAR PARA USUÁRIOS
      </Link>

      {/* Page header */}
      <div className="flex items-center gap-3 border-b-4 border-foreground pb-4">
        <User className="size-5 text-primary" />
        <h1 className="font-display text-4xl tracking-wide text-foreground uppercase">
          USUÁRIO
        </h1>
        {isBanned && (
          <span className="ml-auto border-2 border-destructive px-3 py-1 font-display text-xs tracking-widest uppercase text-destructive">
            BANIDO
          </span>
        )}
      </div>

      {/* User info card */}
      <div className="border-4 border-foreground bg-background p-6 shadow-[6px_6px_0px_0px_var(--color-foreground)] space-y-6">
        <div>
          <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground mb-1">
            NOME
          </p>
          <p className="font-display text-3xl tracking-wide text-foreground uppercase">
            {user.name}
          </p>
        </div>
        <div>
          <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground mb-1">
            E-MAIL
          </p>
          <p className="font-bold text-foreground">{user.email}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground mb-2">
              FUNÇÃO
            </p>
            <span className="border-2 border-foreground/30 px-3 py-1.5 font-display text-sm tracking-widest uppercase">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <div>
            <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground mb-2">
              STATUS
            </p>
            <span
              className={`border-2 px-3 py-1.5 font-display text-sm tracking-widest uppercase ${
                isBanned
                  ? "border-destructive text-destructive"
                  : user.status === "active"
                    ? "border-primary text-primary"
                    : "border-foreground/30 text-muted-foreground"
              }`}
            >
              {STATUS_LABELS[user.status] ?? user.status}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={isBanned}
              className="rounded-none border-2 border-destructive h-12 px-6 font-display text-base tracking-widest uppercase transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--color-destructive)] disabled:opacity-30"
            >
              <ShieldBan className="size-4 mr-2" />
              BANIR USUÁRIO
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-none border-4 border-foreground shadow-[8px_8px_0px_0px_var(--color-destructive)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl tracking-wide uppercase">
                BANIR USUÁRIO?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-xs tracking-widest uppercase text-muted-foreground">
                O usuário não poderá acessar a plataforma até ser desbanido.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-none border-2 border-foreground font-display tracking-widest text-xs uppercase">
                CANCELAR
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => banMutation.mutate()}
                className="rounded-none border-2 border-destructive bg-destructive text-destructive-foreground font-display tracking-widest text-xs uppercase hover:bg-destructive/90 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-destructive)]"
              >
                CONFIRMAR BAN
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
