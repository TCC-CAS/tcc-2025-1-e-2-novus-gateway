import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { adminUsersApi, adminModerationApi } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Users, ShieldAlert, LayoutDashboard } from "lucide-react"

export function meta() {
  return [{ title: "Painel - VárzeaPro" }]
}

export default function AdminDashboard() {
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminUsersApi.list({ page: 1, pageSize: 1 }),
  })
  const { data: reportsData } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => adminModerationApi.listReports({ page: 1, pageSize: 1 }),
  })

  const totalUsers = usersData?.meta.total ?? 0
  const totalReports = reportsData?.meta.total ?? 0

  return (
    <div className="space-y-8 pt-8 pb-20">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b-4 border-foreground pb-4">
        <LayoutDashboard className="size-5 text-primary" />
        <h1 className="font-display text-4xl tracking-wide text-foreground uppercase">
          PAINEL ADMIN
        </h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-4 border-foreground bg-background p-6 shadow-[6px_6px_0px_0px_var(--color-primary)]">
          <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground mb-3">
            USUÁRIOS CADASTRADOS
          </p>
          <p className="font-display text-6xl tracking-wide text-foreground">{totalUsers}</p>
        </div>
        <div className="border-4 border-foreground bg-background p-6 shadow-[6px_6px_0px_0px_var(--color-destructive)]">
          <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground mb-3">
            DENÚNCIAS PENDENTES
          </p>
          <p className="font-display text-6xl tracking-wide text-destructive">{totalReports}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <div className="flex items-center gap-3 border-b-4 border-foreground pb-3 mb-4">
          <h2 className="font-display text-2xl tracking-wide text-foreground uppercase">
            AÇÕES RÁPIDAS
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="rounded-none border-2 border-foreground h-12 px-6 font-display text-base tracking-widest transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)]"
          >
            <Link to="/admin/usuarios">
              <Users className="size-4 mr-2" />
              GERENCIAR USUÁRIOS
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="rounded-none border-2 border-foreground h-12 px-6 font-display text-base tracking-widest transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--color-foreground)]"
          >
            <Link to="/admin/moderation">
              <ShieldAlert className="size-4 mr-2" />
              FILA DE MODERAÇÃO
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
