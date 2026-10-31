import { component$, useSignal } from '@builder.io/qwik';
import { orDash } from '../lib/format';

export interface MoveRow {
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  caption: string;
  showLevel: boolean;
  rows: MoveRow[];
}

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDir = 'ascending' | 'descending';

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
}

function rowValue(row: MoveRow, key: SortKey): string | number | null {
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
  }
}

function compareValues(a: string | number | null, b: string | number | null, numeric: boolean, dir: SortDir): number {
  // Missing values sort last in both directions.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  let cmp: number;
  if (numeric) cmp = (a as number) - (b as number);
  else cmp = String(a).localeCompare(String(b));
  return dir === 'ascending' ? cmp : -cmp;
}

export const MovesTable = component$<{ table: MoveTableData }>(({ table }) => {
  const sortKey = useSignal<SortKey | null>(null);
  const sortDir = useSignal<SortDir>('ascending');

  const columns: Column[] = [
    ...(table.showLevel ? [{ key: 'level' as SortKey, label: 'Level', numeric: true }] : []),
    { key: 'move', label: 'Move', numeric: false },
    { key: 'type', label: 'Type', numeric: false },
    { key: 'category', label: 'Category', numeric: false },
    { key: 'power', label: 'Power', numeric: true },
    { key: 'accuracy', label: 'Accuracy', numeric: true },
    { key: 'pp', label: 'PP', numeric: true },
  ];

  const rows = [...table.rows];
  const key = sortKey.value;
  if (key) {
    const col = columns.find((c) => c.key === key)!;
    rows.sort((a, b) => compareValues(rowValue(a, key), rowValue(b, key), col.numeric, sortDir.value));
  }

  return (
    <div class="moves-table-wrap">
      <table class="moves-table">
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={sortKey.value === col.key ? sortDir.value : undefined}
              >
                <button
                  type="button"
                  onClick$={() => {
                    if (sortKey.value === col.key) {
                      sortDir.value = sortDir.value === 'ascending' ? 'descending' : 'ascending';
                    } else {
                      sortKey.value = col.key;
                      sortDir.value = 'ascending';
                    }
                  }}
                >
                  {col.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.moveName}-${i}`}>
              {table.showLevel && <td>{row.level ?? '—'}</td>}
              <td>
                <a href={`/moves/${row.moveName}`}>{row.moveLabel}</a>
              </td>
              <td>
                <a class="type-badge" data-type={row.typeName} href={`/types/${row.typeName}`}>
                  {row.typeLabel}
                </a>
              </td>
              <td>{row.category}</td>
              <td>{orDash(row.power)}</td>
              <td>{orDash(row.accuracy)}</td>
              <td>{orDash(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
