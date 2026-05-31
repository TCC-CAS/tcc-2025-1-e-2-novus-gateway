import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { searchApi } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { POSITIONS, SEX_FILTERS } from "~shared/contracts"
import type { SexFilter } from "~shared/contracts"
import { Filter, ArrowRight, MapPin, User } from "lucide-react"
import { OptimizedImage } from "~/components/optimized-image"

export function meta() {
  return [{ title: "Buscar jogadores - VárzeaPro" }]
}

const PLAYER_LEVELS = [
  { value: "iniciante", label: "INICIANTE" },
  { value: "amador", label: "AMADOR" },
  { value: "intermediario", label: "INTERMEDIÁRIO" },
  { value: "avancado", label: "AVANÇADO" },
]

const POSITION_LABELS: Record<string, string> = {
  goleiro: "GOLEIRO",
  lateral: "LATERAL",
  zagueiro: "ZAGUEIRO",
  volante: "VOLANTE",
  meia: "MEIA",
  atacante: "ATACANTE",
}

const PLAYER_SEX_LABELS: Record<string, string> = {
  male: "MASCULINO",
  female: "FEMININO"
}

const SEX_FILTER_LABELS: Record<SexFilter, string> = {
  male: "MASCULINO",
  female: "FEMININO",
}

export default function JogadorBuscarJogadores() {
  const [position, setPosition] = useState<string | undefined>(undefined)
  const [region, setRegion] = useState("")
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [sex, setSex] = useState<SexFilter | undefined>(undefined)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["community-players", { position, region, level, sex, page }],
    queryFn: () =>
      searchApi.communityPlayers({
        position: position || undefined,
        region: region || undefined,
        level: level || undefined,
        sex,
        page,
      }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">BUSCAR JOGADORES</h1>
        <p className="text-sm text-muted-foreground mt-1">Encontre jogadores para jogar juntos</p>
      </div>

      {/* Filters */}
      <div className="border-2 border-foreground p-4 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <Filter className="size-4" />
          <span className="text-xs font-bold uppercase">Filtros</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={position ?? "__all__"} onValueChange={(v) => { setPosition(v === "__all__" ? undefined : v); setPage(1) }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="POSIÇÃO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">TODAS POSIÇÕES</SelectItem>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {POSITION_LABELS[pos] ?? pos.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={level ?? "__all__"} onValueChange={(v) => { setLevel(v === "__all__" ? undefined : v); setPage(1) }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="NÍVEL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">TODOS NÍVEIS</SelectItem>
              {PLAYER_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sex ?? "__all__"} onValueChange={(v) => { setSex(v === "__all__" ? undefined : (v as SexFilter)); setPage(1) }}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="SEXO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">TODOS SEXOS</SelectItem>
              {SEX_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {SEX_FILTER_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Região..."
            value={region}
            onChange={(e) => { setRegion(e.target.value); setPage(1) }}
            className="h-8 text-xs w-32"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 border-foreground p-4 flex gap-3 items-start animate-pulse">
              <div className="size-12 rounded-full bg-muted shrink-0" />
              <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                <div className="h-4 bg-muted w-3/4" />
                <div className="h-3 bg-muted w-1/2" />
                <div className="h-3 bg-muted w-2/3" />
                <div className="h-7 bg-muted w-24 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="border-2 border-foreground p-8 text-center">
          <p className="font-bold uppercase text-muted-foreground">Nenhum jogador encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros</p>
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((player) => (
              <div key={player.id} className="border-2 border-foreground p-4 flex gap-3 items-start">
                <div className="size-12 rounded-full border-2 border-foreground overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                  {player.photoUrl ? (
                    <OptimizedImage src={player.photoUrl} alt={player.name} className="size-full object-cover rounded-full" />
                  ) : (
                    <User className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase text-sm truncate">{player.name}</p>
                  <p className="mt-0.5 inline-flex border border-foreground/30 bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {PLAYER_SEX_LABELS[player.sex ?? "rather_not_say"] ?? PLAYER_SEX_LABELS.rather_not_say}
                  </p>
                  {player.positions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {player.positions.map((p) => POSITION_LABELS[p] ?? p).join(", ")}
                    </p>
                  )}
                  {(player.region || player.city) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" />
                      {[player.city, player.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <Link to={`/jogadores/${player.id}`}>
                    <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1">
                      VER PERFIL <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ANTERIOR
              </Button>
              <span className="text-sm self-center">{page} / {data.meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                PRÓXIMA
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
