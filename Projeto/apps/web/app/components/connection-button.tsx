import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { UserPlus, UserCheck, UserX, Clock } from "lucide-react"
import { toast } from "sonner"
import { connectionsApi } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

type Props = {
  targetUserId: string
  profileQueryKey?: unknown[]
  className?: string
}

export function ConnectionButton({ targetUserId, profileQueryKey, className }: Props) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["connection-status", targetUserId],
    queryFn: () => connectionsApi.getStatus(targetUserId),
  })

  const status = data

  const sendMutation = useMutation({
    mutationFn: () => connectionsApi.sendRequest(targetUserId),
    onSuccess: () => {
      toast.success("Solicitação enviada!")
      queryClient.invalidateQueries({ queryKey: ["connection-status", targetUserId] })
      queryClient.invalidateQueries({ queryKey: ["my-connections"] })
    },
    onError: () => toast.error("Erro ao enviar solicitação"),
  })

  const respondMutation = useMutation({
    mutationFn: (action: "accepted" | "declined") =>
      connectionsApi.respondToRequest(status!.connectionId!, action),
    onSuccess: (_, action) => {
      toast.success(action === "accepted" ? "Conexão aceita!" : "Solicitação recusada")
      queryClient.invalidateQueries({ queryKey: ["connection-status", targetUserId] })
      queryClient.invalidateQueries({ queryKey: ["my-connections"] })
      if (profileQueryKey) queryClient.invalidateQueries({ queryKey: profileQueryKey })
    },
    onError: () => toast.error("Erro ao responder solicitação"),
  })

  const removeMutation = useMutation({
    mutationFn: () => connectionsApi.removeConnection(status!.connectionId!),
    onSuccess: () => {
      toast.success("Conexão removida")
      queryClient.invalidateQueries({ queryKey: ["connection-status", targetUserId] })
      queryClient.invalidateQueries({ queryKey: ["my-connections"] })
      if (profileQueryKey) queryClient.invalidateQueries({ queryKey: profileQueryKey })
    },
    onError: () => toast.error("Erro ao remover conexão"),
  })

  if (isLoading) {
    return (
      <div className={cn("h-10 w-32 border-2 border-foreground bg-muted animate-pulse", className)} />
    )
  }

  const isPending = sendMutation.isPending || respondMutation.isPending || removeMutation.isPending

  // No connection yet
  if (!status?.connectionId) {
    return (
      <Button
        onClick={() => sendMutation.mutate()}
        disabled={isPending}
        className={cn(
          "rounded-none border-2 border-foreground font-display tracking-widest uppercase shadow-[3px_3px_0px_0px_var(--color-foreground)] hover:-translate-y-0.5 transition-transform",
          className
        )}
      >
        <UserPlus className="size-4 mr-2" />
        CONECTAR
      </Button>
    )
  }

  // I sent the request — waiting
  if (status.status === "pending" && status.isRequester) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 border-2 border-foreground/40 px-3 py-2 text-muted-foreground font-display text-xs tracking-widest uppercase">
          <Clock className="size-4" />
          PENDENTE
        </div>
        <button
          onClick={() => removeMutation.mutate()}
          disabled={isPending}
          className="border-2 border-foreground/40 px-2 py-2 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          title="Cancelar solicitação"
        >
          <UserX className="size-4" />
        </button>
      </div>
    )
  }

  // They sent the request — I can accept/decline
  if (status.status === "pending" && !status.isRequester) {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">QUER CONECTAR</span>
        <Button
          size="sm"
          onClick={() => respondMutation.mutate("accepted")}
          disabled={isPending}
          className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:-translate-y-0.5 transition-transform"
        >
          <UserCheck className="size-3 mr-1" />
          ACEITAR
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => respondMutation.mutate("declined")}
          disabled={isPending}
          className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
        >
          RECUSAR
        </Button>
      </div>
    )
  }

  // Connected!
  if (status.status === "accepted") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 border-2 border-green-600 px-3 py-2 text-green-700 dark:text-green-400 font-display text-xs tracking-widest uppercase">
          <UserCheck className="size-4" />
          CONECTADO
        </div>
        <button
          onClick={() => { if (confirm("Remover conexão?")) removeMutation.mutate() }}
          disabled={isPending}
          className="border-2 border-foreground/40 px-2 py-2 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          title="Remover conexão"
        >
          <UserX className="size-4" />
        </button>
      </div>
    )
  }

  // Declined — allow re-sending
  return (
    <Button
      onClick={() => removeMutation.mutate()}
      disabled={isPending}
      variant="outline"
      className={cn(
        "rounded-none border-2 border-foreground font-display tracking-widest uppercase",
        className
      )}
    >
      <UserPlus className="size-4 mr-2" />
      RECONECTAR
    </Button>
  )
}
