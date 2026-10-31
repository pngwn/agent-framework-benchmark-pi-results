import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { getHomeData } from '../lib/server'
import { CardList } from '../lib/components'
import { humanize } from '../lib/format'

const PAGE_SIZE = 48

interface HomeSearch {
  q?: string
  type?: string
  generation?: string
  page?: number
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined)
    const page = Number(search.page)
    return {
      q: str(search.q),
      type: str(search.type),
      generation: str(search.generation),
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  // Filters live in the URL but are applied client-side; the loader data
  // doesn't depend on them.
  loaderDeps: () => ({}),
  staleTime: Infinity,
  loader: () => getHomeData(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

function buildSearch(filters: { q?: string; type?: string; generation?: string }, page?: number) {
  const search: HomeSearch = {}
  if (filters.q) search.q = filters.q
  if (filters.type) search.type = filters.type
  if (filters.generation) search.generation = filters.generation
  if (page && page > 1) search.page = page
  return search
}

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const q = search.q ?? ''
  const type = search.type ?? ''
  const generation = search.generation ?? ''
  const page = search.page ?? 1

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.species.filter(
      (sp) =>
        (!query || sp.label.toLowerCase().includes(query)) &&
        (!type || sp.types.includes(type)) &&
        (!generation || sp.generation === generation),
    )
  }, [data.species, q, type, generation])

  const typesByName = useMemo(() => {
    const map = new Map<string, { name: string; label: string }[]>()
    for (const sp of data.species) {
      map.set(
        sp.name,
        sp.types.map((t) => ({ name: t, label: humanize(t) })),
      )
    }
    return map
  }, [data.species])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const changeFilters = (next: { q?: string; type?: string; generation?: string }, replace: boolean) => {
    // Changing a filter updates the URL and goes back to page 1.
    navigate({ to: '/', search: buildSearch(next), replace })
  }

  return (
    <>
      <h1>Pokémon</h1>
      <div className="controls">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(e) => changeFilters({ q: e.target.value, type, generation }, true)}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) => changeFilters({ q, type: e.target.value, generation }, false)}
          >
            <option value="">All types</option>
            {data.types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation">Generation</label>
          <select
            id="generation"
            value={generation}
            onChange={(e) => changeFilters({ q, type, generation: e.target.value }, false)}
          >
            <option value="">All generations</option>
            {data.generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{filtered.length} Pokémon</p>

      {pageItems.length === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <>
          <CardList cards={pageItems} typesByName={typesByName} />
          <div className="pagination">
            <p>
              Page {currentPage} of {totalPages}
            </p>
            {currentPage > 1 && (
              <Link to="/" search={buildSearch({ q, type, generation }, currentPage - 1)}>
                Previous page
              </Link>
            )}
            {currentPage < totalPages && (
              <Link to="/" search={buildSearch({ q, type, generation }, currentPage + 1)}>
                Next page
              </Link>
            )}
          </div>
        </>
      )}
    </>
  )
}
