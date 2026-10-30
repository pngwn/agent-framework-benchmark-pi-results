import { useMemo } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { getHomeData } from '../lib/data.functions'
import { PokemonCardGrid } from '../components/PokemonCard'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => {
    const q = typeof search.q === 'string' && search.q.trim() ? search.q : undefined
    const type = typeof search.type === 'string' && search.type.trim() ? search.type : undefined
    const generation =
      typeof search.generation === 'string' && search.generation.trim() ? search.generation : undefined
    const rawPage = Number(search.page)
    const page = Number.isFinite(rawPage) && rawPage > 1 ? Math.floor(rawPage) : undefined
    return { q, type, generation, page }
  },
  loader: () => getHomeData(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

const PAGE_SIZE = 48

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const q = search.q ?? ''
  const typeFilter = search.type ?? ''
  const generationFilter = search.generation ?? ''

  const setFilters = (patch: Partial<{ q: string; type: string; generation: string; page: number }>) => {
    navigate({
      search: (prev) => {
        const next = { ...prev, ...patch, page: patch.page ?? undefined }
        if (!next.q) delete next.q
        if (!next.type) delete next.type
        if (!next.generation) delete next.generation
        if (!next.page || next.page <= 1) delete next.page
        return next
      },
      replace: patch.q !== undefined,
    })
  }

  const matching = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.species.filter((pokemon) => {
      if (query && !pokemon.displayName.toLowerCase().includes(query)) return false
      if (typeFilter && !pokemon.types.some((type) => type.name === typeFilter)) return false
      if (generationFilter && data.speciesGeneration[pokemon.name] !== generationFilter) return false
      return true
    })
  }, [data, q, typeFilter, generationFilter])

  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages)
  const visible = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageSearch = (targetPage: number) => {
    const next: Record<string, string | number> = {}
    if (q) next.q = q
    if (typeFilter) next.type = typeFilter
    if (generationFilter) next.generation = generationFilter
    if (targetPage > 1) next.page = targetPage
    return next
  }

  return (
    <main>
      <div className="container page">
        <h1>Pokémon</h1>

        <div className="filters">
          <div className="field">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              className="input"
              type="search"
              value={q}
              onChange={(event) => setFilters({ q: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="type-filter">Type</label>
            <select
              id="type-filter"
              className="select"
              value={typeFilter}
              onChange={(event) => setFilters({ type: event.target.value })}
            >
              <option value="">All types</option>
              {data.types.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="generation-filter">Generation</label>
            <select
              id="generation-filter"
              className="select"
              value={generationFilter}
              onChange={(event) => setFilters({ generation: event.target.value })}
            >
              <option value="">All generations</option>
              {data.generations.map((generation) => (
                <option key={generation.name} value={generation.name}>
                  {generation.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="result-count">{matching.length} Pokémon</div>

        {matching.length === 0 ? (
          <p className="empty">No Pokémon found</p>
        ) : (
          <>
            <PokemonCardGrid cards={visible} showTypes />
            <div className="pagination">
              {page > 1 ? (
                <Link to="/" search={pageSearch(page - 1)}>Previous page</Link>
              ) : null}
              <span>Page {page} of {totalPages}</span>
              {page < totalPages ? (
                <Link to="/" search={pageSearch(page + 1)}>Next page</Link>
              ) : null}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
