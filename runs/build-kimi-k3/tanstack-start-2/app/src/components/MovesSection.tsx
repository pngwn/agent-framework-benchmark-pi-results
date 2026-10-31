import { useMemo, useState } from 'react'
import { valueOrDash } from '../lib/format'
import { TypeBadge } from './TypeBadge'

export type MoveRow = {
  level: number
  name: string
  apiName: string
  typeName: string
  typeEn: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

export type MoveMethod = { name: string; label: string; rows: MoveRow[] }
export type GameOption = { name: string; label: string }

type SortState = { key: string; dir: 'asc' | 'desc' } | null

type Column = {
  key: keyof MoveRow | 'level'
  label: string
  numeric: boolean
}

function compareValues(
  a: string | number | null,
  b: string | number | null,
  numeric: boolean,
  dir: 'asc' | 'desc',
) {
  const aMissing = a === null || a === undefined || a === ''
  const bMissing = b === null || b === undefined || b === ''
  // Missing values sort last in both directions.
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  const result = numeric ? (a as number) - (b as number) : String(a).localeCompare(String(b))
  return dir === 'asc' ? result : -result
}

function MovesTable({ method }: { method: MoveMethod }) {
  const [sort, setSort] = useState<SortState>(null)

  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = []
    if (method.name === 'level-up') cols.push({ key: 'level', label: 'Level', numeric: true })
    cols.push(
      { key: 'name', label: 'Move', numeric: false },
      { key: 'typeEn', label: 'Type', numeric: false },
      { key: 'category', label: 'Category', numeric: false },
      { key: 'power', label: 'Power', numeric: true },
      { key: 'accuracy', label: 'Accuracy', numeric: true },
      { key: 'pp', label: 'PP', numeric: true },
    )
    return cols
  }, [method.name])

  const rows = useMemo(() => {
    const sorted = [...method.rows]
    if (sort) {
      const column = columns.find((c) => c.key === sort.key)
      if (column) {
        sorted.sort((a, b) =>
          compareValues(
            a[column.key as keyof MoveRow] as string | number | null,
            b[column.key as keyof MoveRow] as string | number | null,
            column.numeric,
            sort.dir,
          ),
        )
      }
    } else if (method.name === 'level-up') {
      sorted.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [method.rows, method.name, sort, columns])

  const handleSort = (column: Column) => {
    setSort((current) => {
      if (current?.key === column.key) {
        return { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key: column.key, dir: 'asc' }
    })
  }

  return (
    <table className="moves-table">
      <caption>{method.label}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              aria-sort={
                sort?.key === column.key
                  ? sort.dir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : undefined
              }
            >
              <button type="button" onClick={() => handleSort(column)}>
                {column.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.apiName}-${row.level}-${index}`}>
            {method.name === 'level-up' ? <td>{row.level}</td> : null}
            <td>
              <a href={`/moves/${row.apiName}`}>{row.name}</a>
            </td>
            <td>
              <TypeBadge name={row.typeName} label={row.typeEn} link />
            </td>
            <td>{row.category}</td>
            <td>{valueOrDash(row.power)}</td>
            <td>{valueOrDash(row.accuracy)}</td>
            <td>{valueOrDash(row.pp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MovesSection({
  speciesName,
  games,
  selectedGame,
  methods,
}: {
  speciesName: string
  games: GameOption[]
  selectedGame: string | undefined
  methods: MoveMethod[]
}) {
  const [pendingGame, setPendingGame] = useState<string | null>(null)
  const visibleGame = pendingGame ?? selectedGame

  const handleGameChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const game = event.target.value
    setPendingGame(game)
    const params = new URLSearchParams()
    params.set('game', game)
    window.location.assign(`/pokemon/${speciesName}?${params.toString()}`)
  }

  return (
    <section className="section-card" id="moves" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div className="game-field">
        <label htmlFor="game-select">Game</label>
        <select id="game-select" value={visibleGame ?? ''} onChange={handleGameChange}>
          {games.map((game) => (
            <option key={game.name} value={game.name}>
              {game.label}
            </option>
          ))}
        </select>
      </div>
      {methods.map((method) => (
        <MovesTable key={method.name} method={method} />
      ))}
    </section>
  )
}
