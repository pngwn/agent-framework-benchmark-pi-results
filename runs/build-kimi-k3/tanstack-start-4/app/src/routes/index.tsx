import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { CardList } from '~/lib/components'
import type { CatalogEntry } from '~/lib/data'
import { getHomeData } from '~/lib/server'

const PAGE_SIZE = 48

// Empty/default values are omitted from the URL.
interface HomeSearch {
  q?: string
  type?: string
  generation?: string
  page?: number
}

function validateSearch(search: Record<string, unknown>): HomeSearch {
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
}

export const Route = createFileRoute('/')({
  validateSearch,
  loaderDeps: () => ({}),
  staleTime: Infinity,
  loader: () => getHomeData(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })

  const setFilter = (patch: Partial<HomeSearch>) => {
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, ...patch, page: undefined }),
      replace: true,
    })
  }

  const q = search.q ?? ''
  const type = search.type ?? ''
  const generation = search.generation ?? ''
  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase()
    return (data.catalog as CatalogEntry[]).filter(
      (p) =>
        (!query || p.humanName.toLowerCase().includes(query)) &&
        (!type || p.types.some((t) => t.name === type)) &&
        (!generation || p.generation === generation),
    )
  }, [data.catalog, q, type, generation])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(search.page ?? 1, totalPages)
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <h1>Pokémon</h1>
      <div className="filters">
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(e) => setFilter({ q: e.target.value || undefined })}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setFilter({ type: e.target.value || undefined })}
          >
            <option value="">All types</option>
            {data.types.map((t) => (
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
            value={generation}
            onChange={(e) => setFilter({ generation: e.target.value || undefined })}
          >
            <option value="">All generations</option>
            {data.generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.englishName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="count">{filtered.length} Pokémon</p>
      {pageItems.length > 0 ? (
        <CardList cards={pageItems} showTypes />
      ) : (
        <p>No Pokémon found</p>
      )}
      <div className="pagination">
        <p className="page-status">
          Page {page} of {totalPages}
        </p>
        {page > 1 ? (
          <Link to="." search={(prev) => ({ ...prev, page: page - 1 > 1 ? page - 1 : undefined })}>
            Previous page
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link to="." search={(prev) => ({ ...prev, page: page + 1 })}>
            Next page
          </Link>
        ) : null}
      </div>
    </>
  )
}
