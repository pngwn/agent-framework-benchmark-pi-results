'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function compareValues(a, b, dir) {
  const aMissing = a == null;
  const bMissing = b == null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1; // missing values sort last in both directions
  if (bMissing) return -1;
  let result;
  if (typeof a === 'number' && typeof b === 'number') result = a - b;
  else result = String(a).localeCompare(String(b));
  return dir === 'ascending' ? result : -result;
}

function SortableTable({ table }) {
  const [sort, setSort] = useState(null); // { key, dir }

  const rows = sort
    ? [...table.rows].sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.dir))
    : table.rows;

  function onSort(column) {
    setSort((current) => {
      if (current?.key === column.key) {
        return { key: column.key, dir: current.dir === 'ascending' ? 'descending' : 'ascending' };
      }
      return { key: column.key, dir: 'ascending' };
    });
  }

  return (
    <table>
      <caption>{table.label}</caption>
      <thead>
        <tr>
          {table.columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              aria-sort={sort?.key === column.key ? sort.dir : undefined}
            >
              <button type="button" onClick={() => onSort(column)}>
                {column.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {table.columns.map((column) => (
              <td key={column.key}>{renderCell(column.key, row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderCell(key, row) {
  switch (key) {
    case 'level':
      return row.level ?? '—';
    case 'move':
      return <Link href={`/moves/${row.moveName}`}>{row.moveLabel}</Link>;
    case 'type':
      return (
        <Link className={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
          {row.typeLabel}
        </Link>
      );
    case 'category':
      return row.category;
    case 'power':
      return row.power ?? '—';
    case 'accuracy':
      return row.accuracy ?? '—';
    case 'pp':
      return row.pp ?? '—';
    default:
      return null;
  }
}

// The Moves section of a Pokémon page: a game selector plus one sortable table
// per learn method for the selected version group.
export function MovesTables({ versionGroups, selected, tables }) {
  const router = useRouter();

  function onGameChange(event) {
    router.replace(`?game=${encodeURIComponent(event.target.value)}#moves`, { scroll: false });
  }

  return (
    <>
      <div className="field game-field">
        <label htmlFor="game">Game</label>
        <select id="game" value={selected} onChange={onGameChange}>
          {versionGroups.map((vg) => (
            <option key={vg.name} value={vg.name}>
              {vg.label}
            </option>
          ))}
        </select>
      </div>
      {tables.map((table) => (
        <SortableTable key={table.method} table={table} />
      ))}
    </>
  );
}
