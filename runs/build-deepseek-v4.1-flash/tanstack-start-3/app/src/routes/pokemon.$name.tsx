import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  NotFoundPage,
  Section,
  TypeBadge,
  dexNumber,
} from '../components/PokedexUi'
import { getPokemonPage } from '../server/pokedex'

type PokemonSearch = { game?: string }

type MoveRow = {
  game: string
  move: string
  method: string
  level: number
  label: string
  typeName: string
  typeLabel: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
type SortDirection = 'ascending' | 'descending'

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): PokemonSearch => ({
    game: typeof search.game === 'string' && search.game.length > 0 ? search.game : undefined,
  }),
  loader: ({ params }) => getPokemonPage({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: PokemonPage,
})

const STAT_MAX = 255

function PokemonPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()

  if (!data) return <NotFoundPage />

  const pokemonName = data.name
  const selectedGame =
    search.game && data.moveGames.some((game: { name: string }) => game.name === search.game)
      ? search.game
      : data.defaultGame

  const methodGroups = useMemo(() => {
    if (!selectedGame) return []
    const seen = new Set<string>()
    const groups = new Map<string, MoveRow[]>()
    for (const entry of data.moveEntries as Array<{
      game: string
      move: string
      method: string
      level: number
    }>) {
      if (entry.game !== selectedGame) continue
      const detail = data.moveDetails[entry.move]
      if (!detail) continue
      const key = `${entry.method}:${entry.move}`
      if (seen.has(key)) continue
      seen.add(key)
      const rows = groups.get(entry.method) ?? []
      rows.push({
        game: entry.game,
        move: entry.move,
        method: entry.method,
        level: entry.level,
        label: detail.label,
        typeName: detail.typeName,
        typeLabel: detail.typeLabel,
        category: detail.category,
        power: detail.power,
        accuracy: detail.accuracy,
        pp: detail.pp,
      })
      groups.set(entry.method, rows)
    }

    const priority: Record<string, number> = {
      'level-up': 0,
      machine: 1,
      egg: 2,
      tutor: 3,
    }
    return [...groups.entries()]
      .map(([method, rows]) => ({
        method,
        label: method
          .split('-')
          .filter(Boolean)
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(' '),
        rows,
      }))
      .sort((a, b) => {
        const aPriority = priority[a.method] ?? 99
        const bPriority = priority[b.method] ?? 99
        return aPriority - bPriority || a.label.localeCompare(b.label)
      })
  }, [data, selectedGame])

  function onGameChange(game: string) {
    navigate({
      to: '/pokemon/$name',
      params: { name: pokemonName },
      search: { game },
    })
  }

  return (
    <>
      <div className="pokemon-summary">
        <div className="artwork-wrap">
          <img className="artwork" src={data.artwork} alt={data.englishName} width="288" height="288" />
        </div>
        <div className="summary-body">
          <p className="dex-number summary-dex">{dexNumber(data.id)}</p>
          <h1>{data.englishName}</h1>
          <p className="genus">{data.genus}</p>
          <div className="type-list">
            {data.types.map((type: { name: string; label: string }) => (
              <TypeBadge key={type.name} name={type.name} label={type.label} />
            ))}
          </div>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{data.height.toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight.toFixed(1)} kg</dd>
            </div>
          </dl>
          <p className="flavor-text">{data.flavor}</p>
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {data.stats.map((stat: { name: string; label: string; value: number }) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td className="stat-cell">
                  <span className="stat-line">
                    <span className="stat-number">{stat.value}</span>
                    <span className="stat-track" aria-hidden="true">
                      <span
                        className="stat-bar"
                        style={{ width: `${Math.min(100, (stat.value / STAT_MAX) * 100)}%` }}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <th scope="row">Total</th>
              <td className="stat-cell">
                <span className="stat-line">
                  <span className="stat-number">{data.total}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list abilities-list">
          {data.abilities.map((ability: { name: string; label: string; hidden: boolean }) => (
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
        <EvolutionList nodes={[data.evolution as EvolutionNode]} />
      </Section>

      <Section id="moves" title="Moves" className="moves-section">
        <div className="moves-control">
          <label htmlFor="game-select">Game</label>
          <select
            id="game-select"
            value={selectedGame ?? ''}
            onChange={(event) => onGameChange(event.target.value)}
          >
            {data.moveGames.map((game: { name: string; label: string }) => (
              <option key={game.name} value={game.name}>
                {game.label}
              </option>
            ))}
          </select>
        </div>

        {methodGroups.map((group) => (
          <MoveTable
            key={`${selectedGame}-${group.method}`}
            method={group.method}
            label={group.label}
            rows={group.rows}
          />
        ))}
      </Section>
    </>
  )
}

type EvolutionNode = { name: string; label: string; children: EvolutionNode[] }

function EvolutionList({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <ul className="plain-list evolution-list">
      {nodes.map((node) => (
        <li key={node.name}>
          <Link to="/pokemon/$name" params={{ name: node.name }}>
            {node.label}
          </Link>
          {node.children.length > 0 ? <EvolutionList nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  )
}

function MoveTable({
  method,
  label,
  rows,
}: {
  method: string
  label: string
  rows: MoveRow[]
}) {
  const isLevelUp = method === 'level-up'
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null)

  const columns: Array<{ key: SortKey; label: string }> = [
    ...(isLevelUp ? [{ key: 'level' as SortKey, label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]

  const sortedRows = useMemo(() => {
    const copy = rows.slice()
    if (!sort) {
      copy.sort((a, b) => {
        if (isLevelUp && a.level !== b.level) return a.level - b.level
        return a.label.localeCompare(b.label)
      })
      return copy
    }

    const valueFor = (row: MoveRow): string | number | null => {
      switch (sort.key) {
        case 'level':
          return row.level
        case 'move':
          return row.label
        case 'type':
          return row.typeLabel
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

    copy.sort((a, b) => {
      const aValue = valueFor(a)
      const bValue = valueFor(b)
      const aMissing = aValue === null || aValue === ''
      const bMissing = bValue === null || bValue === ''
      if (aMissing && bMissing) return a.label.localeCompare(b.label)
      if (aMissing) return 1
      if (bMissing) return -1
      let comparison =
        typeof aValue === 'number' && typeof bValue === 'number'
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue))
      if (sort.direction === 'descending') comparison *= -1
      return comparison || a.label.localeCompare(b.label)
    })
    return copy
  }, [rows, sort, isLevelUp])

  function toggleSort(key: SortKey) {
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

  return (
    <div className="move-table-block">
      <table className="moves-table">
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort?.key === column.key ? sort.direction : undefined}
              >
                <button type="button" className="sort-button" onClick={() => toggleSort(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={`${row.method}-${row.move}-${row.level}`}>
              {isLevelUp ? <td>{row.level}</td> : null}
              <td>
                <Link to="/moves/$name" params={{ name: row.move }}>
                  {row.label}
                </Link>
              </td>
              <td>
                <TypeBadge name={row.typeName} label={row.typeLabel} small />
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
  )
}

