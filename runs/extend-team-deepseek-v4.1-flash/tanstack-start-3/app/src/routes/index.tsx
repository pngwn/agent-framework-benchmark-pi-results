import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { getHomeData } from '../server/functions'
import { humanize } from '../lib/format'
import { PokemonCardList } from '../components/PokemonCard'

const PAGE_SIZE = 48
const SEARCH_DEBOUNCE_MS = 150

interface HomeSearch {
  q?: string
  type?: string
  generation?: string
  page?: number
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined)

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const page = Number(search.page)
    return {
      q: text(search.q),
      type: text(search.type),
      generation: text(search.generation),
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  loader: () => getHomeData(),
  // Filtering happens on the client, so changing the query string doesn't refetch.
  staleTime: 5 * 60_000,
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // The search box filters immediately; the URL catches up after a short debounce.
  const [query, setQuery] = useState(search.q ?? '')
  const lastPushed = useRef(search.q ?? '')
  useEffect(() => {
    const fromUrl = search.q ?? ''
    if (fromUrl !== lastPushed.current) {
      lastPushed.current = fromUrl
      setQuery(fromUrl)
    }
  }, [search.q])
  useEffect(() => {
    if (query === lastPushed.current) return
    const timer = setTimeout(() => {
      lastPushed.current = query
      navigate({
        search: (prev) => ({ ...prev, q: query.trim() ? query : undefined, page: undefined }),
        replace: true,
        resetScroll: false,
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, navigate])

  const typeLabels = useMemo(() => new Map(data.types.map((t) => [t.name, t.label])), [data.types])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.species.filter(
      (s) =>
        (!needle || humanize(s.name).toLowerCase().includes(needle)) &&
        (!search.type || s.types.includes(search.type)) &&
        (!search.generation || s.generation === search.generation),
    )
  }, [data.species, query, search.type, search.generation])

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const requestedPage = query === (search.q ?? '') ? (search.page ?? 1) : 1
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const setFilter = (key: 'type' | 'generation', value: string) =>
    navigate({
      search: (prev) => ({ ...prev, [key]: value || undefined, page: undefined }),
      resetScroll: false,
    })

  return (
    <div className="page">
      <h1>Pokémon</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" value={search.type ?? ''} onChange={(e) => setFilter('type', e.target.value)}>
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
            value={search.generation ?? ''}
            onChange={(e) => setFilter('generation', e.target.value)}
          >
            <option value="">All generations</option>
            {data.generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {matches.length === 0 ? (
        <p className="empty">No Pokémon found</p>
      ) : (
        <div>
          <p className="count">{matches.length} Pokémon</p>
          <PokemonCardList cards={visible} typeLabels={typeLabels} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <Link from="/" search={(prev) => ({ ...prev, page: page - 1 > 1 ? page - 1 : undefined })}>
                Previous page
              </Link>
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link from="/" search={(prev) => ({ ...prev, page: page + 1 })}>
                Next page
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
