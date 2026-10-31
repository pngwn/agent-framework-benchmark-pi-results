import { component$, useSignal } from '@builder.io/qwik';
import { EM_DASH } from '../lib/format';

export interface MoveRow {
  level: number | null;
  move: string;
  moveEn: string;
  type: string;
  typeEn: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MovesTableProps {
  caption: string;
  rows: MoveRow[];
  showLevel: boolean;
}

type SortKey = 'level' | 'moveEn' | 'typeEn' | 'category' | 'power' | 'accuracy' | 'pp';

interface SortState {
  key: SortKey;
  dir: 1 | -1;
}

function compareValues(a: string | number | null, b: string | number | null, dir: 1 | -1): number {
  // Missing values sort last in both directions.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const r =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b));
  return r * dir;
}

export const MovesTable = component$<MovesTableProps>(({ caption, rows, showLevel }) => {
  const sort = useSignal<SortState | null>(null);

  const columns: Array<{ key: SortKey; label: string }> = [
    ...(showLevel ? [{ key: 'level' as SortKey, label: 'Level' }] : []),
    { key: 'moveEn', label: 'Move' },
    { key: 'typeEn', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];

  let sorted = rows;
  const s = sort.value;
  if (s) {
    sorted = rows
      .map((row, i) => ({ row, i }))
      .sort((a, b) => compareValues(a.row[s.key], b.row[s.key], s.dir) || a.i - b.i)
      .map(({ row }) => row);
  }

  return (
    <table class="moves-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              aria-sort={
                s?.key === c.key ? (s.dir === 1 ? 'ascending' : 'descending') : undefined
              }
            >
              <button
                type="button"
                onClick$={() => {
                  const cur = sort.value;
                  if (cur && cur.key === c.key) {
                    sort.value = { key: c.key, dir: cur.dir === 1 ? -1 : 1 };
                  } else {
                    sort.value = { key: c.key, dir: 1 };
                  }
                }}
              >
                {c.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, i) => (
          <tr key={`${r.move}-${r.level ?? ''}-${i}`}>
            {showLevel && <td>{r.level ?? EM_DASH}</td>}
            <td>
              <a href={`/moves/${r.move}`}>{r.moveEn}</a>
            </td>
            <td>
              <a class={`type-badge type-${r.type}`} href={`/types/${r.type}`}>
                {r.typeEn}
              </a>
            </td>
            <td>{r.category}</td>
            <td>{r.power ?? EM_DASH}</td>
            <td>{r.accuracy ?? EM_DASH}</td>
            <td>{r.pp ?? EM_DASH}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});
