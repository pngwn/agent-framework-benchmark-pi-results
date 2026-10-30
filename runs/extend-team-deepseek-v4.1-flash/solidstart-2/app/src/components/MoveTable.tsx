import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";
import { show } from "~/lib/format";
import type { MoveRow } from "~/lib/types";
import { TypeLink } from "./TypeBadge";

type Key = "level" | "label" | "type" | "category" | "power" | "accuracy" | "pp";
type Direction = "ascending" | "descending";

const COLUMNS: { key: Key; label: string; numeric?: boolean }[] = [
  { key: "level", label: "Level", numeric: true },
  { key: "label", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power", numeric: true },
  { key: "accuracy", label: "Accuracy", numeric: true },
  { key: "pp", label: "PP", numeric: true },
];

const valueOf = (row: MoveRow, key: Key): string | number | null => {
  if (key === "type") return row.type.label;
  const value = row[key];
  return value === "" ? null : value;
};

export default function MoveTable(props: { caption: string; rows: MoveRow[]; showLevel: boolean }) {
  const [sort, setSort] = createSignal<{ key: Key; dir: Direction } | null>(null);
  const columns = () => COLUMNS.filter((c) => props.showLevel || c.key !== "level");

  const rows = createMemo(() => {
    const current = sort();
    if (!current) return props.rows;
    const factor = current.dir === "ascending" ? 1 : -1;
    return [...props.rows].sort((a, b) => {
      const x = valueOf(a, current.key);
      const y = valueOf(b, current.key);
      // Missing values go last whichever way the column is sorted.
      if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1;
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return cmp * factor || a.label.localeCompare(b.label);
    });
  });

  const toggle = (key: Key) => {
    const current = sort();
    setSort({ key, dir: current?.key === key && current.dir === "ascending" ? "descending" : "ascending" });
  };

  return (
    <div class="table-scroll">
      <table class="move-table">
        <caption>{props.caption}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {(column) => {
                const dir = () => (sort()?.key === column.key ? sort()!.dir : undefined);
                return (
                  <th scope="col" aria-sort={dir()}>
                    <button type="button" class="sort-button" onClick={() => toggle(column.key)}>
                      {column.label}
                      <Show when={dir()}>
                        <span class="sort-indicator" aria-hidden="true">
                          {dir() === "ascending" ? "▲" : "▼"}
                        </span>
                      </Show>
                    </button>
                  </th>
                );
              }}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(row) => (
              <tr>
                <Show when={props.showLevel}>
                  <td>{show(row.level)}</td>
                </Show>
                <td>
                  <A href={`/moves/${row.name}`}>{row.label}</A>
                </td>
                <td>
                  <TypeLink type={row.type} />
                </td>
                <td>{show(row.category)}</td>
                <td>{show(row.power)}</td>
                <td>{show(row.accuracy)}</td>
                <td>{show(row.pp)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
