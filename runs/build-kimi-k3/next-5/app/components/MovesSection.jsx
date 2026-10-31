'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import TypeBadge from './TypeBadge.jsx';

const MISSING = '—';

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/** Sort rows by `key`; missing values always sort last. */
function sortRows(rows, key, dir) {
  const sorted = [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    const ma = va === null || va === undefined;
    const mb = vb === null || vb === undefined;
    if (ma && mb) return 0;
    if (ma) return 1;
    if (mb) return -1;
    return compareValues(va, vb) || compareValues(a.moveLabel, b.moveLabel);
  });
  if (dir === 'descending') {
    // Reverse, keeping missing values last.
    const present = sorted.filter((r) => r[key] !== null && r[key] !== undefined).reverse();
    const missing = sorted.filter((r) => r[key] === null || r[key] === undefined);
    return [...present, ...missing];
  }
  return sorted;
}

function MovesTable({ table }) {
  const [sort, setSort] = useState(null); // { key, dir }
  const columns = [
    ...(table.hasLevel ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'moveLabel', label: 'Move' },
    { key: 'typeLabel', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];

  const rows = useMemo(
    () => (sort ? sortRows(table.rows, sort.key, sort.dir) : table.rows),
    [table.rows, sort],
  );

  function toggle(key) {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === 'ascending' ? 'descending' : 'ascending' }
        : { key, dir: 'ascending' },
    );
  }

  return (
    <table className="moves-table">
      <caption>{table.label}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              scope="col"
              className={col.key === 'level' ? 'col-level' : undefined}
              aria-sort={sort?.key === col.key ? sort.dir : undefined}
            >
              <button type="button" onClick={() => toggle(col.key)}>
                {col.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.moveName}>
            {table.hasLevel && <td>{row.level}</td>}
            <td>
              <Link href={`/moves/${row.moveName}`}>{row.moveLabel}</Link>
            </td>
            <td>
              <TypeBadge name={row.typeName} label={row.typeLabel} href={`/types/${row.typeName}`} />
            </td>
            <td>{row.category}</td>
            <td>{row.power ?? MISSING}</td>
            <td>{row.accuracy ?? MISSING}</td>
            <td>{row.pp ?? MISSING}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The Moves section of a Pokémon page: a game selector plus one sortable table per
 * learn method for the selected version group.
 */
export default function MovesSection({ games, selected, tables }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      <div className="field field-game">
        <label htmlFor="game">Game</label>
        <select
          id="game"
          value={selected}
          onChange={(e) => router.push(`${pathname}?game=${e.target.value}#moves`)}
        >
          {games.map((g) => (
            <option key={g.name} value={g.name}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      {tables.map((table) => (
        <MovesTable key={table.method} table={table} />
      ))}
    </>
  );
}
