import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, CheckCircle, XCircle, Clock, MapPin } from "lucide-react"
import { toast } from "sonner"
import { matchInvitesApi } from "~/lib/api-client"
import type { PlayerMatchInvite } from "~shared/contracts"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Convites - VárzeaPro" }]
}

function InviteCard({ invite }: { invite: PlayerMatchInvite }) {
  const queryClient = useQueryClient()
  const respondMutation = useMutation({
    mutationFn: (status: "accepted" | "declined") => matchInvitesApi.respondToInvite(invite.id, status),
    onSuccess: (_, status) => {
      toast.success(status === "accepted" ? "Convite aceito!" : "Convite recusado")
      queryClient.setQueryData<PlayerMatchInvite[]>(["my-invites"], (old) =>
        old?.map((inv) => inv.id === invite.id ? { ...inv, status } : inv)
      )
    },
    onError: () => toast.error("Erro ao responder convite"),
  })

  return (
    <div className={cn(
      "border-2 border-foreground p-4",
      invite.status === "accepted" && "border-green-600 bg-green-50 dark:bg-green-950/20",
      invite.status === "declined" && "border-foreground/30 opacity-60",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {invite.status === "pending" && <Clock className="size-4 text-primary" />}
            {invite.status === "accepted" && <CheckCircle className="size-4 text-green-600" />}
            {invite.status === "declined" && <XCircle className="size-4 text-muted-foreground" />}
            <span className="font-display text-xs tracking-widest uppercase text-muted-foreground">
              {invite.status === "pending" ? "PENDENTE" : invite.status === "accepted" ? "ACEITO" : "RECUSADO"}
            </span>
          </div>
          <p className="font-display text-lg uppercase tracking-wide">{invite.match.teamName}</p>
          {invite.match.opponentName && (
            <p className="text-sm font-bold text-muted-foreground">vs. {invite.match.opponentName}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-bold">
              <CalendarDays className="size-3.5" />
              {new Date(invite.match.matchDate + "T00:00:00").toLocaleDateString("pt-BR", {
                weekday: "long", day: "2-digit", month: "long",
              })}
              {invite.match.matchTime && ` · ${invite.match.matchTime}`}
            </span>
            {(invite.match.venueName || invite.match.city) && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {[invite.match.venueName, invite.match.city].filter(Boolean).join(" — ")}
              </span>
            )}
          </div>
        </div>
        {invite.status === "pending" && (
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => respondMutation.mutate("accepted")}
              disabled={respondMutation.isPending}
              className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase shadow-[2px_2px_0px_0px_var(--color-foreground)] hover:-translate-y-0.5 transition-transform"
            >
              ACEITAR
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respondMutation.mutate("declined")}
              disabled={respondMutation.isPending}
              className="rounded-none border-2 border-foreground font-display text-xs tracking-widest uppercase hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
            >
              RECUSAR
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JogadorConvites() {
  const [tab, setTab] = useState<"pending" | "history">("pending")
  const { data, isLoading } = useQuery({
    queryKey: ["my-invites"],
    queryFn: () => matchInvitesApi.getMyInvites(),
  })

  const invites = data ?? []
  const pending = invites.filter((i) => i.status === "pending")
  const history = invites.filter((i) => i.status !== "pending")
  const displayed = tab === "pending" ? pending : history

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-widest uppercase">CONVITES</h1>
        <p className="text-muted-foreground text-sm font-bold mt-1">Times te chamaram para jogar</p>
      </div>
      <div className="flex border-b-4 border-foreground">
        {(["pending", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2.5 font-display text-sm tracking-widest uppercase transition-colors border-r-2 border-foreground",
              tab === t ? "bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {t === "pending" ? `PENDENTES (${pending.length})` : `HISTÓRICO (${history.length})`}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 border-2 border-foreground bg-muted/30 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-12 text-center">
          <CalendarDays className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-display text-lg tracking-widest uppercase text-muted-foreground">
            {tab === "pending" ? "Nenhum convite pendente" : "Sem histórico de convites"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((invite) => <InviteCard key={invite.id} invite={invite} />)}
        </div>
      )}
    </div>
  )
}
