import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { EM_DASH, showMissing } from '~/lib/format';

export interface MoveRow {
  level: number | null;
  moveName: string;
  moveEnglish: string;
  typeName: string;
  typeEnglish: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type SortKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type SortDir = 'ascending' | 'descending';

function valueOf(row: MoveRow, key: SortKey): string | number | null {
  switch (key) {
    case 'level':
      return row.level;
    case 'move':
      return row.moveEnglish;
    case 'type':
      return row.typeEnglish;
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

function compareRows(a: MoveRow, b: MoveRow, key: SortKey, dir: SortDir): number {
  const av = valueOf(a, key);
  const bv = valueOf(b, key);
  // Missing values sort last in both directions.
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const c =
    typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
  return dir === 'ascending' ? c : -c;
}

/** One learn-method table with sortable column headers. */
export const MoveTable = component$<{ caption: string; hasLevel: boolean; rows: MoveRow[] }>(
  (props) => {
    const sortKey = useSignal<SortKey | null>(null);
    const sortDir = useSignal<SortDir>('ascending');

    const sorted = useComputed$(() => {
      const key = sortKey.value;
      if (!key) return props.rows;
      return [...props.rows].sort((a, b) => compareRows(a, b, key, sortDir.value));
    });

    const sortBy = $((key: SortKey) => {
      if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'ascending' ? 'descending' : 'ascending';
      } else {
        sortKey.value = key;
        sortDir.value = 'ascending';
      }
    });

    return (
      <table class="move-table">
        <caption>{props.caption}</caption>
        <thead>
          <tr>
            {props.hasLevel && (
              <th scope="col" aria-sort={sortKey.value === 'level' ? sortDir.value : undefined}>
                <button type="button" onClick$={() => sortBy('level')}>
                  Level
                </button>
              </th>
            )}
            <th scope="col" aria-sort={sortKey.value === 'move' ? sortDir.value : undefined}>
              <button type="button" onClick$={() => sortBy('move')}>
                Move
              </button>
            </th>
            <th scope="col" aria-sort={sortKey.value === 'type' ? sortDir.value : undefined}>
              <button type="button" onClick$={() => sortBy('type')}>
                Type
              </button>
            </th>
            <th scope="col" aria-sort={sortKey.value === 'category' ? sortDir.value : undefined}>
              <button type="button" onClick$={() => sortBy('category')}>
                Category
              </button>
            </th>
            <th scope="col" aria-sort={sortKey.value === 'power' ? sortDir.value : undefined}>
              <button type="button" onClick$={() => sortBy('power')}>
                Power
              </button>
            </th>
            <th scope="col" aria-sort={sortKey.value === 'accuracy' ? sortDir.value : undefined}>
              <button type="button" onClick$={() => sortBy('accuracy')}>
                Accuracy
              </button>
            </th>
            <th scope="col" aria-sort={sortKey.value === 'pp' ? sortDir.value : undefined}>
              <button type="button" onClick$={() => sortBy('pp')}>
                PP
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.value.map((row) => (
            <tr key={`${row.moveName}:${row.level ?? ''}`}>
              {props.hasLevel && <td>{row.level ?? EM_DASH}</td>}
              <td>
                <a href={`/moves/${row.moveName}`}>{row.moveEnglish}</a>
              </td>
              <td>
                <a class={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
                  {row.typeEnglish}
                </a>
              </td>
              <td>{row.category}</td>
              <td class="num">{showMissing(row.power)}</td>
              <td class="num">{showMissing(row.accuracy)}</td>
              <td class="num">{showMissing(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
);
