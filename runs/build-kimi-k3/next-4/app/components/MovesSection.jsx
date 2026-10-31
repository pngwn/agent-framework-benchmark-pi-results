'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const COLUMNS = [
  { key: 'level', label: 'Level' },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function sortValue(row, key) {
  switch (key) {
    case 'level':
      return row.level;
    case 'move':
      return row.moveEn;
    case 'type':
      return row.typeEn;
    case 'category':
      return row.category;
    default:
      return row[key];
  }
}

function sortRows(rows, sort) {
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    // Missing values sort last in both directions.
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp =
      typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sort.dir === 'ascending' ? cmp : -cmp;
  });
}

function MoveTable({ method }) {
  const [sort, setSort] = useState(null);
  const columns = COLUMNS.filter((c) => c.key !== 'level' || method.hasLevel);
  const rows = sort ? sortRows(method.rows, sort) : method.rows;

  const onSort = (key) =>
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === 'ascending' ? 'descending' : 'ascending' }
        : { key, dir: 'ascending' },
    );

  return (
    <table className="moves-table">
      <caption>{method.label}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? sort.dir : undefined}>
              <button type="button" onClick={() => onSort(c.key)}>
                {c.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.moveName}-${i}`}>
            {method.hasLevel && <td>{r.level}</td>}
            <td>
              <Link href={`/moves/${r.moveName}`}>{r.moveEn}</Link>
            </td>
            <td>
              {r.typeName ? (
                <Link
                  className="type-badge"
                  style={{ background: `var(--type-${r.typeName}, var(--type-normal))` }}
                  href={`/types/${r.typeName}`}
                >
                  {r.typeEn}
                </Link>
              ) : (
                '—'
              )}
            </td>
            <td>{r.category || '—'}</td>
            <td>{r.power ?? '—'}</td>
            <td>{r.accuracy ?? '—'}</td>
            <td>{r.pp ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MovesSection({ games, selected, methods }) {
  const router = useRouter();
  return (
    <>
      {games.length > 0 && (
        <div className="field game-field">
          <label htmlFor="moves-game">Game</label>
          <select
            id="moves-game"
            key={selected}
            defaultValue={selected}
            onChange={(e) => router.replace(`?game=${e.target.value}`, { scroll: false })}
          >
            {games.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {methods.map((m) => (
        <MoveTable key={m.key} method={m} />
      ))}
    </>
  );
}
