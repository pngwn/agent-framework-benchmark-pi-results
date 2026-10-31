import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { getHomeData } from '../server/data'
import { CardGrid, type CardModel } from '../components/PokemonCard'

const PAGE_SIZE = 48

interface HomeSearch {
  q?: string
  type?: string
  generation?: string
  page?: number
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const page = Number(search.page)
    return {
      q: typeof search.q === 'string' && search.q ? search.q : undefined,
      type: typeof search.type === 'string' && search.type ? search.type : undefined,
      generation:
        typeof search.generation === 'string' && search.generation
          ? search.generation
          : undefined,
      page: Number.isFinite(page) && page > 1 ? Math.floor(page) : undefined,
    }
  },
  loader: () => getHomeData(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const query = search.q ?? ''
  const typeFilter = search.type ?? ''
  const generationFilter = search.generation ?? ''
  const pageParam = search.page ?? 1

  // The search input is debounced; keep a local value in sync with the URL.
  const [input, setInput] = useState(query)
  useEffect(() => setInput(query), [query])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const updateFilters = (updates: Partial<HomeSearch>) => {
    const next = { q: query, type: typeFilter, generation: generationFilter, ...updates }
    navigate({
      to: '/',
      search: {
        q: next.q || undefined,
        type: next.type || undefined,
        generation: next.generation || undefined,
      },
      replace: true,
    })
  }

  const onSearchInput = (value: string) => {
    setInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateFilters({ q: value }), 250)
  }

  const typeNames = useMemo(() => new Set(data.types.map((t) => t.name)), [data.types])
  const generationNames = useMemo(
    () => new Set(data.generations.map((g) => g.name)),
    [data.generations],
  )
  const typeDisplay = useMemo(
    () => new Map(data.types.map((t) => [t.name, t.display])),
    [data.types],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.pokemon.filter((p) => {
      if (q && !p.display.toLowerCase().includes(q)) return false
      if (typeFilter && typeNames.has(typeFilter) && !p.types.includes(typeFilter))
        return false
      if (
        generationFilter &&
        generationNames.has(generationFilter) &&
        p.generation !== generationFilter
      )
        return false
      return true
    })
  }, [data.pokemon, query, typeFilter, generationFilter, typeNames, generationNames])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(pageParam, totalPages)
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const cards: CardModel[] = pageItems.map((p) => ({
    id: p.id,
    name: p.name,
    display: p.display,
    sprite: p.sprite,
    types: p.types.map((t) => ({ name: t, display: typeDisplay.get(t) ?? t })),
  }))

  const pageSearch = (n: number) => ({
    q: query || undefined,
    type: typeFilter || undefined,
    generation: generationFilter || undefined,
    page: n > 1 ? n : undefined,
  })

  return (
    <>
      <h1>Pokémon</h1>

      <div className="controls">
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={input}
            onChange={(event) => onSearchInput(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={typeNames.has(typeFilter) ? typeFilter : ''}
            onChange={(event) => updateFilters({ type: event.target.value })}
          >
            <option value="">All types</option>
            {data.types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.display}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={generationNames.has(generationFilter) ? generationFilter : ''}
            onChange={(event) => updateFilters({ generation: event.target.value })}
          >
            <option value="">All generations</option>
            {data.generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.display}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{filtered.length} Pokémon</p>

      {filtered.length === 0 ? (
        <p className="no-results">No Pokémon found</p>
      ) : (
        <>
          <CardGrid cards={cards} />
          <div className="pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            {page > 1 && (
              <Link to="/" search={pageSearch(page - 1)}>
                Previous page
              </Link>
            )}
            {page < totalPages && (
              <Link to="/" search={pageSearch(page + 1)}>
                Next page
              </Link>
            )}
          </div>
        </>
      )}
    </>
  )
}
