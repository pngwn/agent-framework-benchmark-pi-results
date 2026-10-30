import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { display } from '../lib/format'
import type { LearnTable } from '../lib/types'
import { TypeBadge } from './TypeBadge'

type Row = LearnTable['rows'][number]
type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'
type Direction = 'ascending' | 'descending'

const COLUMNS: Array<{ key: Column; label: string }> = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
]

function value(row: Row, column: Column): string | number | null {
  switch (column) {
    case 'level':
      return row.level
    case 'move':
      return row.details.label
    case 'type':
      return row.details.type?.label ?? null
    case 'category':
      return row.details.category
    default:
      return row.details[column]
  }
}

function compareValues(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
}

export function MoveTable({ table }: { table: LearnTable }) {
  const isLevelUp = table.method === 'level-up'
  const columns = isLevelUp ? COLUMNS : COLUMNS.slice(1)
  const [sort, setSort] = useState<{ column: Column; direction: Direction } | null>(null)

  const rows = useMemo(() => {
    // Default order: level then name for Level Up, name for everything else.
    const base = [...table.rows].sort(
      (a, b) => (isLevelUp ? a.level - b.level : 0) || a.details.label.localeCompare(b.details.label),
    )
    if (!sort) return base
    const sign = sort.direction === 'ascending' ? 1 : -1
    return base
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const va = value(a.row, sort.column)
        const vb = value(b.row, sort.column)
        // Missing values go last in both directions.
        if (va === null || vb === null) return va === vb ? a.index - b.index : va === null ? 1 : -1
        return sign * compareValues(va, vb) || a.index - b.index
      })
      .map(({ row }) => row)
  }, [table.rows, isLevelUp, sort])

  const toggle = (column: Column) =>
    setSort((prev) =>
      prev?.column === column
        ? { column, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' }
        : { column, direction: 'ascending' },
    )

  return (
    <div className="table-scroll">
      <table className="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map(({ key, label }) => {
              const active = sort?.column === key ? sort.direction : undefined
              return (
                <th key={key} scope="col" aria-sort={active ?? 'none'}>
                  <button type="button" className="sort-button" onClick={() => toggle(key)}>
                    {label}
                    <span aria-hidden="true" className="sort-indicator">
                      {active === 'ascending' ? '▲' : active === 'descending' ? '▼' : ''}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.move}-${row.level}`}>
              {isLevelUp && <td>{row.level}</td>}
              <td>
                <Link to="/moves/$name" params={{ name: row.move }}>
                  {row.details.label}
                </Link>
              </td>
              <td>{row.details.type ? <TypeBadge type={row.details.type} /> : display(null)}</td>
              <td>{display(row.details.category)}</td>
              <td>{display(row.details.power)}</td>
              <td>{display(row.details.accuracy)}</td>
              <td>{display(row.details.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
