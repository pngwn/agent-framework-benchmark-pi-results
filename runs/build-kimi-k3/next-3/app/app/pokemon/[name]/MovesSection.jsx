'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MISSING } from '../../../lib/format.js';

const BASE_COLUMNS = [
  { key: 'moveLabel', label: 'Move', type: 'string' },
  { key: 'typeLabel', label: 'Type', type: 'string' },
  { key: 'category', label: 'Category', type: 'string' },
  { key: 'power', label: 'Power', type: 'number' },
  { key: 'accuracy', label: 'Accuracy', type: 'number' },
  { key: 'pp', label: 'PP', type: 'number' },
];

function compareValues(a, b, direction) {
  const aMissing = a == null;
  const bMissing = b == null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1; // missing values sort last in both directions
  if (bMissing) return -1;
  const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return direction === 'ascending' ? result : -result;
}

function MoveTable({ table, sort, onSort }) {
  const columns = table.method === 'level-up' ? [{ key: 'level', label: 'Level', type: 'number' }, ...BASE_COLUMNS] : BASE_COLUMNS;

  let rows = table.rows;
  if (sort) {
    rows = [...rows].sort(
      (a, b) => compareValues(a[sort.key], b[sort.key], sort.direction) || a.moveLabel.localeCompare(b.moveLabel),
    );
  }

  const click = (column) => () => {
    if (sort?.key === column.key) {
      onSort({ key: column.key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' });
    } else {
      onSort({ key: column.key, direction: 'ascending' });
    }
  };

  return (
    <div className="table-wrapper">
      <table>
        <caption>{table.methodLabel}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" aria-sort={sort?.key === column.key ? sort.direction : undefined}>
                <button type="button" className="sort-button" onClick={click(column)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.level}-${row.move}-${i}`}>
              {table.method === 'level-up' && <td>{row.level}</td>}
              <td>
                <Link href={`/moves/${row.move}`}>{row.moveLabel}</Link>
              </td>
              <td>
                <Link href={`/types/${row.type}`} className={`type-badge type-${row.type}`}>
                  {row.typeLabel}
                </Link>
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
  );
}

export default function MovesSection({ games, tablesByGame, defaultGame, initialGame }) {
  const [game, setGame] = useState(initialGame || defaultGame);
  const [sorts, setSorts] = useState({});

  const changeGame = (event) => {
    const next = event.target.value;
    setGame(next);
    const url = `${window.location.pathname}?game=${encodeURIComponent(next)}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  };

  const tables = tablesByGame[game] ?? [];

  return (
    <section id="moves" aria-labelledby="moves-heading" className="section">
      <h2 id="moves-heading" className="section-title">
        Moves
      </h2>
      <div className="game-control">
        <label htmlFor="game">Game</label>
        <select id="game" value={game} onChange={changeGame}>
          {games.map((g) => (
            <option key={g.name} value={g.name}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      {tables.map((table) => (
        <MoveTable
          key={`${game}-${table.method}`}
          table={table}
          sort={sorts[`${game}-${table.method}`] ?? null}
          onSort={(next) => setSorts((current) => ({ ...current, [`${game}-${table.method}`]: next }))}
        />
      ))}
    </section>
  );
}
