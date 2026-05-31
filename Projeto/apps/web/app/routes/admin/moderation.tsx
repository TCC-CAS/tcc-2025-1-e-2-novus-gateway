import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { adminModerationApi } from "~/lib/api-client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Button } from "~/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Moderação - VárzeaPro" }]
}

const STATUS_LABELS: Record<string, string> = {
  pending: "PENDENTE",
  dismissed: "DESCARTADO",
  resolved: "RESOLVIDO",
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-destructive text-destructive",
  dismissed: "border-foreground/30 text-muted-foreground",
  resolved: "border-primary text-primary",
}

export default function AdminModeration() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<string | undefined>("pending")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", status, page],
    queryFn: () =>
      adminModerationApi.listReports({
        status: status as "pending" | "dismissed" | "resolved" | undefined,
        page,
        pageSize: 20,
      }),
  })

  const moderateMutation = useMutation({
    mutationFn: ({
      reportId,
      action,
    }: { reportId: string; action: "dismiss" | "remove" | "warn" }) =>
      adminModerationApi.moderate(reportId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
    },
  })

  const list = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-8 pt-8 pb-20">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b-4 border-foreground pb-4">
        <ShieldAlert className="size-5 text-primary" />
        <h1 className="font-display text-4xl tracking-wide text-foreground uppercase">
          MODERAÇÃO
        </h1>
        {meta && (
          <span className="ml-auto font-bold text-xs tracking-widest uppercase text-muted-foreground">
            {meta.total} REGISTROS
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="font-bold text-xs tracking-widest uppercase text-muted-foreground">
          FILTRAR POR STATUS:
        </span>
        <Select
          value={status ?? "all"}
          onValueChange={(v) => {
            setStatus(v === "all" ? undefined : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44 rounded-none border-2 border-foreground font-display tracking-widest text-xs uppercase h-10 focus:ring-0 focus:border-primary">
            <SelectValue placeholder="STATUS" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-2 border-foreground">
            <SelectItem value="all" className="font-display tracking-widest text-xs uppercase">TODOS</SelectItem>
            <SelectItem value="pending" className="font-display tracking-widest text-xs uppercase">PENDENTES</SelectItem>
            <SelectItem value="dismissed" className="font-display tracking-widest text-xs uppercase">DESCARTADOS</SelectItem>
            <SelectItem value="resolved" className="font-display tracking-widest text-xs uppercase">RESOLVIDOS</SelectItem>
          </SelectContent>
        </Select>
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
                    DENUNCIANTE
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    TIPO
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    MOTIVO
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    STATUS
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background">
                    DATA
                  </TableHead>
                  <TableHead className="font-display text-sm tracking-widest uppercase text-background text-right">
                    AÇÕES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow
                    key={r.id}
                    className="border-b-2 border-foreground/10 transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-bold">{r.reporterName}</TableCell>
                    <TableCell>
                      <span className="border-2 border-foreground/30 px-2 py-0.5 font-display text-xs tracking-widest uppercase">
                        {r.reportedEntityType}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-48 truncate">
                      {r.reason}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "border-2 px-2 py-0.5 font-display text-xs tracking-widest uppercase",
                          STATUS_STYLES[r.status] ?? "border-foreground/30 text-muted-foreground"
                        )}
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-xs text-muted-foreground tracking-widest">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              moderateMutation.mutate({ reportId: r.id, action: "dismiss" })
                            }
                            disabled={moderateMutation.isPending}
                            className="rounded-none border-2 border-foreground font-display tracking-widest text-xs uppercase transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-foreground)]"
                          >
                            DESCARTAR
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              moderateMutation.mutate({ reportId: r.id, action: "remove" })
                            }
                            disabled={moderateMutation.isPending}
                            className="rounded-none border-2 border-destructive font-display tracking-widest text-xs uppercase transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-destructive)]"
                          >
                            REMOVER
                          </Button>
                        </div>
                      )}
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
