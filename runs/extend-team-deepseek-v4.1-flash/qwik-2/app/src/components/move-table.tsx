import { component$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { MoveRow, MoveTableData } from "~/lib/data";
import { orDash } from "~/lib/format";
import { TypeBadge } from "./ui";

type Key = "level" | "label" | "type" | "category" | "power" | "accuracy" | "pp";

const COLUMNS: { key: Key; label: string }[] = [
  { key: "level", label: "Level" },
  { key: "label", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

const cellValue = (row: MoveRow, key: Key): string | number | null => (key === "type" ? (row.type?.label ?? null) : row[key]);

function sortRows(rows: MoveRow[], key: Key, dir: 1 | -1) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const va = cellValue(a.row, key);
      const vb = cellValue(b.row, key);
      // Missing values always go last, whatever the direction.
      if (va === null || vb === null) return va === vb ? a.index - b.index : va === null ? 1 : -1;
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return cmp * dir || a.index - b.index;
    })
    .map((x) => x.row);
}

export const MoveTable = component$<{ table: MoveTableData }>(({ table }) => {
  const sort = useSignal<{ key: Key; dir: 1 | -1 } | null>(null);
  const columns = table.method === "level-up" ? COLUMNS : COLUMNS.slice(1);
  const rows = sort.value ? sortRows(table.rows, sort.value.key, sort.value.dir) : table.rows;

  return (
    <div class="table-scroll">
      <table class="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort.value?.key === col.key ? sort.value : null;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (active.dir === 1 ? "ascending" : "descending") : undefined}
                >
                  <button
                    type="button"
                    class="sort-button"
                    onClick$={() => {
                      const current = sort.value;
                      sort.value =
                        current?.key === col.key ? { key: col.key, dir: current.dir === 1 ? -1 : 1 } : { key: col.key, dir: 1 };
                    }}
                  >
                    {col.label}
                    <span class="sort-icon" aria-hidden="true">
                      {active ? (active.dir === 1 ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.name}-${row.level}-${i}`}>
              {table.method === "level-up" && <td>{orDash(row.level)}</td>}
              <td>
                <Link href={`/moves/${row.name}`}>{row.label}</Link>
              </td>
              <td>{row.type ? <TypeBadge type={row.type} link /> : "—"}</td>
              <td>{orDash(row.category)}</td>
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
