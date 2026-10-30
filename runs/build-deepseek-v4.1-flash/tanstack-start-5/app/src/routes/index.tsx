import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Page } from '../components/Layout'
import { PokemonCardList } from '../components/PokemonCard'
import { loadHomePage } from '../lib/queries'

type HomeSearch = {
  q?: string
  type?: string
  generation?: string
  page?: number
}

function validateSearch(search: Record<string, unknown>): HomeSearch {
  const result: HomeSearch = {}
  if (typeof search.q === 'string' && search.q !== '') result.q = search.q
  if (typeof search.type === 'string' && search.type !== '') result.type = search.type
  if (typeof search.generation === 'string' && search.generation !== '') {
    result.generation = search.generation
  }
  const page = Number(search.page)
  if (Number.isFinite(page) && page > 1) result.page = Math.trunc(page)
  return result
}

export const Route = createFileRoute('/')({
  validateSearch,
  loaderDeps: ({ search }) => ({
    q: search.q ?? '',
    type: search.type ?? '',
    generation: search.generation ?? '',
    page: search.page ?? 1,
  }),
  loader: async ({ deps }) => loadHomePage({ data: deps }),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [query, setQuery] = useState(search.q ?? '')

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  const update = (patch: Partial<HomeSearch>) => {
    const next: HomeSearch = {
      q: search.q ?? '',
      type: search.type ?? '',
      generation: search.generation ?? '',
      page: 1,
      ...patch,
    }
    const cleaned: HomeSearch = {}
    if (next.q) cleaned.q = next.q
    if (next.type) cleaned.type = next.type
    if (next.generation) cleaned.generation = next.generation
    if (next.page && next.page > 1) cleaned.page = next.page
    void navigate({ to: '/', search: cleaned })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== (search.q ?? '')) {
        update({ q: query })
      }
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, search.q, search.type, search.generation])

  const linkSearch = (page: number): HomeSearch => {
    const next: HomeSearch = {}
    if (search.q) next.q = search.q
    if (search.type) next.type = search.type
    if (search.generation) next.generation = search.generation
    if (page > 1) next.page = page
    return next
  }

  return (
    <Page>
      <main className="page home-page">
        <h1>Pokémon</h1>

        <div className="filters">
          <div className="field search-field">
            <label htmlFor="search-input">Search</label>
            <input
              id="search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="type-filter">Type</label>
            <select
              id="type-filter"
              value={search.type ?? ''}
              onChange={(event) => update({ type: event.target.value })}
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
              value={search.generation ?? ''}
              onChange={(event) => update({ generation: event.target.value })}
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

        <p className="count">{data.count} Pokémon</p>

        {data.count === 0 ? (
          <p className="empty">No Pokémon found</p>
        ) : (
          <PokemonCardList cards={data.items} />
        )}

        <div className="pagination">
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          {data.page > 1 ? (
            <Link to="/" search={linkSearch(data.page - 1)}>
              Previous page
            </Link>
          ) : null}
          {data.page < data.totalPages ? (
            <Link to="/" search={linkSearch(data.page + 1)}>
              Next page
            </Link>
          ) : null}
        </div>
      </main>
    </Page>
  )
}
