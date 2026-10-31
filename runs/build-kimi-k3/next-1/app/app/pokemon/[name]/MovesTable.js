'use client';

import Link from 'next/link';
import { useState } from 'react';

const MISSING = '—';
const NUMERIC = new Set(['level', 'power', 'accuracy', 'pp']);

function compareValues(a, b, dir) {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  // Missing values sort last in both directions.
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  const result =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return dir === 'ascending' ? result : -result;
}

const display = (value) => (value === null || value === undefined ? MISSING : value);

// One move table (for a single learn method) with sortable column headers.
export default function MovesTable({ table }) {
  const [sort, setSort] = useState(null); // { key, dir } | null

  const columns = [
    ...(table.hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];

  const rows = sort
    ? [...table.rows].sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.dir))
    : table.rows;

  const toggle = (key) => {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === 'ascending' ? 'descending' : 'ascending' }
        : { key, dir: 'ascending' },
    );
  };

  return (
    <table className="moves-table">
      <caption>{table.caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={NUMERIC.has(column.key) && column.key !== 'level' ? 'num' : undefined}
              aria-sort={sort?.key === column.key ? sort.dir : undefined}
            >
              <button type="button" onClick={() => toggle(column.key)}>
                {column.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.moveHref}:${row.level}:${index}`}>
            {table.hasLevel && <td>{display(row.level)}</td>}
            <td>
              <Link href={row.moveHref} prefetch={false}>
                {row.move}
              </Link>
            </td>
            <td>
              {row.typeHref ? (
                <Link className={`badge type-${row.typeKey}`} href={row.typeHref} prefetch={false}>
                  {row.type}
                </Link>
              ) : (
                row.type
              )}
            </td>
            <td>{row.category}</td>
            <td className="num">{display(row.power)}</td>
            <td className="num">{display(row.accuracy)}</td>
            <td className="num">{display(row.pp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
