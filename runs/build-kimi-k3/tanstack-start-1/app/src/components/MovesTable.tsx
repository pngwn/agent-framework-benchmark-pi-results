import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MISSING } from '../lib/format'
import { TypeBadgeLink } from './TypeBadge'

export interface MoveRowData {
  level: number
  name: string
  display: string
  typeName: string
  typeDisplay: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

type SortDirection = 'ascending' | 'descending'

interface Column {
  key: string
  label: string
  value: (row: MoveRowData) => string | number | null
}

const LEVEL_COLUMN: Column = { key: 'level', label: 'Level', value: (r) => r.level }
const COLUMNS: Column[] = [
  { key: 'move', label: 'Move', value: (r) => r.display },
  { key: 'type', label: 'Type', value: (r) => r.typeDisplay },
  { key: 'category', label: 'Category', value: (r) => r.category },
  { key: 'power', label: 'Power', value: (r) => r.power },
  { key: 'accuracy', label: 'Accuracy', value: (r) => r.accuracy },
  { key: 'pp', label: 'PP', value: (r) => r.pp },
]

function displayValue(value: string | number | null): string {
  if (value === null || value === undefined || value === '') return MISSING
  return String(value)
}

export function MovesTable({
  caption,
  rows,
  showLevel,
}: {
  caption: string
  rows: MoveRowData[]
  showLevel: boolean
}) {
  const columns = showLevel ? [LEVEL_COLUMN, ...COLUMNS] : COLUMNS
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column) return rows
    const factor = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = column.value(a)
      const bv = column.value(b)
      const aMissing = av === null || av === undefined || av === ''
      const bMissing = bv === null || bv === undefined || bv === ''
      // Missing values always sort last, in both directions.
      if (aMissing && bMissing) return 0
      if (aMissing) return 1
      if (bMissing) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor
      return String(av).localeCompare(String(bv)) * factor
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort, showLevel])

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
        : { key, direction: 'ascending' },
    )
  }

  return (
    <table className="moves-table">
      <caption>{caption}</caption>
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
          <tr key={row.name}>
            {showLevel && <td>{row.level}</td>}
            <td>
              <Link to="/moves/$name" params={{ name: row.name }}>
                {row.display}
              </Link>
            </td>
            <td>
              {row.typeName ? (
                <TypeBadgeLink name={row.typeName} display={row.typeDisplay} />
              ) : (
                MISSING
              )}
            </td>
            <td>{displayValue(row.category)}</td>
            <td>{displayValue(row.power)}</td>
            <td>{displayValue(row.accuracy)}</td>
            <td>{displayValue(row.pp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
