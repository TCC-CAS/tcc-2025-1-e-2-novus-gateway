import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { UserCheck, UserX, Clock, Users } from "lucide-react"
import { toast } from "sonner"
import { Link } from "react-router"
import { connectionsApi } from "~/lib/api-client"
import { useAuth } from "~/lib/auth/auth-context"
import type { Connection } from "~shared/contracts"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Conexões - VárzeaPro" }]
}

function ConnectionCard({ conn, myUserId }: { conn: Connection; myUserId: string }) {
  const queryClient = useQueryClient()

  const respondMutation = useMutation({
    mutationFn: (status: "accepted" | "declined") =>
      connectionsApi.respondToRequest(conn.id, status),
    onSuccess: () => {
      toast.success("Resposta enviada!")
      queryClient.invalidateQueries({ queryKey: ["my-connections"] })
    },
    onError: () => toast.error("Erro ao responder"),
  })

  const removeMutation = useMutation({
    mutationFn: () => connectionsApi.removeConnection(conn.id),
    onSuccess: () => {
      toast.success("Conexão removida")
      queryClient.invalidateQueries({ queryKey: ["my-connections"] })
    },
    onError: () => toast.error("Erro ao remover"),
  })

  const isRequester = conn.requesterId === myUserId
  const isPending = respondMutation.isPending || removeMutation.isPending

  const profileLink = conn.otherUser.role === "player"
    ? `/jogadores/${conn.otherUser.profileId}`
    : `/times/${conn.otherUser.profileId}`

  return (
    <div className={cn(
      "border-2 border-foreground p-4 flex items-center justify-between gap-3",
      conn.status === "accepted" && "border-green-600",
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {conn.otherUser.photoUrl ? (
          <img src={conn.otherUser.photoUrl} alt={conn.otherUser.name} className="size-10 object-cover border-2 border-foreground shrink-0" />
        ) : (
          <div className="size-10 bg-muted border-2 border-foreground shrink-0 flex items-center justify-center">
            <Users className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <Link to={profileLink} className="font-display text-base uppercase tracking-wide truncate hover:text-primary transition-colors block">
            {conn.otherUser.name}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            {conn.status === "pending" && (
              <span className="flex items-center gap-1 font-display text-[10px] tracking-widest uppercase text-muted-foreground">
                <Clock className="size-3" />
                {isRequester ? "Aguardando resposta" : "Quer se conectar"}
              </span>
            )}
            {conn.status === "accepted" && (
              <span className="flex items-center gap-1 font-display text-[10px] tracking-widest uppercase text-green-600">
                <UserCheck className="size-3" />
                Conectado
              </span>
            )}
            {conn.status === "declined" && (
              <span className="font-display text-[10px] tracking-widest uppercase text-muted-foreground/60">Recusado</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {conn.status === "pending" && !isRequester && (
          <>
            <Button
              size="sm"
              onClick={() => respondMutation.mutate("accepted")}
              disabled={isPending}
              className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase"
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
          </>
        )}
        {conn.status === "pending" && isRequester && (
          <button
            onClick={() => removeMutation.mutate()}
            disabled={isPending}
            className="border-2 border-foreground/40 px-2 py-1.5 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
            title="Cancelar solicitação"
          >
            <UserX className="size-4" />
          </button>
        )}
        {conn.status === "accepted" && (
          <button
            onClick={() => { if (confirm("Remover conexão?")) removeMutation.mutate() }}
            disabled={isPending}
            className="border-2 border-foreground/40 px-2 py-1.5 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
            title="Remover conexão"
          >
            <UserX className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function JogadorConexoes() {
  const [tab, setTab] = useState<"pending" | "accepted" | "sent">("pending")
  const { user } = useAuth()
  const myUserId = user?.id ?? ""

  const { data, isLoading } = useQuery({
    queryKey: ["my-connections"],
    queryFn: () => connectionsApi.getMyConnections(),
  })

  const all = data ?? []
  const pending = all.filter((c) => c.status === "pending" && c.receiverId === myUserId)
  const sent = all.filter((c) => c.status === "pending" && c.requesterId === myUserId)
  const accepted = all.filter((c) => c.status === "accepted")

  const displayed = tab === "pending" ? pending : tab === "sent" ? sent : accepted

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-widest uppercase">CONEXÕES</h1>
        <p className="text-muted-foreground text-sm font-bold mt-1">Suas conexões e solicitações</p>
      </div>

      <div className="flex border-b-4 border-foreground">
        {([
          { key: "pending", label: `RECEBIDAS (${pending.length})` },
          { key: "sent", label: `ENVIADAS (${sent.length})` },
          { key: "accepted", label: `CONECTADOS (${accepted.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-2.5 font-display text-sm tracking-widest uppercase transition-colors border-r-2 border-foreground",
              tab === key ? "bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 border-2 border-foreground bg-muted/30 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-12 text-center">
          <Users className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-display text-lg tracking-widest uppercase text-muted-foreground">
            {tab === "pending" ? "Sem solicitações recebidas" : tab === "sent" ? "Sem solicitações enviadas" : "Nenhuma conexão ainda"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((conn) => (
            <ConnectionCard key={conn.id} conn={conn} myUserId={myUserId} />
          ))}
        </div>
      )}
    </div>
  )
}
