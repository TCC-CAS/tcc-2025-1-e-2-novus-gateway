import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, Plus, Users, CheckCircle, XCircle, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { matchesApi, matchInvitesApi, publicApi } from "~/lib/api-client"
import { CreateMatchRequestSchema } from "~shared/contracts"
import type { Match, MatchInvite, CreateMatchRequest } from "~shared/contracts"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Jogos - VárzeaPro" }]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    scheduled: { label: "AGENDADA", className: "bg-primary text-primary-foreground" },
    completed: { label: "REALIZADA", className: "bg-muted text-muted-foreground border border-foreground" },
    cancelled: { label: "CANCELADA", className: "bg-destructive text-destructive-foreground" },
  }
  const { label, className } = map[status] ?? { label: status.toUpperCase(), className: "bg-muted" }
  return <span className={cn("px-2 py-0.5 font-display text-[10px] tracking-widest", className)}>{label}</span>
}

function InviteStatusIcon({ status }: { status: string }) {
  if (status === "accepted") return <CheckCircle className="size-4 text-green-600" />
  if (status === "declined") return <XCircle className="size-4 text-destructive" />
  return <Clock className="size-4 text-muted-foreground" />
}

function InvitePanel({ matchId, invites }: { matchId: string; invites: MatchInvite[] }) {
  const [search, setSearch] = useState("")
  const queryClient = useQueryClient()

  const { data: playersResult } = useQuery({
    queryKey: ["players-for-invite"],
    queryFn: () => publicApi.players({ pageSize: 50 }),
  })

  const allPlayers = playersResult?.data ?? []
  const filtered = allPlayers.filter(
    (p) => search.length >= 2 && p.name.toLowerCase().includes(search.toLowerCase())
  )
  const alreadyInvited = new Set(invites.map((i) => i.playerId))

  const inviteMutation = useMutation({
    mutationFn: (playerId: string) => matchInvitesApi.invitePlayer(matchId, playerId),
    onSuccess: () => {
      toast.success("Convite enviado!")
      setSearch("")
      queryClient.invalidateQueries({ queryKey: ["match-detail", matchId] })
    },
    onError: () => toast.error("Erro ao enviar convite"),
  })

  const removeMutation = useMutation({
    mutationFn: (inviteId: string) => matchInvitesApi.removeInvite(matchId, inviteId),
    onSuccess: () => {
      toast.success("Convite removido")
      queryClient.invalidateQueries({ queryKey: ["match-detail", matchId] })
    },
    onError: () => toast.error("Erro ao remover convite"),
  })

  return (
    <div className="border-t-2 border-foreground/20 mt-3 pt-3 space-y-3">
      {invites.length > 0 && (
        <div>
          <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-2">Convocados</p>
          <div className="space-y-1">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between border border-foreground/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <InviteStatusIcon status={invite.status} />
                  <span className="font-bold text-sm uppercase">{invite.playerName}</span>
                </div>
                <button
                  onClick={() => removeMutation.mutate(invite.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-2">Convocar Jogador</p>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Digite o nome do jogador..."
          className="rounded-none border-2 border-foreground h-9 font-bold text-sm"
        />
        {search.length >= 2 && (
          <div className="border-2 border-foreground border-t-0 divide-y divide-foreground/20 max-h-48 overflow-y-auto">
            {filtered.filter((p) => !alreadyInvited.has(p.id)).length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground font-bold uppercase">Nenhum jogador encontrado</p>
            ) : (
              filtered
                .filter((p) => !alreadyInvited.has(p.id))
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => inviteMutation.mutate(player.id)}
                    disabled={inviteMutation.isPending}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors text-left"
                  >
                    <span className="font-bold text-sm uppercase">{player.name}</span>
                    <span className="text-xs opacity-70">{player.positions?.join(", ")}</span>
                  </button>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()

  const { data: matchDetail } = useQuery({
    queryKey: ["match-detail", match.id],
    queryFn: () => matchInvitesApi.getMatchWithInvites(match.id),
    enabled: expanded,
  })

  const deleteMutation = useMutation({
    mutationFn: () => matchesApi.deleteMatch(match.id),
    onSuccess: () => {
      toast.success("Partida removida")
      queryClient.invalidateQueries({ queryKey: ["my-matches"] })
    },
    onError: () => toast.error("Erro ao remover partida"),
  })

  const invites = matchDetail?.invites ?? []
  const acceptedCount = invites.filter((i) => i.status === "accepted").length

  return (
    <div className="border-2 border-foreground p-4 bg-background">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={match.status} />
            {expanded && invites.length > 0 && (
              <span className="text-xs font-bold text-muted-foreground">{acceptedCount}/{invites.length} confirmados</span>
            )}
          </div>
          <p className="font-display text-lg uppercase tracking-wide truncate">{match.opponentName ?? "A DEFINIR"}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="font-bold">
              {new Date(match.matchDate + "T00:00:00").toLocaleDateString("pt-BR", {
                weekday: "short", day: "2-digit", month: "2-digit",
              }).toUpperCase()}
              {match.matchTime && ` · ${match.matchTime}`}
            </span>
            {match.venueName && <span className="truncate max-w-[200px]">{match.venueName}</span>}
            {match.city && <span>{match.city}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 border-2 border-foreground px-3 py-1.5 font-display text-xs tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors"
          >
            <Users className="size-3.5" />
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          <button
            onClick={() => { if (confirm("Remover esta partida?")) deleteMutation.mutate() }}
            className="border-2 border-foreground px-2 py-1.5 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {expanded && <InvitePanel matchId={match.id} invites={invites} />}
    </div>
  )
}

function CreateMatchForm({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateMatchRequest>({
    resolver: zodResolver(CreateMatchRequestSchema),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split("T")[0]

  async function onSubmit(data: CreateMatchRequest) {
    setIsSubmitting(true)
    try {
      await matchesApi.createMatch(data)
      toast.success("Partida criada!")
      reset()
      queryClient.invalidateQueries({ queryKey: ["my-matches"] })
      onClose()
    } catch {
      toast.error("Erro ao criar partida")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border-2 border-foreground p-4 bg-muted/30 space-y-3">
      <p className="font-display text-base tracking-widest uppercase">Nova Partida</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="font-display text-xs tracking-widest uppercase">Adversário</Label>
          <Input {...register("opponentName")} placeholder="Nome do adversário" className="rounded-none border-2 border-foreground mt-1" />
          {errors.opponentName && <p className="text-xs text-destructive mt-1">{errors.opponentName.message}</p>}
        </div>
        <div>
          <Label className="font-display text-xs tracking-widest uppercase">Data *</Label>
          <Input {...register("matchDate")} type="date" min={today} className="rounded-none border-2 border-foreground mt-1" />
          {errors.matchDate && <p className="text-xs text-destructive mt-1">{errors.matchDate.message}</p>}
        </div>
        <div>
          <Label className="font-display text-xs tracking-widest uppercase">Horário</Label>
          <Input {...register("matchTime")} type="time" className="rounded-none border-2 border-foreground mt-1" />
          {errors.matchTime && <p className="text-xs text-destructive mt-1">{errors.matchTime.message}</p>}
        </div>
        <div>
          <Label className="font-display text-xs tracking-widest uppercase">Local</Label>
          <Input {...register("venueName")} placeholder="Ex: Campo do Zé" className="rounded-none border-2 border-foreground mt-1" />
          {errors.venueName && <p className="text-xs text-destructive mt-1">{errors.venueName.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label className="font-display text-xs tracking-widest uppercase">Endereço</Label>
          <Input {...register("address")} placeholder="Rua, número..." className="rounded-none border-2 border-foreground mt-1" />
          {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
        </div>
        <div>
          <Label className="font-display text-xs tracking-widest uppercase">Bairro</Label>
          <Input {...register("neighborhood")} placeholder="Bairro" className="rounded-none border-2 border-foreground mt-1" />
          {errors.neighborhood && <p className="text-xs text-destructive mt-1">{errors.neighborhood.message}</p>}
        </div>
        <div>
          <Label className="font-display text-xs tracking-widest uppercase">Cidade</Label>
          <Input {...register("city")} placeholder="Cidade" className="rounded-none border-2 border-foreground mt-1" />
          {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="rounded-none border-2 border-foreground font-display tracking-widest uppercase">
          {isSubmitting ? "CRIANDO..." : "CRIAR PARTIDA"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="rounded-none border-2 border-foreground font-display tracking-widest uppercase">
          CANCELAR
        </Button>
      </div>
    </form>
  )
}

export default function TimeJogos() {
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")

  const { data, isLoading } = useQuery({
    queryKey: ["my-matches"],
    queryFn: () => matchesApi.getMyMatches(),
  })

  const matches = data?.data ?? []
  const today = new Date().toISOString().split("T")[0]
  const upcoming = matches.filter((m) => m.matchDate >= today && m.status !== "cancelled")
  const past = matches.filter((m) => m.matchDate < today || m.status === "completed" || m.status === "cancelled")
  const displayed = tab === "upcoming" ? upcoming : past

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-widest uppercase">JOGOS</h1>
          <p className="text-muted-foreground text-sm font-bold mt-1">Gerencie partidas e convoque jogadores</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-none border-2 border-foreground font-display tracking-widest uppercase shadow-[4px_4px_0px_0px_var(--color-foreground)] hover:-translate-y-0.5 transition-transform"
        >
          <Plus className="size-4 mr-2" />
          {showForm ? "FECHAR" : "+ NOVO JOGO"}
        </Button>
      </div>

      {showForm && <CreateMatchForm onClose={() => setShowForm(false)} />}

      <div className="flex border-b-4 border-foreground">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2.5 font-display text-sm tracking-widest uppercase transition-colors border-r-2 border-foreground",
              tab === t ? "bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {t === "upcoming" ? `PRÓXIMAS (${upcoming.length})` : `PASSADAS (${past.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 border-2 border-foreground bg-muted/30 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-12 text-center">
          <CalendarDays className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-display text-lg tracking-widest uppercase text-muted-foreground">
            {tab === "upcoming" ? "Nenhuma partida agendada" : "Sem histórico de partidas"}
          </p>
          {tab === "upcoming" && (
            <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4 rounded-none border-2 border-foreground font-display tracking-widest uppercase">
              AGENDAR AGORA
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      )}
    </div>
  )
}
