import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { adminUsersApi } from "~/lib/api-client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Button } from "~/components/ui/button"
import { Users, ChevronLeft, ChevronRight } from "lucide-react"

export function meta() {
  return [{ title: "Usuários - VárzeaPro" }]
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

export default function AdminUsuarios() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: () => adminUsersApi.list({ page, pageSize: 20 }),
  })

  const list = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-8 pt-8 pb-20">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b-4 border-foreground pb-4">
        <Users className="size-5 text-primary" />
        <h1 className="font-display text-4xl tracking-wide text-foreground uppercase">
          USUÁRIOS
        </h1>
        {meta && (
          <span className="ml-auto font-bold text-xs tracking-widest uppercase text-muted-foreground">
            {meta.total} CADASTRADOS
          </span>
        )}
      </div>

      {isLoading && (
        <p className="font-bold text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          CARREGANDO...
        </p>
      )}

      {data && (
        <>
          <div className="border-4 border-foreground overflow-hidden shadow-[6px_6px_0px_0px_var(--color-foreground)]">
            <Table>
              <TableHeader>
                <TableRow className="border-b-4 border-foreground bg-foreground hover:bg-foreground">
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    NOME
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    E-MAIL
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    FUNÇÃO
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    STATUS
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background text-right">
                    AÇÕES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-b-2 border-foreground/10 transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-bold">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <span className="border-2 border-foreground/30 px-2 py-0.5 font-display text-xs tracking-widest uppercase">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`border-2 px-2 py-0.5 font-display text-xs tracking-widest uppercase ${
                          u.status === "banned"
                            ? "border-destructive text-destructive"
                            : u.status === "active"
                              ? "border-primary text-primary"
                              : "border-foreground/30 text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-none border-2 border-foreground font-display tracking-widest text-xs uppercase transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                      >
                        <Link to={`/admin/usuarios/${u.id}`}>VER</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 border-t-2 border-foreground/10 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-none border-2 border-foreground font-display tracking-widest text-xs uppercase disabled:opacity-30 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-foreground)]"
              >
                <ChevronLeft className="size-3 mr-1" />
                ANTERIOR
              </Button>
              <span className="font-display text-sm tracking-widest text-muted-foreground">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-none border-2 border-foreground font-display tracking-widest text-xs uppercase disabled:opacity-30 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-foreground)]"
              >
                PRÓXIMA
                <ChevronRight className="size-3 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
