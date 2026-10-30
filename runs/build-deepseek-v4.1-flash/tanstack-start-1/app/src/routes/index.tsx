import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { PokemonCard } from '~/components/PokemonCard'
import type { HomeSearch } from '~/lib/types'
import { loadHome } from '~/server/functions'

const PAGE_SIZE = 48

function validateSearch(raw: Record<string, unknown>): HomeSearch {
  const q = typeof raw.q === 'string' && raw.q.trim() ? raw.q : undefined
  const type = typeof raw.type === 'string' && raw.type ? raw.type : undefined
  const generation =
    typeof raw.generation === 'string' && raw.generation ? raw.generation : undefined
  const rawPage = Number(raw.page)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : undefined
  return { q, type, generation, page }
}

export const Route = createFileRoute('/')({
  validateSearch,
  loader: () => loadHome(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q ?? '')

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  const filtered = useMemo(() => {
    const needle = (search.q ?? '').trim().toLowerCase()
    return data.species.filter((species) => {
      if (needle && !species.displayName.toLowerCase().includes(needle)) return false
      if (search.type && !species.types.some((type) => type.name === search.type)) return false
      if (search.generation && species.generation !== search.generation) return false
      return true
    })
  }, [data.species, search.q, search.type, search.generation])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(search.page ?? 1, 1), totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const searchFor = (overrides: Partial<HomeSearch>): HomeSearch => ({
    q: search.q,
    type: search.type,
    generation: search.generation,
    ...overrides,
  })

  const changeQuery = (value: string) => {
    setQuery(value)
    navigate({
      to: '/',
      replace: true,
      search: searchFor({ q: value.trim() ? value : undefined, page: undefined }),
    })
  }

  return (
    <>
      <h1>Pokémon</h1>

      <div className="home-filters">
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={search.type ?? ''}
            onChange={(event) =>
              navigate({
                to: '/',
                search: searchFor({ type: event.target.value || undefined, page: undefined }),
              })
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
              navigate({
                to: '/',
                search: searchFor({
                  generation: event.target.value || undefined,
                  page: undefined,
                }),
              })
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

      <p className="result-count">{filtered.length} Pokémon</p>

      {visible.length ? (
        <ul className="pokemon-grid home-grid">
          {visible.map((species) => (
            <PokemonCard
              key={species.name}
              card={{
                speciesName: species.name,
                displayName: species.displayName,
                dexNumber: `#${String(species.id).padStart(4, '0')}`,
                sprite: species.sprite,
                types: species.types,
              }}
              showTypes
            />
          ))}
        </ul>
      ) : (
        <p className="empty-message">No Pokémon found</p>
      )}

      {filtered.length ? (
        <div className="pagination">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage > 1 ? (
            <Link
              to="/"
              search={searchFor({ page: currentPage > 2 ? currentPage - 1 : undefined })}
            >
              Previous page
            </Link>
          ) : null}
          {currentPage < totalPages ? (
            <Link to="/" search={searchFor({ page: currentPage + 1 })}>
              Next page
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
