import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, type ShowcasePlayer } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { OptimizedImage } from "~/components/optimized-image"
import { MapPin, User, ArrowRight, Search as SearchIcon } from "lucide-react"

export function meta() {
  return [{ title: "Jogadores - VárzeaPro" }]
}

export default function JogadoresPublicos() {
  const [region, setRegion] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["public", "players", { page, region: regionFilter }],
    queryFn: () => publicApi.players({ page, pageSize: 12, region: regionFilter || undefined }),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setRegionFilter(region)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b-4 border-foreground bg-foreground text-background py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">JOGADORES</h1>
            <p className="text-sm mt-1 opacity-80">Encontre jogadores na sua região</p>
          </div>
          <Link to="/" className="font-display text-2xl tracking-wider text-background hover:opacity-80 transition-opacity">
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <Input
            placeholder="Filtrar por região..."
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline" size="icon">
            <SearchIcon className="size-4" />
          </Button>
        </form>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted border-2 border-foreground animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((player: ShowcasePlayer) => (
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
                    {player.positions.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {player.positions.map((p) => p.toUpperCase()).join(", ")}
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

            {data.data.length === 0 && (
              <div className="border-2 border-foreground p-8 text-center">
                <p className="font-bold uppercase text-muted-foreground">Nenhum jogador encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">Tente ajustar o filtro de região</p>
              </div>
            )}

            {data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
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

        {/* CTA */}
        <div className="mt-8 border-2 border-foreground p-6 text-center">
          <p className="font-black uppercase text-lg">CRIE SEU PERFIL</p>
          <p className="text-sm text-muted-foreground mt-1">Conecte-se a times e jogadores da sua região</p>
          <Link to="/cadastro">
            <Button className="mt-4">CRIAR CONTA GRÁTIS</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
