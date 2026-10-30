import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { MoveRow, MoveTableData } from '../lib/data.server'
import { TypeBadge } from './PokemonCard'

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
type SortDirection = 'ascending' | 'descending'

function valueFor(row: MoveRow, key: SortKey): string | number | null {
  switch (key) {
    case 'level':
      return row.level
    case 'move':
      return row.moveLabel
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

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

const COLUMNS: Array<{ key: SortKey; label: string; numeric: boolean }> = [
  { key: 'level', label: 'Level', numeric: true },
  { key: 'move', label: 'Move', numeric: false },
  { key: 'type', label: 'Type', numeric: false },
  { key: 'category', label: 'Category', numeric: false },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
]

export function MoveTable({ table }: { table: MoveTableData }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null)
  const columns = COLUMNS.filter((column) => column.key !== 'level' || table.hasLevel)

  const rows = useMemo(() => {
    if (!sort) return table.rows
    return [...table.rows].sort((a, b) => {
      // Missing values always sort last, in both directions.
      const aValue = valueFor(a, sort.key)
      const bValue = valueFor(b, sort.key)
      if (aValue === null && bValue === null) return 0
      if (aValue === null) return 1
      if (bValue === null) return -1
      const result = compareValues(aValue, bValue)
      return sort.direction === 'ascending' ? result : -result
    })
  }, [sort, table.rows])

  const click = (key: SortKey) => {
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
    <div className="move-table-wrap">
      <table className="move-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort?.key === column.key ? sort.direction : undefined}
                className={`col-${column.key}${column.numeric ? ' numeric' : ''}`}
              >
                <button type="button" onClick={() => click(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {table.hasLevel ? (
                <td className="col-level numeric">{row.level ?? '—'}</td>
              ) : null}
              <td className="col-move">
                <Link to="/moves/$name" params={{ name: row.moveName }}>
                  {row.moveLabel}
                </Link>
              </td>
              <td className="col-type">
                <Link to="/types/$name" params={{ name: row.typeName }} className="type-link">
                  <TypeBadge name={row.typeName} label={row.typeLabel} />
                </Link>
              </td>
              <td className="col-category">{row.category}</td>
              <td className="col-power numeric">{row.power ?? '—'}</td>
              <td className="col-accuracy numeric">{row.accuracy ?? '—'}</td>
              <td className="col-pp numeric">{row.pp ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
