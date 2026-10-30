import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { PokemonCardList } from '../components/PokemonCard'
import { getHomeData } from '../lib/data.functions'

export interface HomeSearch {
  q?: string
  type?: string
  generation?: string
  page?: number
}

function validateSearch(search: Record<string, unknown>): HomeSearch {
  const text = (value: unknown) =>
    typeof value === 'string' && value.trim() !== '' ? value : undefined
  const pageNumber = Number(search.page)
  return {
    q: text(search.q),
    type: text(search.type),
    generation: text(search.generation),
    page: Number.isFinite(pageNumber) && pageNumber > 1 ? Math.floor(pageNumber) : undefined,
  }
}

export const Route = createFileRoute('/')({
  validateSearch,
  loaderDeps: ({ search }) => ({
    q: search.q,
    type: search.type,
    generation: search.generation,
    page: search.page,
  }),
  loader: ({ deps }) => getHomeData({ data: deps }),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [q, setQ] = useState(search.q ?? '')

  useEffect(() => {
    setQ(search.q ?? '')
  }, [search.q])

  const updateSearch = (next: Partial<HomeSearch>, replace = false) => {
    void navigate({
      search: (previous) => {
        const combined = {
          ...previous,
          ...next,
          page: undefined,
        }
        return {
          q: combined.q || undefined,
          type: combined.type || undefined,
          generation: combined.generation || undefined,
        }
      },
      replace,
    })
  }

  const pageSearch = (page: number) => ({
    q: data.q || undefined,
    type: data.type || undefined,
    generation: data.generation || undefined,
    page: page > 1 ? page : undefined,
  })

  return (
    <main className="container page">
      <h1>Pokémon</h1>

      <div className="filter-bar">
        <div className="field search-field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(event) => {
              const value = event.target.value
              setQ(value)
              updateSearch({ q: value }, true)
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={search.type ?? ''}
            onChange={(event) =>
              updateSearch({ type: event.target.value, q }, false)
            }
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
            onChange={(event) =>
              updateSearch({ generation: event.target.value, q }, false)
            }
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

      <p className="result-count">{data.count} Pokémon</p>

      {data.count === 0 ? (
        <p className="empty-state">No Pokémon found</p>
      ) : (
        <>
          <PokemonCardList cards={data.cards} />
          <p className="pagination">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            {data.page > 1 && (
              <Link to="/" search={pageSearch(data.page - 1)}>
                Previous page
              </Link>
            )}
            {data.page < data.totalPages && (
              <Link to="/" search={pageSearch(data.page + 1)}>
                Next page
              </Link>
            )}
          </p>
        </>
      )}
    </main>
  )
}

