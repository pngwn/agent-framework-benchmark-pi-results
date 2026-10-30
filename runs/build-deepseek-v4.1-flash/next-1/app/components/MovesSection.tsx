'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { displayValue } from '@/lib/format';

export interface MoveRow {
  level: number | null;
  moveSlug: string;
  moveName: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MovesTable {
  method: string;
  label: string;
  rows: MoveRow[];
}

export interface GameOption {
  name: string;
  label: string;
  order: number;
}

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDirection = 'ascending' | 'descending';

const COLUMN_LABELS: Record<SortKey, string> = {
  level: 'Level',
  move: 'Move',
  type: 'Type',
  category: 'Category',
  power: 'Power',
  accuracy: 'Accuracy',
  pp: 'PP',
};

function valueFor(row: MoveRow, key: SortKey): string | number | null {
  switch (key) {
    case 'level':
      return row.level;
    case 'move':
      return row.moveName;
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
  }
}

function isMissing(value: string | number | null): boolean {
  return value === null || value === undefined || value === '';
}

function compareRows(a: MoveRow, b: MoveRow, key: SortKey, direction: SortDirection): number {
  const aValue = valueFor(a, key);
  const bValue = valueFor(b, key);
  const aMissing = isMissing(aValue);
  const bMissing = isMissing(bValue);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let result: number;
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    result = aValue - bValue;
  } else {
    result = String(aValue).localeCompare(String(bValue), 'en');
  }
  return direction === 'ascending' ? result : -result;
}

function sortedRows(rows: MoveRow[], sort: { key: SortKey; direction: SortDirection } | undefined) {
  if (!sort) return rows;
  return [...rows].sort((a, b) => compareRows(a, b, sort.key, sort.direction));
}

export default function MovesSection({
  speciesSlug,
  games,
  selectedGame,
  tables,
}: {
  speciesSlug: string;
  games: GameOption[];
  selectedGame: string;
  tables: MovesTable[];
}) {
  const router = useRouter();
  const [game, setGame] = useState(selectedGame);
  const [sorts, setSorts] = useState<Record<string, { key: SortKey; direction: SortDirection }>>({});

  useEffect(() => {
    setGame(selectedGame);
  }, [selectedGame]);

  function onGameChange(value: string) {
    setGame(value);
    router.replace(`/pokemon/${speciesSlug}?game=${encodeURIComponent(value)}`, { scroll: false });
  }

  function toggleSort(method: string, key: SortKey) {
    setSorts((previous) => {
      const existing = previous[method];
      const direction: SortDirection =
        existing?.key === key && existing.direction === 'ascending' ? 'descending' : 'ascending';
      return { ...previous, [method]: { key, direction } };
    });
  }

  return (
    <>
      <div className="game-field">
        <label htmlFor="game-select">Game</label>
        <select id="game-select" value={game} onChange={(event) => onGameChange(event.currentTarget.value)}>
          {games.map((item) => (
            <option key={item.name} value={item.name}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {tables.map((table) => {
        const hasLevel = table.method === 'level-up';
        const keys: SortKey[] = hasLevel
          ? ['level', 'move', 'type', 'category', 'power', 'accuracy', 'pp']
          : ['move', 'type', 'category', 'power', 'accuracy', 'pp'];
        const sort = sorts[table.method];
        const rows = sortedRows(table.rows, sort);

        return (
          <div className="method-block" key={table.method}>
            <div className="table-scroll">
              <table className="moves-table">
                <caption className="method-caption">{table.label}</caption>
                <thead>
                  <tr>
                    {keys.map((key) => (
                      <th
                        key={key}
                        scope="col"
                        aria-sort={sort?.key === key ? sort.direction : 'none'}
                      >
                        <button type="button" onClick={() => toggleSort(table.method, key)}>
                          {COLUMN_LABELS[key]}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.moveSlug}-${row.level ?? 'x'}-${index}`}>
                      {hasLevel ? <td>{displayValue(row.level)}</td> : null}
                      <td>
                        <Link href={`/moves/${row.moveSlug}`}>{row.moveName}</Link>
                      </td>
                      <td>
                        <Link className={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
                          {row.typeLabel}
                        </Link>
                      </td>
                      <td>{row.category}</td>
                      <td>{displayValue(row.power)}</td>
                      <td>{displayValue(row.accuracy)}</td>
                      <td>{displayValue(row.pp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
