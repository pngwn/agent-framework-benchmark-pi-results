import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { fetchPokemonPage } from '../server/fns'
import { Section, TypeBadgeLink } from '../components/shared'

type PokemonSearch = { game?: string }

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): PokemonSearch => ({
    game: typeof search.game === 'string' && search.game ? search.game : undefined,
  }),
  loaderDeps: ({ search: { game } }) => ({ game: game ?? '' }),
  loader: async ({ params, deps }) => {
    const data = await fetchPokemonPage({ data: { name: params.name, game: deps.game || undefined } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: PokemonPage,
})

function PokemonPage() {
  const data = Route.useLoaderData()
  const { game } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <>
      <div className="pokemon-summary">
        {data.artwork && <img className="artwork" src={data.artwork} alt={data.englishName} />}
        <div className="pokemon-summary-info">
          <p className="dex">{data.dex}</p>
          <h1>{data.englishName}</h1>
          {data.genus && <p className="genus">{data.genus}</p>}
          <p className="badges">
            {data.types.map((t: any) => (
              <TypeBadgeLink key={t.name} type={t} />
            ))}
          </p>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{data.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight}</dd>
            </div>
          </dl>
          {data.flavor && <p className="flavor">{data.flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {data.stats.map((s: any) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="stat-value">{s.value}</td>
                <td className="stat-bar-cell" aria-hidden="true">
                  <span className="stat-track">
                    <span className="stat-bar" style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{data.total}</td>
              <td className="stat-bar-cell" aria-hidden="true">
                <span className="stat-track">
                  <span className="stat-bar" style={{ width: `${Math.min(100, (data.total / 600) * 100)}%` }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {data.abilities.map((a: any) => (
            <li key={a.name}>
              <Link to="/abilities/$name" params={{ name: a.name }}>{a.label}</Link>
              {a.hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {data.evolution && <EvolutionList node={data.evolution} />}
      </Section>

      <section className="section" aria-labelledby="moves-heading" id="moves">
        <h2 id="moves-heading">Moves</h2>
        {data.games.length > 0 && (
          <div className="field game-field">
            <label htmlFor="game">Game</label>
            <select
              id="game"
              value={data.selectedGame}
              onChange={(e) =>
                navigate({
                  search: { game: e.target.value === data.defaultGame ? undefined : e.target.value },
                  replace: true,
                })
              }
            >
              {data.games.map((g: any) => (
                <option key={g.name} value={g.name}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {data.tables.map((table: any) => (
          <MovesTable key={table.method} table={table} />
        ))}
      </section>
    </>
  )
}

function EvolutionList({ node }: { node: any }) {
  return (
    <ul className="evo-list">
      <li>
        <Link to="/pokemon/$name" params={{ name: node.name }}>
          {node.name
            .split('-')
            .map((w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w))
            .join(' ')}
        </Link>
        {node.evolvesTo.length > 0 && (
          <ul>
            {node.evolvesTo.map((child: any) => (
              <EvolutionList key={child.id} node={child} />
            ))}
          </ul>
        )}
      </li>
    </ul>
  )
}

type SortState = { key: string; dir: 'ascending' | 'descending' } | null

function compareValues(a: any, b: any, dir: 'ascending' | 'descending'): number {
  const aMissing = a === null || a === undefined
  const bMissing = b === null || b === undefined
  if (aMissing && bMissing) return 0
  if (aMissing) return 1 // missing values sort last in both directions
  if (bMissing) return -1
  const c =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  return dir === 'ascending' ? c : -c
}

function MovesTable({ table }: { table: any }) {
  const [sort, setSort] = useState<SortState>(null)

  const columns = useMemo(
    () => [
      ...(table.hasLevel ? [{ key: 'level', label: 'Level' }] : []),
      { key: 'move', label: 'Move' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'power', label: 'Power' },
      { key: 'accuracy', label: 'Accuracy' },
      { key: 'pp', label: 'PP' },
    ],
    [table.hasLevel],
  )

  const rows = useMemo(() => {
    if (!sort) return table.rows
    const value = (r: any) => {
      switch (sort.key) {
        case 'level':
          return r.level
        case 'move':
          return r.moveEnglish
        case 'type':
          return r.typeEnglish
        case 'category':
          return r.category
        default:
          return r[sort.key]
      }
    }
    return [...table.rows].sort((a, b) => compareValues(value(a), value(b), sort.dir))
  }, [table.rows, sort])

  return (
    <table className="moves-table">
      <caption>{table.label}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} aria-sort={sort?.key === c.key ? sort.dir : undefined}>
              <button
                type="button"
                onClick={() =>
                  setSort((s) =>
                    s?.key === c.key && s.dir === 'ascending'
                      ? { key: c.key, dir: 'descending' }
                      : { key: c.key, dir: 'ascending' },
                  )
                }
              >
                {c.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any, i: number) => (
          <tr key={`${r.moveName}-${i}`}>
            {table.hasLevel && <td>{r.level}</td>}
            <td>
              <Link to="/moves/$name" params={{ name: r.moveName }}>
                {r.moveEnglish}
              </Link>
            </td>
            <td>
              <TypeBadgeLink type={{ name: r.typeName, englishName: r.typeEnglish }} />
            </td>
            <td>{r.category}</td>
            <td>{r.power ?? '—'}</td>
            <td>{r.accuracy ?? '—'}</td>
            <td>{r.pp ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
