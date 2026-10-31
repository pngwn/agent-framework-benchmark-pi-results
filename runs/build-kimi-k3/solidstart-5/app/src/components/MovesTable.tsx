import { A } from "@solidjs/router";
import { createMemo, createSignal, For } from "solid-js";
import { dash } from "~/lib/format";

export type MoveRow = {
  level: number;
  move: string;
  moveEn: string;
  type: string;
  typeEn: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MoveTableData = {
  method: string;
  methodEn: string;
  hasLevel: boolean;
  rows: MoveRow[];
};

type SortDir = "ascending" | "descending";

/** One learn-method table with sortable column headers. */
export default function MovesTable(props: { table: MoveTableData }) {
  const [sort, setSort] = createSignal<{ key: string; dir: SortDir } | null>(null);

  const cols = () => [
    ...(props.table.hasLevel ? [{ key: "level", label: "Level" }] : []),
    { key: "move", label: "Move" },
    { key: "type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "power", label: "Power" },
    { key: "accuracy", label: "Accuracy" },
    { key: "pp", label: "PP" },
  ];

  const value = (row: MoveRow, key: string): string | number | null =>
    key === "move" ? row.moveEn : key === "type" ? row.typeEn : (row as any)[key];

  const rows = createMemo(() => {
    const s = sort();
    if (!s) return props.table.rows;
    const sign = s.dir === "ascending" ? 1 : -1;
    return [...props.table.rows].sort((a, b) => {
      const av = value(a, s.key);
      const bv = value(b, s.key);
      // Missing values sort last in both directions.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
      return String(av).localeCompare(String(bv)) * sign;
    });
  });

  const toggle = (key: string) => {
    const s = sort();
    if (s?.key === key) setSort({ key, dir: s.dir === "ascending" ? "descending" : "ascending" });
    else setSort({ key, dir: "ascending" });
  };

  return (
    <table class="moves-table">
      <caption>{props.table.methodEn}</caption>
      <thead>
        <tr>
          <For each={cols()}>
            {(col) => (
              <th aria-sort={sort()?.key === col.key ? sort()!.dir : "none"}>
                <button type="button" onClick={() => toggle(col.key)}>
                  {col.label}
                </button>
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={rows()}>
          {(row) => (
            <tr>
              {props.table.hasLevel && <td>{row.level}</td>}
              <td>
                <A href={`/moves/${row.move}`}>{row.moveEn}</A>
              </td>
              <td>
                <A class={`type-badge type-${row.type}`} href={`/types/${row.type}`}>
                  {row.typeEn}
                </A>
              </td>
              <td>{row.category}</td>
              <td>{dash(row.power)}</td>
              <td>{dash(row.accuracy)}</td>
              <td>{dash(row.pp)}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
