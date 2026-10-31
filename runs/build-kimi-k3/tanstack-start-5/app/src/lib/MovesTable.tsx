// Moves tables with client-side sortable column headers.

import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { MoveRow } from './data'
import { MISSING } from './format'
import { TypeBadgeLink } from './components'

type ColumnKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp'

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
]

function columnValue(row: MoveRow, key: ColumnKey): number | string | null {
  switch (key) {
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

export function MovesTable({
  label,
  hasLevel,
  rows,
}: {
  label: string
  hasLevel: boolean
  rows: MoveRow[]
}) {
  const [sort, setSort] = useState<{ key: ColumnKey; dir: 'asc' | 'desc' } | null>(null)

  const columns = COLUMNS.filter((c) => hasLevel || c.key !== 'level')

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = columnValue(a, sort.key)
      const bv = columnValue(b, sort.key)
      // Missing values sort last in both directions.
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      return dir * cmp
    })
  }, [rows, sort])

  const toggleSort = (key: ColumnKey) => {
    setSort((prev) =>
      prev?.key === key
        ? prev.dir === 'asc'
          ? { key, dir: 'desc' }
          : { key, dir: 'asc' }
        : { key, dir: 'asc' },
    )
  }

  return (
    <div className="table-scroll">
      <table className="moves-table">
        <caption>{label}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  sort?.key === col.key
                    ? sort.dir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <button type="button" className="sort-button" onClick={() => toggleSort(col.key)}>
                  {col.label}
                  {sort?.key === col.key && (
                    <span aria-hidden="true">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={`${row.name}-${row.level}-${i}`}>
              {hasLevel && <td>{row.level}</td>}
              <td>
                <Link to="/moves/$name" params={{ name: row.name }}>
                  {row.label}
                </Link>
              </td>
              <td>
                <TypeBadgeLink name={row.typeName} label={row.typeLabel} />
              </td>
              <td>{row.category}</td>
              <td>{row.power ?? MISSING}</td>
              <td>{row.accuracy ?? MISSING}</td>
              <td>{row.pp ?? MISSING}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
