import { useState } from "react"
import { Link } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  teamsApi,
  searchApi,
  matchesApi,
  matchInvitesApi,
  type RosterMember,
} from "~/lib/api-client"
import type { Match, MatchInvite } from "~shared/contracts"
import { OptimizedImage } from "~/components/optimized-image"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Skeleton } from "~/components/ui/skeleton"
import {
  Users,
  UserPlus,
  UserMinus,
  User,
  Search,
  Shield,
  MapPin,
  CheckCircle,
  CalendarDays,
  Plus,
  X,
} from "lucide-react"
import { cn } from "~/lib/utils"

export function meta() {
  return [{ title: "Elenco - VárzeaPro" }]
}

// ----------------------------------------------------------------
// Roster Member Card
// ----------------------------------------------------------------
function MemberCard({
  member,
  onRemove,
  removing,
}: {
  member: RosterMember
  onRemove: (id: string) => void
  removing: boolean
}) {
  return (
    <div className="group relative flex flex-col items-center gap-2 border-2 border-foreground bg-background p-3 hover:shadow-[3px_3px_0px_0px_var(--color-foreground)] transition-all">
      <div className="relative">
        <div className="size-14 border-2 border-foreground overflow-hidden bg-muted flex items-center justify-center">
          {member.photoUrl ? (
            <OptimizedImage
              src={member.photoUrl}
              alt={member.name}
              className="size-full object-cover object-top"
            />
          ) : (
            <User className="size-6 text-muted-foreground/50" />
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(member.id)}
          disabled={removing}
          className="absolute -top-1.5 -right-1.5 size-5 border-2 border-foreground bg-background text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          aria-label={`Remover ${member.name}`}
        >
          <X className="size-2.5" />
        </button>
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="font-display text-xs tracking-wide uppercase truncate text-foreground">
          {member.name.split(" ")[0]}
        </p>
        {member.positions.length > 0 && (
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary/80 truncate mt-0.5">
            {member.positions.slice(0, 2).join(" · ")}
          </p>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Confirmed-for-match panel (players who accepted a specific match invite)
// ----------------------------------------------------------------
function MatchConfirmedPanel({
  match,
  rosterIds,
  onAddToRoster,
  addingId,
}: {
  match: Match
  rosterIds: Set<string>
  onAddToRoster: (playerId: string) => void
  addingId: string | null
}) {
  const { data: matchDetail, isLoading } = useQuery({
    queryKey: ["match-detail", match.id],
    queryFn: () => matchInvitesApi.getMatchWithInvites(match.id),
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const confirmed: MatchInvite[] =
    matchDetail?.invites?.filter((i) => i.status === "accepted") ?? []

  if (!isLoading && confirmed.length === 0) return null

  const dateStr = new Date(match.matchDate + "T00:00:00")
    .toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase()

  return (
    <div className="border-2 border-foreground bg-background">
      {/* Match header */}
      <div className="flex items-center gap-3 border-b-2 border-foreground/20 px-4 py-2.5 bg-muted/20">
        <CalendarDays className="size-3.5 text-primary shrink-0" />
        <span className="font-display text-xs tracking-widest uppercase text-foreground">
          {match.opponentName ? `vs ${match.opponentName}` : "Adversário a definir"}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground ml-auto">
          {dateStr}
          {match.matchTime && ` · ${match.matchTime}`}
        </span>
      </div>

      {/* Confirmed players */}
      {isLoading ? (
        <div className="p-4 flex gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-20 rounded-none bg-muted/50" />
          ))}
        </div>
      ) : (
        <div className="p-3 flex flex-wrap gap-2">
          {confirmed.map((invite) => {
            const inRoster = rosterIds.has(invite.playerId)
            return (
              <div
                key={invite.id}
                className="flex flex-col items-center gap-1.5 group/inv"
              >
                <div className="relative">
                  <div className="size-12 border-2 border-foreground overflow-hidden bg-muted flex items-center justify-center">
                    {invite.playerPhotoUrl ? (
                      <img
                        src={invite.playerPhotoUrl}
                        alt={invite.playerName}
                        className="size-full object-cover object-top"
                      />
                    ) : (
                      <User className="size-5 text-muted-foreground/50" />
                    )}
                  </div>
                  {inRoster && (
                    <span className="absolute -bottom-1 -right-1 size-4 bg-primary border border-background flex items-center justify-center">
                      <CheckCircle className="size-2.5 text-primary-foreground" />
                    </span>
                  )}
                </div>
                <p className="font-display text-[9px] tracking-wide uppercase text-center max-w-[48px] truncate text-muted-foreground">
                  {invite.playerName.split(" ")[0]}
                </p>
                {!inRoster && (
                  <button
                    type="button"
                    onClick={() => onAddToRoster(invite.playerId)}
                    disabled={addingId === invite.playerId}
                    className="border border-primary/60 bg-primary/10 px-1.5 py-0.5 font-display text-[8px] tracking-widest uppercase text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    {addingId === invite.playerId ? "..." : "+ ELENCO"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Main Page
// ----------------------------------------------------------------
export default function TimeElenco() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [addingId, setAddingId] = useState<string | null>(null)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["team", "me"],
    queryFn: () => teamsApi.getMe(),
    retry: false,
  })

  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ["team", "me", "roster"],
    queryFn: async () => {
      const me = await teamsApi.getMe()
      return teamsApi.getRoster(me.id)
    },
    enabled: !!profile,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const { data: upcomingData } = useQuery({
    queryKey: ["team", "me", "matches", "upcoming-elenco"],
    queryFn: () => matchesApi.getMyMatches({ status: "scheduled", pageSize: 5 }),
    staleTime: 1000 * 60 * 2,
    retry: false,
  })

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["player-search-roster", search],
    queryFn: () =>
      searchApi.players({
        name: search,
        pageSize: 8,
      } as Parameters<typeof searchApi.players>[0]),
    enabled: search.length >= 2,
    staleTime: 1000 * 30,
    retry: false,
  })

  const addMutation = useMutation({
    mutationFn: (playerId: string) => teamsApi.addToRoster(playerId),
    onSuccess: () => {
      toast.success("Jogador adicionado ao elenco")
      queryClient.invalidateQueries({ queryKey: ["team", "me", "roster"] })
      setAddingId(null)
    },
    onError: () => {
      toast.error("Erro ao adicionar jogador")
      setAddingId(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (playerId: string) => teamsApi.removeFromRoster(playerId),
    onSuccess: () => {
      toast.success("Jogador removido do elenco")
      queryClient.invalidateQueries({ queryKey: ["team", "me", "roster"] })
    },
    onError: () => toast.error("Erro ao remover jogador"),
  })

  function handleAdd(playerId: string) {
    setAddingId(playerId)
    addMutation.mutate(playerId)
  }

  const members: RosterMember[] = rosterData?.members ?? []
  const rosterIds = new Set(members.map((m) => m.id))
  const upcomingMatches: Match[] = upcomingData?.data ?? []

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 max-w-5xl mx-auto">

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b-4 border-foreground pb-5">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide uppercase text-foreground">
            ELENCO
          </h1>
          <p className="font-bold text-sm tracking-widest uppercase text-muted-foreground mt-1">
            {rosterLoading ? "..." : `${members.length} JOGADORES NO TIME`}
          </p>
        </div>
        <Link
          to="/time/perfil"
          className="font-display text-xs tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors border-b border-dashed border-foreground/30 hover:border-primary"
        >
          VER PERFIL PÚBLICO →
        </Link>
      </div>

      {/* ── ELENCO ATUAL ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Users className="size-4 text-primary" />
          <h2 className="font-display text-xl tracking-widest uppercase">
            ELENCO ATUAL{" "}
            <span className="text-primary">({members.length})</span>
          </h2>
        </div>

        {rosterLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-none bg-muted/50" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="border-2 border-dashed border-foreground/30 p-10 flex flex-col items-center gap-3 text-center">
            <Users className="size-10 text-muted-foreground/30" />
            <p className="font-display text-lg tracking-widest uppercase text-muted-foreground">
              Elenco vazio
            </p>
            <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">
              Busque jogadores abaixo ou adicione os confirmados nos seus jogos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onRemove={removeMutation.mutate}
                removing={removeMutation.isPending && removeMutation.variables === m.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── CONFIRMADOS NOS PRÓXIMOS JOGOS ──────────────────────── */}
      {upcomingMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4 border-t-4 border-foreground pt-6">
            <CheckCircle className="size-4 text-primary" />
            <h2 className="font-display text-xl tracking-widest uppercase">
              CONFIRMADOS NOS PRÓXIMOS JOGOS
            </h2>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Jogadores que aceitaram convite — clique em "+ ELENCO" para fixar no time permanentemente
          </p>
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <MatchConfirmedPanel
                key={match.id}
                match={match}
                rosterIds={rosterIds}
                onAddToRoster={handleAdd}
                addingId={addingId}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── BUSCAR & ADICIONAR JOGADOR ───────────────────────────── */}
      <section className="border-t-4 border-foreground pt-6">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="size-4 text-primary" />
          <h2 className="font-display text-xl tracking-widest uppercase">
            ADICIONAR AO ELENCO
          </h2>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jogador por nome..."
            className="pl-9 rounded-none border-2 border-foreground font-bold tracking-wide focus-visible:ring-0 focus-visible:border-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {search.length < 2 && (
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Digite pelo menos 2 caracteres para buscar
          </p>
        )}

        {isSearching && (
          <div className="space-y-2 mt-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-none bg-muted/50" />
            ))}
          </div>
        )}

        {!isSearching && search.length >= 2 && searchResults?.data?.length === 0 && (
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-2">
            Nenhum jogador encontrado
          </p>
        )}

        {!isSearching && searchResults && searchResults.data.length > 0 && (
          <div className="border-2 border-foreground overflow-hidden mt-1">
            {searchResults.data.map((player) => {
              const inRoster = rosterIds.has(player.id)
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-foreground/10 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <div className="size-9 border border-foreground/30 overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.name}
                        className="size-full object-cover object-top"
                      />
                    ) : (
                      <User className="size-4 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/jogadores/${player.id}`}
                      className="font-bold text-sm uppercase tracking-wide hover:text-primary transition-colors"
                    >
                      {player.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {player.positions.slice(0, 2).map((pos) => (
                        <span key={pos} className="text-[9px] font-bold uppercase tracking-widest text-primary/70">
                          {pos}
                        </span>
                      ))}
                      {player.region && (
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground font-bold uppercase">
                          <MapPin className="size-2.5" />
                          {player.region}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={inRoster ? "outline" : "default"}
                    disabled={inRoster || addMutation.isPending}
                    onClick={() => !inRoster && handleAdd(player.id)}
                    className={cn(
                      "rounded-none font-display text-xs tracking-widest uppercase shrink-0",
                      inRoster
                        ? "border-2 border-foreground/30 text-muted-foreground cursor-default"
                        : "border-2 border-foreground bg-foreground text-background hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_var(--color-primary)] transition-all"
                    )}
                  >
                    {inRoster ? (
                      <>
                        <CheckCircle className="size-3 mr-1" />
                        NO ELENCO
                      </>
                    ) : addingId === player.id ? (
                      "ADICIONANDO..."
                    ) : (
                      <>
                        <Plus className="size-3 mr-1" />
                        ADICIONAR
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
