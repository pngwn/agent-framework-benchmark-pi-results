'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { TypeInfo } from '@/lib/api';
import { orMissing } from '@/lib/format';

export type MoveRow = {
  key: string;
  level: number;
  name: string;
  label: string;
  type: TypeInfo | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type Column = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

const COLUMNS: { id: Column; label: string }[] = [
  { id: 'level', label: 'Level' },
  { id: 'move', label: 'Move' },
  { id: 'type', label: 'Type' },
  { id: 'category', label: 'Category' },
  { id: 'power', label: 'Power' },
  { id: 'accuracy', label: 'Accuracy' },
  { id: 'pp', label: 'PP' },
];

function sortValue(row: MoveRow, column: Column): string | number | null {
  switch (column) {
    case 'level':
      return row.level;
    case 'move':
      return row.label;
    case 'type':
      return row.type?.label ?? null;
    case 'category':
      return row.category;
    default:
      return row[column];
  }
}

function compare(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
}

export function MovesTable({ caption, showLevel, rows }: { caption: string; showLevel: boolean; rows: MoveRow[] }) {
  const [sort, setSort] = useState<{ column: Column; direction: Direction } | null>(null);
  const columns = showLevel ? COLUMNS : COLUMNS.filter((c) => c.id !== 'level');

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const sign = sort.direction === 'ascending' ? 1 : -1;
    // Stable sort on top of the default order; missing values always go last.
    return [...rows].sort((a, b) => {
      const x = sortValue(a, sort.column);
      const y = sortValue(b, sort.column);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return sign * compare(x, y);
    });
  }, [rows, sort]);

  function toggle(column: Column) {
    setSort((s) =>
      s?.column === column
        ? { column, direction: s.direction === 'ascending' ? 'descending' : 'ascending' }
        : { column, direction: 'ascending' },
    );
  }

  return (
    <div className="table-scroll">
      <table className="moves">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.column === c.id ? sort.direction : undefined;
              return (
                <th key={c.id} scope="col" aria-sort={active}>
                  <button type="button" className="sort-button" onClick={() => toggle(c.id)}>
                    {c.label}
                    {active && <span aria-hidden="true">{active === 'ascending' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key}>
              {showLevel && <td>{row.level}</td>}
              <td>
                <Link href={`/moves/${row.name}`}>{row.label}</Link>
              </td>
              <td>
                {row.type ? (
                  <Link className={`type-badge type-${row.type.name}`} href={`/types/${row.type.name}`}>
                    {row.type.label}
                  </Link>
                ) : (
                  '—'
                )}
              </td>
              <td>{orMissing(row.category)}</td>
              <td>{orMissing(row.power)}</td>
              <td>{orMissing(row.accuracy)}</td>
              <td>{orMissing(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
