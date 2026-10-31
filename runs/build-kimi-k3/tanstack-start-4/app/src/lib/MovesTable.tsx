import { Link } from '@tanstack/react-router'
import * as React from 'react'
import type { MoveRowVM, MoveTableVM } from './data'

type SortDir = 'ascending' | 'descending'

interface SortState {
  col: string
  dir: SortDir
}

function cellValue(row: MoveRowVM, col: string): number | string | null {
  switch (col) {
    case 'level':
      return row.level
    case 'move':
      return row.move
    case 'type':
      return row.typeName
    case 'category':
      return row.category
    case 'power':
      return row.power
    case 'accuracy':
      return row.accuracy
    case 'pp':
      return row.pp
    default:
      return null
  }
}

function sortRows(rows: MoveRowVM[], sort: SortState): MoveRowVM[] {
  const dir = sort.dir === 'ascending' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = cellValue(a, sort.col)
    const vb = cellValue(b, sort.col)
    // Missing values sort last in both directions.
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
    return cmp * dir
  })
}

export function MovesTable({ table }: { table: MoveTableVM }) {
  const [sort, setSort] = React.useState<SortState | null>(null)

  const columns: Array<{ key: string; label: string }> = [
    ...(table.hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ]

  const toggleSort = (col: string) => {
    setSort((prev) =>
      prev?.col === col
        ? { col, dir: prev.dir === 'ascending' ? 'descending' : 'ascending' }
        : { col, dir: 'ascending' },
    )
  }

  const rows = React.useMemo(
    () => (sort ? sortRows(table.rows, sort) : table.rows),
    [table.rows, sort],
  )

  return (
    <table className="moves-table">
      <caption>{table.label}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              scope="col"
              aria-sort={sort?.col === col.key ? sort.dir : undefined}
            >
              <button type="button" className="th-sort" onClick={() => toggleSort(col.key)}>
                {col.label}
                {sort?.col === col.key ? (sort.dir === 'ascending' ? ' ▲' : ' ▼') : ''}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.moveName}-${i}`}>
            {table.hasLevel ? <td>{row.level}</td> : null}
            <td>
              <Link to="/moves/$name" params={{ name: row.moveName }}>
                {row.move}
              </Link>
            </td>
            <td>
              {row.type ? (
                <Link
                  to="/types/$name"
                  params={{ name: row.type }}
                  className="type-badge"
                  data-type={row.type}
                >
                  {row.typeName}
                </Link>
              ) : (
                '—'
              )}
            </td>
            <td>{row.category}</td>
            <td>{row.power ?? '—'}</td>
            <td>{row.accuracy ?? '—'}</td>
            <td>{row.pp ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
