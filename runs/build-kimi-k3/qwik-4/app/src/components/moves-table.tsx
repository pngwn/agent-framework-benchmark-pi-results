import { component$, useSignal } from '@builder.io/qwik';

export interface MoveRow {
  level: number;
  move: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  method: string;
  label: string;
  showLevel: boolean;
  rows: MoveRow[];
}

type SortDir = 1 | -1;

const COLUMN_LABELS: Record<string, string> = {
  level: 'Level',
  move: 'Move',
  type: 'Type',
  category: 'Category',
  power: 'Power',
  accuracy: 'Accuracy',
  pp: 'PP',
};

function valueFor(r: MoveRow, key: string): string | number | null {
  switch (key) {
    case 'level':
      return r.level;
    case 'move':
      return r.moveLabel;
    case 'type':
      return r.typeLabel;
    case 'category':
      return r.category;
    case 'power':
      return r.power;
    case 'accuracy':
      return r.accuracy;
    case 'pp':
      return r.pp;
    default:
      return null;
  }
}

function compareValues(av: string | number | null, bv: string | number | null, dir: SortDir): number {
  // Missing values sort last in both directions.
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const c = typeof av === 'string' ? av.localeCompare(String(bv)) : av - (bv as number);
  return c * dir;
}

export const MovesTable = component$<{ table: MoveTableData }>(({ table }) => {
  const sort = useSignal<{ key: string; dir: SortDir } | null>(null);

  const columns = [...(table.showLevel ? ['level'] : []), 'move', 'type', 'category', 'power', 'accuracy', 'pp'];

  const s = sort.value;
  const rows = [...table.rows];
  if (s) {
    rows.sort((a, b) => compareValues(valueFor(a, s.key), valueFor(b, s.key), s.dir));
  }

  return (
    <div class="table-wrap">
      <table class="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((key) => (
              <th
                key={key}
                scope="col"
                aria-sort={s?.key === key ? (s.dir === 1 ? 'ascending' : 'descending') : undefined}
              >
                <button
                  type="button"
                  class="sort-button"
                  onClick$={() => {
                    if (sort.value?.key === key) {
                      sort.value = { key, dir: sort.value.dir === 1 ? -1 : 1 };
                    } else {
                      sort.value = { key, dir: 1 };
                    }
                  }}
                >
                  {COLUMN_LABELS[key]}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.move}-${r.level}-${i}`}>
              {table.showLevel && <td>{r.level}</td>}
              <td>
                <a href={`/moves/${r.move}`}>{r.moveLabel}</a>
              </td>
              <td>
                {r.typeName ? (
                  <a class={`type-badge type-${r.typeName}`} href={`/types/${r.typeName}`}>
                    {r.typeLabel}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td>{r.category}</td>
              <td>{r.power ?? '—'}</td>
              <td>{r.accuracy ?? '—'}</td>
              <td>{r.pp ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
