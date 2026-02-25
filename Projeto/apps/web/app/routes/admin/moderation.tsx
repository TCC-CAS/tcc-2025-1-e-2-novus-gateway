import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminModerationApi } from "~/lib/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function meta() {
  return [{ title: "Moderação - VárzeaPro" }];
}

export default function AdminModeration() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | undefined>("pending");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", status, page],
    queryFn: () =>
      adminModerationApi.listReports({
        status: status as "pending" | "dismissed" | "resolved" | undefined,
        page,
        pageSize: 20,
      }),
  });

  const moderateMutation = useMutation({
    mutationFn: ({
      reportId,
      action,
    }: { reportId: string; action: "dismiss" | "remove" | "warn" }) =>
      adminModerationApi.moderate(reportId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });

  const list = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="container space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Moderação</h1>
      <div className="flex flex-wrap gap-4">
        <Select value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="dismissed">Descartados</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {data && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.reporterName}</TableCell>
                    <TableCell>{r.reportedEntityType}</TableCell>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              moderateMutation.mutate({
                                reportId: r.id,
                                action: "dismiss",
                              })
                            }
                          >
                            Descartar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              moderateMutation.mutate({
                                reportId: r.id,
                                action: "remove",
                              })
                            }
                          >
                            Remover
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
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
