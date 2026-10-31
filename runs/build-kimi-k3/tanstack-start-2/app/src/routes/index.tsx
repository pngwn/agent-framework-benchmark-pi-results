import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PokemonCard } from '~/components/PokemonCard'
import { humanize } from '~/lib/format'
import { fetchHomeData } from '~/server/functions'

type HomeSearch = {
  q?: string
  type?: string
  generation?: string
  page?: number
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    q: typeof search.q === 'string' && search.q !== '' ? search.q : undefined,
    type: typeof search.type === 'string' && search.type !== '' ? search.type : undefined,
    generation:
      typeof search.generation === 'string' && search.generation !== ''
        ? search.generation
        : undefined,
    page: Number(search.page) > 1 ? Math.floor(Number(search.page)) : undefined,
  }),
  staleTime: Number.POSITIVE_INFINITY,
  loader: () => fetchHomeData(),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: HomePage,
})

const PAGE_SIZE = 48

function queryString({ q, type, generation, page }: Required<HomeSearch> & { page: number }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (type) params.set('type', type)
  if (generation) params.set('generation', generation)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

function HomePage() {
  const data = Route.useLoaderData()
  const initialSearch = Route.useSearch()
  const [q, setQ] = useState(initialSearch.q ?? '')
  const [type, setType] = useState(initialSearch.type ?? '')
  const [generation, setGeneration] = useState(initialSearch.generation ?? '')
  const [page, setPage] = useState(initialSearch.page ?? 1)

  // Reflect the filter state in the URL (without a navigation), skipping the
  // initial render so server-provided query params are left untouched.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.history.replaceState(null, '', queryString({ q, type, generation, page }))
  }, [q, type, generation, page])

  const typeEn = useMemo(() => new Map(data.types.map((t) => [t.name, t.en])), [data.types])

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    return data.species.filter((s) => {
      if (needle && !humanize(s.name).toLowerCase().includes(needle)) return false
      if (type && !s.types.includes(type)) return false
      if (generation && s.generation !== generation) return false
      return true
    })
  }, [data.species, q, type, generation])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const hrefFor = (p: number) => queryString({ q, type, generation, page: p })

  return (
    <>
      <h1 className="page-title">Pokémon</h1>
      <div className="controls-grid">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All types</option>
            {data.types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.en}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={generation}
            onChange={(event) => {
              setGeneration(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All generations</option>
            {data.generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.en}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="count-text">{filtered.length} Pokémon</p>
      {pageItems.length === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <ul className="card-grid">
          {pageItems.map((s) => (
            <PokemonCard
              key={s.id}
              id={s.id}
              name={s.name}
              sprite={s.sprite}
              types={s.types.map((t) => ({ name: t, en: typeEn.get(t) ?? humanize(t) }))}
            />
          ))}
        </ul>
      )}
      <p className="pagination">
        {currentPage > 1 ? <a href={hrefFor(currentPage - 1)}>Previous page</a> : null}
        Page {currentPage} of {totalPages}
        {currentPage < totalPages ? <a href={hrefFor(currentPage + 1)}>Next page</a> : null}
      </p>
    </>
  )
}
