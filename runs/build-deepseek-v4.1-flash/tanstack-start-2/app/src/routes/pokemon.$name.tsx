import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { getPokemonPage } from '../lib/data.functions'
import { displayValue, humanize, typeBadgeClass } from '../lib/format'
import { TypeBadge } from '../components/TypeBadge'
import { NotFoundPage } from '../components/NotFound'

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>) => ({
    game: typeof search.game === 'string' && search.game ? search.game : undefined,
  }),
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: ({ params, deps }) => getPokemonPage({ data: { name: params.name, game: deps.game } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: PokemonPage,
})

type SortState = { column: string; direction: 'ascending' | 'descending' }
type MoveRow = {
  level: number | null
  method: string
  moveName: string
  displayName: string
  typeName: string
  typeLabel: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

function PokemonPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: '/pokemon/$name' })

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#moves') {
      requestAnimationFrame(() => document.getElementById('moves')?.scrollIntoView())
    }
  }, [])

  if (!data) return <NotFoundPage />

  return (
    <main>
      <div className="container page">
        <div className="pokemon-hero">
          <div className="hero-art">
            {data.artwork ? <img src={data.artwork} alt={data.englishName} /> : null}
          </div>
          <div className="hero-info">
            <div className="hero-dex">#{String(data.id).padStart(4, '0')}</div>
            <h1>{data.englishName}</h1>
            <div className="hero-genus">{data.genus}</div>
            <div className="hero-types">
              {data.types.map((type) => (
                <TypeBadge key={type.name} name={type.name} label={type.label} />
              ))}
            </div>
            <dl className="hero-measures">
              <div>
                <dt>Height</dt>
                <dd>{(data.height / 10).toFixed(1)} m</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{(data.weight / 10).toFixed(1)} kg</dd>
              </div>
            </dl>
            <p className="hero-flavor">{data.flavor}</p>
          </div>
        </div>

        <section className="panel" aria-labelledby="stats-heading">
          <h2 id="stats-heading">Base stats</h2>
          <table className="stats-table">
            <tbody>
              {data.stats.map((stat: any) => (
                <tr key={stat.name}>
                  <th scope="row">{stat.label}</th>
                  <td className="value">{stat.value}</td>
                  <td className="bar">
                    <div className="stat-track">
                      <div className="stat-fill" style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total</th>
                <td className="value">{data.statTotal}</td>
                <td className="bar">
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: '100%' }} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="panel" aria-labelledby="abilities-heading">
          <h2 id="abilities-heading">Abilities</h2>
          <ul className="plain-list">
            {data.abilities.map((ability: any) => (
              <li key={`${ability.name}-${ability.hidden}`}>
                <Link to="/abilities/$name" params={{ name: ability.name }}>{ability.label}</Link>
                {ability.hidden ? ' (hidden)' : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          {data.evolution ? <EvolutionTree node={data.evolution} /> : <p>—</p>}
        </section>

        <MovesSection data={data} onGameChange={(game) => navigate({ search: (prev) => ({ ...prev, game }) })} />
      </div>
    </main>
  )
}

function EvolutionTree({ node }: { node: { name: string; evolvesTo: Array<any> } }) {
  return (
    <ul className="evolution-tree">
      <EvolutionNode node={node} />
    </ul>
  )
}

function EvolutionNode({ node }: { node: { name: string; evolvesTo: Array<any> } }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>{humanize(node.name)}</Link>
      {node.evolvesTo.length ? (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionNode key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

const COLUMNS = [
  { key: 'level', label: 'Level', levelOnly: true },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
]

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

function methodLabel(method: string) {
  return humanize(method)
}

function sortRows(rows: MoveRow[], sort: SortState | undefined, isLevelUp: boolean) {
  const copy = rows.slice()
  if (!sort) {
    copy.sort((a, b) => {
      if (isLevelUp) {
        const levelDiff = (a.level ?? 0) - (b.level ?? 0)
        if (levelDiff !== 0) return levelDiff
      }
      return a.displayName.localeCompare(b.displayName)
    })
    return copy
  }
  const { column, direction } = sort
  copy.sort((a, b) => {
    const av = a[column as keyof MoveRow]
    const bv = b[column as keyof MoveRow]
    const aMissing = av === null || av === undefined || av === ''
    const bMissing = bv === null || bv === undefined || bv === ''
    if (aMissing && bMissing) return 0
    if (aMissing) return 1
    if (bMissing) return -1
    let comparison = 0
    if (typeof av === 'number' && typeof bv === 'number') comparison = av - bv
    else comparison = String(av).localeCompare(String(bv))
    return direction === 'ascending' ? comparison : -comparison
  })
  return copy
}

function MovesSection({
  data,
  onGameChange,
}: {
  data: any
  onGameChange: (game: string) => void
}) {
  const [sorts, setSorts] = useState<Record<string, SortState>>({})

  const grouped = useMemo(() => {
    const map = new Map<string, MoveRow[]>()
    for (const row of data.moveRows as MoveRow[]) {
      const current = map.get(row.method) ?? []
      current.push(row)
      map.set(row.method, current)
    }
    const methods = [...map.keys()]
    methods.sort((a, b) => {
      const ai = METHOD_ORDER.indexOf(a)
      const bi = METHOD_ORDER.indexOf(b)
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      }
      return methodLabel(a).localeCompare(methodLabel(b))
    })
    return methods.map((method) => ({
      method,
      label: methodLabel(method),
      rows: map.get(method) ?? [],
    }))
  }, [data.moveRows])

  const setSort = (method: string, column: string) => {
    setSorts((prev) => {
      const current = prev[method]
      const direction =
        current?.column === column
          ? current.direction === 'ascending'
            ? 'descending'
            : 'ascending'
          : 'ascending'
      return { ...prev, [method]: { column, direction } }
    })
  }

  return (
    <section id="moves" className="panel moves-section" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div className="moves-controls">
        <div className="field">
          <label htmlFor="game-select">Game</label>
          <select
            id="game-select"
            className="select"
            value={data.selectedGame}
            onChange={(event) => onGameChange(event.target.value)}
          >
            {data.gameOptions.map((game: any) => (
              <option key={game.name} value={game.name}>{game.label}</option>
            ))}
          </select>
        </div>
      </div>

      {grouped.map((group) => {
        const isLevelUp = group.method === 'level-up'
        const columns = COLUMNS.filter((column) => !column.levelOnly || isLevelUp)
        const sort = sorts[group.method]
        const rows = sortRows(group.rows, sort, isLevelUp)
        return (
          <table key={group.method} className="move-table">
            <caption>{group.label}</caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    aria-sort={sort?.column === column.key ? sort.direction : undefined}
                  >
                    <button type="button" onClick={() => setSort(group.method, column.key)}>
                      {column.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${group.method}-${row.moveName}-${index}`}>
                  {isLevelUp ? <td>{displayValue(row.level)}</td> : null}
                  <td>
                    <Link to="/moves/$name" params={{ name: row.moveName }}>{row.displayName}</Link>
                  </td>
                  <td>
                    {row.typeName ? (
                      <Link to="/types/$name" params={{ name: row.typeName }} className={typeBadgeClass(row.typeName)}>
                        {row.typeLabel}
                      </Link>
                    ) : '—'}
                  </td>
                  <td>{row.category || '—'}</td>
                  <td>{displayValue(row.power)}</td>
                  <td>{displayValue(row.accuracy)}</td>
                  <td>{displayValue(row.pp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      })}
    </section>
  )
}
