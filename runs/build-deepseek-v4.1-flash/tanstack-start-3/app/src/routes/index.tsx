import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PokemonCardList, type PokemonCardData } from '../components/PokedexUi'
import { getHomeData } from '../server/pokedex'

const PAGE_SIZE = 48

type HomeSearch = {
  q?: string
  type?: string
  generation?: string
  page?: number
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const q = typeof search.q === 'string' && search.q.length > 0 ? search.q : undefined
    const type = typeof search.type === 'string' && search.type.length > 0 ? search.type : undefined
    const generation =
      typeof search.generation === 'string' && search.generation.length > 0
        ? search.generation
        : undefined
    const parsedPage = Number(search.page)
    const page = Number.isInteger(parsedPage) && parsedPage > 1 ? parsedPage : undefined
    return { q, type, generation, page }
  },
  loader: () => getHomeData(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

function cleanSearch(search: HomeSearch): HomeSearch {
  return {
    q: search.q || undefined,
    type: search.type || undefined,
    generation: search.generation || undefined,
    page: search.page && search.page > 1 ? search.page : undefined,
  }
}

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.rows.filter((row: PokemonCardData & { generation: string | null; types: Array<{ name: string }> }) => {
      if (needle && !row.label.toLowerCase().includes(needle)) return false
      if (search.type && !row.types.some((type) => type.name === search.type)) return false
      if (search.generation && row.generation !== search.generation) return false
      return true
    })
  }, [data.rows, query, search.type, search.generation])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, search.page ?? 1), totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function go(next: HomeSearch) {
    navigate({ to: '/', search: cleanSearch(next) })
  }

  function onQueryChange(value: string) {
    setQuery(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      navigate({
        to: '/',
        search: cleanSearch({ ...search, q: value, page: undefined }),
        replace: true,
      })
    }, 200)
  }

  function onFilterChange(patch: Partial<HomeSearch>) {
    go({ ...search, q: query, ...patch, page: undefined })
  }

  const previousSearch: HomeSearch = cleanSearch({ ...search, page: currentPage - 1 })
  const nextSearch: HomeSearch = cleanSearch({ ...search, page: currentPage + 1 })

  return (
    <>
      <h1>Pokémon</h1>
      <div className="filters">
        <div className="filter-field filter-search">
          <label htmlFor="search-filter">Search</label>
          <input
            id="search-filter"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={search.type ?? ''}
            onChange={(event) => onFilterChange({ type: event.target.value || undefined })}
          >
            <option value="">All types</option>
            {data.types.map((type: { name: string; label: string }) => (
              <option key={type.name} value={type.name}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={search.generation ?? ''}
            onChange={(event) => onFilterChange({ generation: event.target.value || undefined })}
          >
            <option value="">All generations</option>
            {data.generations.map((generation: { name: string; label: string }) => (
              <option key={generation.name} value={generation.name}>
                {generation.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{filtered.length} Pokémon</p>

      {filtered.length === 0 ? (
        <p className="empty-state">No Pokémon found</p>
      ) : (
        <PokemonCardList cards={pageRows} showTypes />
      )}

      <div className="pagination">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        {currentPage > 1 ? (
          <Link to="/" search={previousSearch}>
            Previous page
          </Link>
        ) : null}
        {currentPage < totalPages ? (
          <Link to="/" search={nextSearch}>
            Next page
          </Link>
        ) : null}
      </div>
    </>
  )
}
