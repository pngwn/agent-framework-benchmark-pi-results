import { component$, useSignal } from '@builder.io/qwik';
import type { MoveRow, MoveTable as MoveTableData } from '~/lib/api';
import { displayNumber } from '~/lib/format';

type SortKey = 'level' | 'moveLabel' | 'typeLabel' | 'category' | 'power' | 'accuracy' | 'pp';
type SortState = { key: SortKey; direction: 'ascending' | 'descending' } | null;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'moveLabel', label: 'Move' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'pp', label: 'PP' },
];

const NUMERIC_KEYS = new Set<SortKey>(['level', 'power', 'accuracy', 'pp']);

function compareRows(a: MoveRow, b: MoveRow, key: SortKey, direction: 'ascending' | 'descending'): number {
  const av = a[key] as string | number | null;
  const bv = b[key] as string | number | null;
  const factor = direction === 'ascending' ? 1 : -1;

  if (NUMERIC_KEYS.has(key)) {
    if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1;
    if (bv === null || bv === undefined) return -1;
    return (Number(av) - Number(bv)) * factor;
  }

  return String(av ?? '').localeCompare(String(bv ?? '')) * factor;
}

export const MoveTable = component$((props: { table: MoveTableData }) => {
  const sort = useSignal<SortState>(null);
  const isLevelUp = props.table.method === 'level-up';
  const columns = COLUMNS.filter((column) => column.key !== 'level' || isLevelUp);

  const rows = [...props.table.rows].sort((a, b) => {
    if (sort.value) return compareRows(a, b, sort.value.key, sort.value.direction);
    if (isLevelUp) {
      return compareRows(a, b, 'level', 'ascending') || compareRows(a, b, 'moveLabel', 'ascending');
    }
    return compareRows(a, b, 'moveLabel', 'ascending');
  });

  return (
    <div class="move-table">
      <table>
        <caption>{props.table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort.value?.key === column.key ? sort.value.direction : undefined}
              >
                <button
                  type="button"
                  onClick$={() => {
                    const current = sort.value;
                    sort.value =
                      current?.key === column.key
                        ? { key: column.key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
                        : { key: column.key, direction: 'ascending' };
                  }}
                >
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.move}-${row.level ?? 'x'}-${row.moveLabel}`}>
              {isLevelUp && <td>{displayNumber(row.level)}</td>}
              <td><a href={`/moves/${row.move}`}>{row.moveLabel}</a></td>
              <td>
                {row.type ? (
                  <a class={`type-badge type-${row.type}`} href={`/types/${row.type}`}>{row.typeLabel}</a>
                ) : '—'}
              </td>
              <td>{row.category}</td>
              <td>{displayNumber(row.power)}</td>
              <td>{displayNumber(row.accuracy)}</td>
              <td>{displayNumber(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
