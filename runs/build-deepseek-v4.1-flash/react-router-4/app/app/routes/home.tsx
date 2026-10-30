import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getPokedexIndex } from '../lib/api.server'

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const params = url.searchParams
  const q = params.get('q') ?? ''
  const index = await getPokedexIndex()

  let type = params.get('type') ?? ''
  if (!index.types.some((entry) => entry.name === type)) type = ''
  let generation = params.get('generation') ?? ''
  if (!index.generations.some((entry) => entry.name === generation)) generation = ''

  const query = q.trim().toLowerCase()
  let matching = index.species
  if (query) matching = matching.filter((entry) => entry.humanized.toLowerCase().includes(query))
  if (type) matching = matching.filter((entry) => entry.types.includes(type))
  if (generation) matching = matching.filter((entry) => entry.generation === generation)

  const pageSize = 48
  const count = matching.length
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const requestedPage = Number.parseInt(params.get('page') ?? '1', 10)
  let page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  if (page > totalPages) page = totalPages

  return {
    q,
    type,
    generation,
    page,
    count,
    totalPages,
    results: matching.slice((page - 1) * pageSize, page * pageSize),
    types: index.types,
    generations: index.generations,
  }
}

export function meta() {
  return [{ title: 'Pokédex' }]
}

export default function PokemonList({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { q, type, generation, page, count, totalPages, results, types, generations } = loaderData
  const navigate = useNavigate()
  const [search, setSearch] = useState(q)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearch(q)
  }, [q])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  function searchParams(next: { q?: string; type?: string; generation?: string; page?: number }) {
    const params = new URLSearchParams()
    const nextQuery = next.q ?? search
    if (nextQuery.trim()) params.set('q', nextQuery)
    const nextType = next.type ?? type
    if (nextType) params.set('type', nextType)
    const nextGeneration = next.generation ?? generation
    if (nextGeneration) params.set('generation', nextGeneration)
    const nextPage = next.page ?? 1
    if (nextPage > 1) params.set('page', String(nextPage))
    return params
  }

  function handleSearch(value: string) {
    setSearch(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const params = searchParams({ q: value, page: 1 })
      const search = params.toString()
      navigate(search ? `/?${search}` : '/', { replace: true, preventScrollReset: true })
    }, 180)
  }

  function handleType(value: string) {
    const params = searchParams({ type: value, page: 1 })
    const search = params.toString()
    navigate(search ? `/?${search}` : '/', { preventScrollReset: true })
  }

  function handleGeneration(value: string) {
    const params = searchParams({ generation: value, page: 1 })
    const search = params.toString()
    navigate(search ? `/?${search}` : '/', { preventScrollReset: true })
  }

  function pageLink(target: number) {
    const params = searchParams({ page: target })
    const search = params.toString()
    return search ? `/?${search}` : '/'
  }

  return (
    <>
      <h1>Pokémon</h1>
      <div className="filters">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select id="type-filter" value={type} onChange={(event) => handleType(event.target.value)}>
            <option value="">All types</option>
            {types.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={generation}
            onChange={(event) => handleGeneration(event.target.value)}
          >
            <option value="">All generations</option>
            {generations.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="search-count">{count} Pokémon</p>

      {results.length ? (
        <ul className="card-grid">
          {results.map((entry) => (
            <li className="pokemon-card" key={entry.id}>
              <Link to={`/pokemon/${entry.name}`}>
                <img src={entry.spriteUrl} alt="" width={96} height={96} loading="lazy" />
                <span className="card-dex">#{String(entry.id).padStart(4, '0')}</span>
                <span className="card-name">{entry.humanized}</span>
                <span className="card-types">
                  {entry.types.map((typeName) => (
                    <span
                      key={typeName}
                      className="type-badge"
                      style={{ backgroundColor: `var(--type-${typeName}, #555e6b)` }}
                    >
                      {humanizeType(typeName)}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-text">No Pokémon found</p>
      )}

      {count > 0 ? (
        <div className="pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          {page > 1 ? <Link to={pageLink(page - 1)}>Previous page</Link> : null}
          {page < totalPages ? <Link to={pageLink(page + 1)}>Next page</Link> : null}
        </div>
      ) : null}
    </>
  )
}

function humanizeType(name: string) {
  return name
    .split('-')
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}
