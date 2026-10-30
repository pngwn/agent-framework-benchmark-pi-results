import { $, component$, useSignal } from '@builder.io/qwik';
import { displayValue } from '../lib/format';

export interface MoveTableRow {
  level: number;
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
  name: string;
  label: string;
  rows: MoveTableRow[];
}

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDirection = 'ascending' | 'descending';

interface MoveTableProps {
  table: MoveTableData;
}

const columns: Array<{ key: SortKey; label: string; levelOnly?: boolean }> = [
  { key: 'level', label: 'Level', levelOnly: true },
  { key: 'move', label: 'Move' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

function valueFor(row: MoveTableRow, key: SortKey): string | number | null {
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

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export const MoveTable = component$<MoveTableProps>(({ table }) => {
  const initialSort: { key: SortKey; direction: SortDirection } = table.name === 'level-up'
    ? { key: 'level', direction: 'ascending' }
    : { key: 'move', direction: 'ascending' };
  const sort = useSignal(initialSort);

  const sortBy$ = $((key: SortKey) => {
    if (sort.value.key === key) {
      sort.value = {
        key,
        direction: sort.value.direction === 'ascending' ? 'descending' : 'ascending',
      };
    } else {
      sort.value = { key, direction: 'ascending' };
    }
  });

  const rows = [...table.rows].sort((a, b) => {
    const aValue = valueFor(a, sort.value.key);
    const bValue = valueFor(b, sort.value.key);
    if (aValue === null && bValue === null) return a.moveLabel.localeCompare(b.moveLabel);
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    const comparison = compareValues(aValue, bValue);
    if (comparison !== 0) {
      return sort.value.direction === 'ascending' ? comparison : -comparison;
    }
    return a.moveLabel.localeCompare(b.moveLabel);
  });

  const visibleColumns = columns.filter(
    (column) => !column.levelOnly || table.name === 'level-up',
  );

  return (
    <div class="move-table-wrap">
      <table class="moves-table">
        <caption class="sr-only">{table.label}</caption>
        <thead>
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  sort.value.key === column.key ? sort.value.direction : 'none'
                }
              >
                <button type="button" onClick$={() => sortBy$(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.moveName}-${row.level}-${row.typeName}`}>
              {table.name === 'level-up' ? <td>{row.level}</td> : null}
              <td>
                <a href={`/moves/${row.moveName}`}>{row.moveLabel}</a>
              </td>
              <td>
                <a class={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
                  {row.typeLabel}
                </a>
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
  );
});
