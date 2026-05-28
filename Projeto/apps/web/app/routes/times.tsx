import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { publicApi, type PublicTeam } from "~/lib/api-client"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { OptimizedImage } from "~/components/optimized-image"
import { MapPin, Shield, ArrowRight, Search as SearchIcon } from "lucide-react"

export function meta() {
  return [{ title: "Times - VárzeaPro" }]
}

export default function TimesPublicos() {
  const [region, setRegion] = useState("")
  const [regionFilter, setRegionFilter] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["public", "teams", { page, region: regionFilter }],
    queryFn: () => publicApi.teams({ page, pageSize: 12, region: regionFilter || undefined }),
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
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-black uppercase tracking-tight">TIMES</h1>
          <p className="text-sm mt-1 opacity-80">Encontre times para jogar na sua região</p>
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
              <div key={i} className="h-32 bg-muted border-2 border-foreground animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((team: PublicTeam) => (
                <div key={team.id} className="border-2 border-foreground p-4 flex gap-3 items-start">
                  <div className="size-12 border-2 border-foreground overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                    {team.logoUrl ? (
                      <OptimizedImage src={team.logoUrl} alt={team.name} className="size-full object-cover" />
                    ) : (
                      <Shield className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase text-sm truncate">{team.name}</p>
                    {(team.region || team.city) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3" />
                        {[team.city, team.region].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <Link to={`/times/${team.id}`}>
                      <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1">
                        VER PERFIL <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ANTERIOR
                </Button>
                <span className="text-sm self-center">
                  {page} / {data.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  PRÓXIMA
                </Button>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-8 border-2 border-foreground p-6 text-center">
          <p className="font-black uppercase text-lg">CADASTRE SEU TIME</p>
          <p className="text-sm text-muted-foreground mt-1">Junte-se a centenas de times na plataforma</p>
          <Link to="/cadastro">
            <Button className="mt-4">CRIAR CONTA</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
