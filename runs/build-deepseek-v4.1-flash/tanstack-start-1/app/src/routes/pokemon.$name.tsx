import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { NotFoundPage } from '~/components/NotFoundPage'
import { Section } from '~/components/Section'
import { TypeLink } from '~/components/TypeBadge'
import type { EvolutionNode, MoveRow, MoveTable, PokemonSearch } from '~/lib/types'
import { loadPokemon } from '~/server/functions'

function validateSearch(raw: Record<string, unknown>): PokemonSearch {
  return {
    game: typeof raw.game === 'string' && raw.game ? raw.game : undefined,
  }
}

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch,
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: ({ params, deps }) => loadPokemon({ data: { name: params.name, game: deps.game } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData && !loaderData.found
            ? 'Not found – Pokédex'
            : `${loaderData?.englishName ?? ''} – Pokédex`,
      },
    ],
  }),
  component: PokemonPage,
})

function EvolutionBranch({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {node.label}
      </Link>
      {node.children.length ? (
        <ul>
          {node.children.map((child) => (
            <EvolutionBranch key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
type SortState = { key: SortKey; direction: 'ascending' | 'descending' } | null

function sortRows(rows: MoveRow[], sort: SortState): MoveRow[] {
  if (!sort) return rows
  const valueFor = (row: MoveRow, key: SortKey): string | number | null => {
    switch (key) {
      case 'level':
        return row.level
      case 'move':
        return row.moveLabel
      case 'type':
        return row.type.label
      case 'category':
        return row.category
      case 'power':
        return row.power
      case 'accuracy':
        return row.accuracy
      case 'pp':
        return row.pp
    }
  }

  return [...rows].sort((a, b) => {
    const aValue = valueFor(a, sort.key)
    const bValue = valueFor(b, sort.key)
    const aMissing = aValue === null || aValue === undefined || aValue === ''
    const bMissing = bValue === null || bValue === undefined || bValue === ''
    if (aMissing && bMissing) return a.moveLabel.localeCompare(b.moveLabel)
    if (aMissing) return 1
    if (bMissing) return -1

    const comparison =
      typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue))
    if (comparison !== 0) return sort.direction === 'ascending' ? comparison : -comparison
    return a.moveLabel.localeCompare(b.moveLabel)
  })
}

function MoveTableBlock({ table }: { table: MoveTable }) {
  const [sort, setSort] = useState<SortState>(null)
  const hasLevel = table.method === 'level-up'
  const rows = useMemo(() => sortRows(table.rows, sort), [table.rows, sort])

  const toggle = (key: SortKey) => {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'ascending' ? 'descending' : 'ascending',
        }
      }
      return { key, direction: 'ascending' }
    })
  }

  const header = (key: SortKey, label: string) => (
    <th
      scope="col"
      aria-sort={sort?.key === key ? sort.direction : undefined}
      className="sortable-header"
    >
      <button type="button" onClick={() => toggle(key)}>
        {label}
      </button>
    </th>
  )

  return (
    <div className="move-table-block">
      <div className="table-scroll">
        <table className="moves-table">
          <caption>{table.label}</caption>
          <thead>
            <tr>
              {hasLevel ? header('level', 'Level') : null}
              {header('move', 'Move')}
              {header('type', 'Type')}
              {header('category', 'Category')}
              {header('power', 'Power')}
              {header('accuracy', 'Accuracy')}
              {header('pp', 'PP')}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.moveName}-${row.level ?? 'x'}-${index}`}>
                {hasLevel ? <td>{row.level ?? '—'}</td> : null}
                <td>
                  <Link to="/moves/$name" params={{ name: row.moveName }}>
                    {row.moveLabel}
                  </Link>
                </td>
                <td>
                  <TypeLink type={row.type} />
                </td>
                <td>{row.category}</td>
                <td>{row.power ?? '—'}</td>
                <td>{row.accuracy ?? '—'}</td>
                <td>{row.pp ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PokemonPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  if (!data.found) return <NotFoundPage />

  return (
    <>
      <article className="pokemon-summary">
        <div className="artwork-wrap">
          {data.artwork ? (
            <img className="pokemon-artwork" src={data.artwork} alt={data.englishName} />
          ) : null}
        </div>
        <div className="summary-body">
          <p className="dex-number">{data.dexNumber}</p>
          <h1>{data.englishName}</h1>
          <p className="genus">{data.genus}</p>
          <div className="type-list">
            {data.types.map((type) => (
              <TypeLink key={type.name} type={type} />
            ))}
          </div>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{data.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight}</dd>
            </div>
          </dl>
          <p className="flavor-text">{data.flavorText}</p>
        </div>
      </article>

      <Section id="stats" title="Base stats">
        <div className="table-scroll">
          <table className="stats-table">
            <tbody>
              {data.stats.map((stat) => (
                <tr key={stat.label}>
                  <th scope="row">{stat.label}</th>
                  <td className="stat-value">{stat.value}</td>
                  <td className="stat-bar-cell">
                    <span className="stat-track">
                      <span
                        className="stat-bar"
                        style={{ width: `${Math.min(100, (stat.value / 160) * 100)}%` }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total</th>
                <td className="stat-value">{data.statsTotal}</td>
                <td className="stat-bar-cell">
                  <span className="stat-track">
                    <span
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (data.statsTotal / 960) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {data.abilities.map((ability) => (
            <li key={ability.name}>
              <Link to="/abilities/$name" params={{ name: ability.name }}>
                {ability.label}
              </Link>
              {ability.hidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul className="evolution-list">
          <EvolutionBranch node={data.evolution} />
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        {data.games.length ? (
          <div className="game-picker">
            <label htmlFor="game-select">Game</label>
            <select
              id="game-select"
              value={data.selectedGame ?? ''}
              onChange={(event) =>
                navigate({
                  to: '/pokemon/$name',
                  params: { name: data.name },
                  search: { game: event.target.value },
                })
              }
            >
              {data.games.map((game) => (
                <option key={game.name} value={game.name}>
                  {game.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {data.moveTables.map((table) => (
          <MoveTableBlock key={table.method} table={table} />
        ))}
      </Section>
    </>
  )
}
