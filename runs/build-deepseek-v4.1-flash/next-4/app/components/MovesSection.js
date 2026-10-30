'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';

const LEVEL_COLUMNS = [
  { key: 'level', label: 'Level', numeric: true },
  { key: 'moveLabel', label: 'Move', numeric: false },
  { key: 'typeLabel', label: 'Type', numeric: false },
  { key: 'category', label: 'Category', numeric: false },
  { key: 'power', label: 'Power', numeric: true },
  { key: 'accuracy', label: 'Accuracy', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
];

const OTHER_COLUMNS = LEVEL_COLUMNS.slice(1);

function valueText(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function isMissing(value) {
  return value === null || value === undefined || value === '';
}

function compareRows(a, b, key, direction, numeric) {
  const av = a[key];
  const bv = b[key];
  const aMissing = isMissing(av);
  const bMissing = isMissing(bv);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let result = numeric ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
  if (result === 0) result = String(a.moveName).localeCompare(String(b.moveName));
  return direction === 'ascending' ? result : -result;
}

function MoveTable({ table }) {
  const isLevelUp = table.method === 'level-up';
  const columns = isLevelUp ? LEVEL_COLUMNS : OTHER_COLUMNS;
  const [sort, setSort] = useState({ key: isLevelUp ? 'level' : 'moveLabel', direction: 'ascending' });

  const columnsByKey = Object.fromEntries(columns.map((column) => [column.key, column]));
  const rows = useMemo(
    () => [...table.rows].sort((a, b) => compareRows(a, b, sort.key, sort.direction, columnsByKey[sort.key].numeric)),
    [table.rows, sort, columnsByKey],
  );

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  }

  return (
    <div className="tableScroll">
      <table className="moveTable">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                scope="col"
                key={column.key}
                aria-sort={sort.key === column.key ? sort.direction : undefined}
              >
                <button className="sortButton" type="button" onClick={() => toggleSort(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.moveName}-${row.level ?? ''}`}>
              {isLevelUp ? <td>{valueText(row.level)}</td> : null}
              <td>
                <Link href={`/moves/${row.moveName}`}>{row.moveLabel}</Link>
              </td>
              <td>
                <Link className="typeBadge" data-type={row.typeName} href={`/types/${row.typeName}`}>
                  {row.typeLabel}
                </Link>
              </td>
              <td>{valueText(row.category)}</td>
              <td>{valueText(row.power)}</td>
              <td>{valueText(row.accuracy)}</td>
              <td>{valueText(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MovesSection({ speciesName, games, selectedGame, tables }) {
  const router = useRouter();

  function changeGame(event) {
    const game = event.target.value;
    router.push(`/pokemon/${speciesName}?game=${encodeURIComponent(game)}`, { scroll: false });
  }

  return (
    <section className="section" id="moves" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div className="movesToolbar">
        <label htmlFor="game">Game</label>
        <select className="select" id="game" value={selectedGame} onChange={changeGame}>
          {games.map((game) => (
            <option value={game.name} key={game.name}>
              {game.label}
            </option>
          ))}
        </select>
      </div>
      {tables.map((table) => (
        <MoveTable table={table} key={`${selectedGame}-${table.method}`} />
      ))}
    </section>
  );
}
