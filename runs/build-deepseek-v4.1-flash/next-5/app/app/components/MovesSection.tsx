'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GameMoves, MoveRowData, MoveTableData } from '../lib/data';

type SortDirection = 'ascending' | 'descending';

interface SortState {
  key: string;
  direction: SortDirection;
}

const COLUMNS: { key: string; label: string; levelOnly?: boolean }[] = [
  { key: 'level', label: 'Level', levelOnly: true },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function valueFor(row: MoveRowData, key: string): string | number | null {
  switch (key) {
    case 'level':
      return row.level;
    case 'move':
      return row.moveLabel;
    case 'type':
      return row.typeLabel;
    case 'category':
      return row.category;
    case 'power':
      return row.power;
    case 'accuracy':
      return row.accuracy;
    case 'pp':
      return row.pp;
    default:
      return null;
  }
}

function isMissing(value: string | number | null): boolean {
  return value === null || value === undefined || value === '' || value === '—';
}

function sortRows(rows: MoveRowData[], sort: SortState | null): MoveRowData[] {
  if (!sort) return rows;
  const copy = rows.slice();
  copy.sort((a, b) => {
    const aValue = valueFor(a, sort.key);
    const bValue = valueFor(b, sort.key);
    const aMissing = isMissing(aValue);
    const bMissing = isMissing(bValue);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    const comparison =
      typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
    return sort.direction === 'ascending' ? comparison : -comparison;
  });
  return copy;
}

function MoveTable({ gameName, table }: { gameName: string; table: MoveTableData }) {
  const [sort, setSort] = useState<SortState | null>(null);
  const rows = sortRows(table.rows, sort);
  const columns = COLUMNS.filter((column) => !column.levelOnly || table.method === 'level-up');

  function handleSort(key: string) {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'ascending' ? 'descending' : 'ascending',
        };
      }
      return { key, direction: 'ascending' };
    });
  }

  return (
    <div className="moves-table-wrap">
      <table className="moves-table" data-game={gameName} data-method={table.method}>
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort?.key === column.key ? sort.direction : undefined}
              >
                <button type="button" className="sort-button" onClick={() => handleSort(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.moveName}-${row.level ?? ''}`}>
              {columns.map((column) => {
                switch (column.key) {
                  case 'level':
                    return <td key="level">{row.level === null ? '—' : row.level}</td>;
                  case 'move':
                    return (
                      <td key="move">
                        <Link href={`/moves/${row.moveName}`}>{row.moveLabel}</Link>
                      </td>
                    );
                  case 'type':
                    return (
                      <td key="type">
                        {row.typeName ? (
                          <Link href={`/types/${row.typeName}`}>{row.typeLabel}</Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    );
                  case 'category':
                    return <td key="category">{row.category}</td>;
                  case 'power':
                    return <td key="power">{row.power === null ? '—' : row.power}</td>;
                  case 'accuracy':
                    return <td key="accuracy">{row.accuracy === null ? '—' : row.accuracy}</td>;
                  case 'pp':
                    return <td key="pp">{row.pp === null ? '—' : row.pp}</td>;
                  default:
                    return null;
                }
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MovesSection({
  games,
  initialGame,
}: {
  games: GameMoves[];
  initialGame: string;
}) {
  const [gameName, setGameName] = useState(initialGame);
  const game = games.find((entry) => entry.name === gameName) ?? games[0] ?? null;

  function handleGame(value: string) {
    setGameName(value);
    const url = new URL(window.location.href);
    url.searchParams.set('game', value);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="moves-content">
      <div className="game-picker">
        <label htmlFor="game-select">Game</label>
        <select id="game-select" value={gameName} onChange={(event) => handleGame(event.target.value)}>
          {games.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
      {game?.tables.map((table) => (
        <MoveTable key={`${game.name}:${table.method}`} gameName={game.name} table={table} />
      ))}
    </div>
  );
}
