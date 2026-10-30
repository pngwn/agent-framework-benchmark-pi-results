import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { displayOrDash } from '../lib/format'
import type { FilterOption, MoveRow, MoveTableData } from '../lib/model'

type SortKey = 'level' | 'moveLabel' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp'
type SortDirection = 'ascending' | 'descending'

interface Column {
  key: SortKey
  label: string
}

const BASE_COLUMNS: Column[] = [
  { key: 'moveLabel', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
]

const NUMERIC_KEYS = new Set<SortKey>(['level', 'power', 'accuracy', 'pp'])

function isMissing(value: unknown) {
  return value === null || value === undefined || value === ''
}

function compareRows(a: MoveRow, b: MoveRow, key: SortKey, direction: SortDirection) {
  const aValue = a[key as keyof MoveRow]
  const bValue = b[key as keyof MoveRow]
  const aMissing = isMissing(aValue)
  const bMissing = isMissing(bValue)
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1

  let result = 0
  if (NUMERIC_KEYS.has(key)) {
    result = Number(aValue) - Number(bValue)
  } else {
    result = String(aValue).localeCompare(String(bValue))
  }
  return direction === 'ascending' ? result : -result
}

function MovesTable({ table }: { table: MoveTableData }) {
  const columns = table.method === 'level-up' ? [{ key: 'level' as const, label: 'Level' }, ...BASE_COLUMNS] : BASE_COLUMNS
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>(
    table.method === 'level-up'
      ? { key: 'level', direction: 'ascending' }
      : { key: 'moveLabel', direction: 'ascending' },
  )

  const rows = useMemo(
    () => [...table.rows].sort((a, b) => compareRows(a, b, sort.key, sort.direction)),
    [table.rows, sort],
  )

  const toggle = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === 'ascending' ? 'descending' : 'ascending',
          }
        : { key, direction: 'ascending' },
    )
  }

  return (
    <div className="moves-table-wrap">
      <table className="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  sort.key === column.key
                    ? sort.direction === 'ascending'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <button type="button" className="sort-button" onClick={() => toggle(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.moveName}-${row.level}`}>
              {table.method === 'level-up' && <td>{displayOrDash(row.level)}</td>}
              <td>
                <Link to="/moves/$name" params={{ name: row.moveName }}>
                  {row.moveLabel}
                </Link>
              </td>
              <td>
                <Link
                  to="/types/$name"
                  params={{ name: row.typeName }}
                  className={`type-badge type-${row.typeName}`}
                >
                  {row.typeLabel}
                </Link>
              </td>
              <td>{row.category || '—'}</td>
              <td>{displayOrDash(row.power)}</td>
              <td>{displayOrDash(row.accuracy)}</td>
              <td>{displayOrDash(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MovesSection({
  games,
  selectedGame,
  moveTables,
  onGameChange,
}: {
  games: FilterOption[]
  selectedGame: string
  moveTables: MoveTableData[]
  onGameChange: (game: string) => void
}) {
  return (
    <section id="moves" aria-labelledby="moves-heading" className="panel">
      <h2 id="moves-heading">Moves</h2>
      <div className="game-control">
        <label htmlFor="game-select">Game</label>
        <select
          id="game-select"
          value={selectedGame}
          onChange={(event) => onGameChange(event.target.value)}
        >
          {games.map((game) => (
            <option key={game.name} value={game.name}>
              {game.label}
            </option>
          ))}
        </select>
      </div>
      {moveTables.map((table) => (
        <MovesTable key={`${selectedGame}-${table.method}`} table={table} />
      ))}
    </section>
  )
}
