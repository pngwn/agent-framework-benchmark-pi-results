'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TypeBadge } from '@/components/PokemonCard';

const NUMERIC_COLUMNS = new Set(['level', 'power', 'accuracy', 'pp']);

function compareRows(a, b, column, direction) {
  const aValue = a[column];
  const bValue = b[column];
  const aMissingValue = a[column] === '—' || a[column] === null || a[column] === undefined;
  const bMissingValue = b[column] === '—' || b[column] === null || b[column] === undefined;
  if (aMissingValue && bMissingValue) return 0;
  if (aMissingValue) return 1;
  if (bMissingValue) return -1;

  let result;
  if (NUMERIC_COLUMNS.has(column)) {
    result = Number(aValue) - Number(bValue);
  } else {
    result = String(aValue).localeCompare(String(bValue));
  }
  return direction === 'ascending' ? result : -result;
}

export default function MovesSection({ games, selectedGame, tables }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sorts, setSorts] = useState({});

  function changeGame(event) {
    const params = new URLSearchParams(searchParams.toString());
    if (event.target.value) params.set('game', event.target.value);
    else params.delete('game');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function toggleSort(tableKey, column) {
    setSorts((previous) => {
      const current = previous[tableKey];
      if (current?.column === column) {
        return {
          ...previous,
          [tableKey]: {
            column,
            direction: current.direction === 'ascending' ? 'descending' : 'ascending',
          },
        };
      }
      return { ...previous, [tableKey]: { column, direction: 'ascending' } };
    });
  }

  return (
    <div>
      <div className="moves-controls">
        <label htmlFor="game">Game</label>
        <select id="game" value={selectedGame} onChange={changeGame}>
          {games.map((game) => (
            <option key={game.name} value={game.name}>
              {game.english}
            </option>
          ))}
        </select>
      </div>

      {tables.map((table) => {
        const activeSort = sorts[table.key];
        const columns = [
          ...(table.hasLevel ? [{ key: 'level', label: 'Level' }] : []),
          { key: 'move', label: 'Move' },
          { key: 'type', label: 'Type' },
          { key: 'category', label: 'Category' },
          { key: 'power', label: 'Power' },
          { key: 'accuracy', label: 'Accuracy' },
          { key: 'pp', label: 'PP' },
        ];
        const rows = activeSort
          ? table.rows
              .map((row) => row)
              .sort((a, b) => compareRows(a, b, activeSort.column, activeSort.direction))
          : table.rows;

        return (
          <div className="moves-table" key={table.key}>
            <table>
              <caption>{table.title}</caption>
              <thead>
                <tr>
                  {columns.map((column) => {
                    const sortDirection = activeSort?.column === column.key
                      ? activeSort.direction
                      : 'none';
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={sortDirection}
                      >
                        <button
                          type="button"
                          className="sort-button"
                          onClick={() => toggleSort(table.key, column.key)}
                        >
                          {column.label}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.moveName}-${row.level}-${index}`}>
                    {table.hasLevel ? <td>{row.level}</td> : null}
                    <td>
                      <Link href={`/moves/${row.moveName}`}>{row.move}</Link>
                    </td>
                    <td>
                      <TypeBadge asLink name={row.typeName}>
                        {row.type}
                      </TypeBadge>
                    </td>
                    <td>{row.category}</td>
                    <td>{row.power}</td>
                    <td>{row.accuracy}</td>
                    <td>{row.pp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
