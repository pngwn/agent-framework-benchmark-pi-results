import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { fetchHomeIndex } from '../server/fns'
import { CardList } from '../components/shared'

const PAGE_SIZE = 48

type HomeSearch = {
  q?: string
  type?: string
  generation?: string
  page?: number
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    q: typeof search.q === 'string' && search.q ? search.q : undefined,
    type: typeof search.type === 'string' && search.type ? search.type : undefined,
    generation: typeof search.generation === 'string' && search.generation ? search.generation : undefined,
    page: Number(search.page) > 1 ? Math.floor(Number(search.page)) : undefined,
  }),
  loaderDeps: () => ({}),
  staleTime: Infinity,
  loader: () => fetchHomeIndex(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })

  const urlQuery = search.q ?? ''
  // Local state so typing feels instant; the URL is the source of truth and
  // syncs back (e.g. back/forward navigation).
  const [query, setQuery] = useState(urlQuery)
  useEffect(() => setQuery(urlQuery), [urlQuery])

  const setFilters = (patch: Partial<HomeSearch>) =>
    navigate({
      search: (prev: HomeSearch) => ({ ...prev, ...patch, page: undefined }),
      replace: true,
    })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.species.filter((s: any) => {
      if (q && !s.displayName.toLowerCase().includes(q)) return false
      if (search.type && !s.types.some((t: any) => t.name === search.type)) return false
      if (search.generation && s.generation !== search.generation) return false
      return true
    })
  }, [data, query, search.type, search.generation])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages)
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <h1>Pokémon</h1>
      <form className="controls" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setFilters({ q: e.target.value || undefined })
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={search.type ?? ''}
            onChange={(e) => setFilters({ type: e.target.value || undefined })}
          >
            <option value="">All types</option>
            {data.types.map((t: any) => (
              <option key={t.name} value={t.name}>
                {t.englishName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation">Generation</label>
          <select
            id="generation"
            value={search.generation ?? ''}
            onChange={(e) => setFilters({ generation: e.target.value || undefined })}
          >
            <option value="">All generations</option>
            {data.generations.map((g: any) => (
              <option key={g.name} value={g.name}>
                {g.englishName}
              </option>
            ))}
          </select>
        </div>
      </form>
      <p className="count">{filtered.length} Pokémon</p>
      {pageItems.length > 0 ? (
        <CardList
          cards={pageItems.map((s: any) => ({
            id: s.id,
            speciesName: s.name,
            name: s.displayName,
            sprite: s.sprite,
            types: s.types,
          }))}
          showTypes
        />
      ) : (
        <p>No Pokémon found</p>
      )}
      {pageItems.length > 0 && (
        <div className="pagination">
          {page > 1 && (
            <Link to="." search={(prev: HomeSearch) => ({ ...prev, page: page - 1 > 1 ? page - 1 : undefined })}>
              Previous page
            </Link>
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link to="." search={(prev: HomeSearch) => ({ ...prev, page: page + 1 })}>
              Next page
            </Link>
          )}
        </div>
      )}
    </>
  )
}
