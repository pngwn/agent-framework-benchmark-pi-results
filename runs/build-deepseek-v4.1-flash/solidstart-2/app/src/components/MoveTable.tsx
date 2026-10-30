import { For, createMemo, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { displayValue } from "~/lib/format";
import type { MoveRowData, MoveTableData } from "~/lib/types";
import TypeBadge from "./TypeBadge";

type SortKey = "level" | "moveName" | "typeLabel" | "category" | "power" | "accuracy" | "pp";
type SortDirection = "ascending" | "descending";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

function compareNumbers(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "ascending" ? a - b : b - a;
}

function compareStrings(a: string, b: string, direction: SortDirection): number {
  const result = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "ascending" ? result : -result;
}

export default function MoveTable(props: { table: MoveTableData }) {
  const isLevelUp = () => props.table.name === "level-up";
  const [sort, setSort] = createSignal<SortState | null>(null);

  const columns = createMemo(() => {
    const result: Array<{ key: SortKey; label: string }> = [];
    if (isLevelUp()) result.push({ key: "level", label: "Level" });
    result.push(
      { key: "moveName", label: "Move" },
      { key: "typeLabel", label: "Type" },
      { key: "category", label: "Category" },
      { key: "power", label: "Power" },
      { key: "accuracy", label: "Accuracy" },
      { key: "pp", label: "PP" },
    );
    return result;
  });

  const sortedRows = createMemo(() => {
    const rows = [...props.table.rows];
    const state = sort();
    if (!state) {
      rows.sort((a, b) => {
        if (isLevelUp() && a.level !== b.level) return a.level - b.level;
        return a.moveName.localeCompare(b.moveName, undefined, { sensitivity: "base" });
      });
      return rows;
    }

    rows.sort((a, b) => {
      const { key, direction } = state;
      if (key === "level") {
        const result = compareNumbers(a.level, b.level, direction);
        if (result !== 0) return result;
        return a.moveName.localeCompare(b.moveName, undefined, { sensitivity: "base" });
      }
      if (key === "power" || key === "accuracy" || key === "pp") {
        const result = compareNumbers(a[key], b[key], direction);
        if (result !== 0) return result;
        return a.moveName.localeCompare(b.moveName, undefined, { sensitivity: "base" });
      }
      return compareStrings(a[key], b[key], direction);
    });
    return rows;
  });

  const sortBy = (key: SortKey) => {
    const current = sort();
    if (current?.key === key) {
      setSort({
        key,
        direction: current.direction === "ascending" ? "descending" : "ascending",
      });
    } else {
      setSort({ key, direction: "ascending" });
    }
  };

  return (
    <div class="move-table-wrap">
      <table class="move-table">
        <caption>{props.table.label}</caption>
        <thead>
          <tr>
            <For each={columns()}>
              {(column) => (
                <th
                  scope="col"
                  aria-sort={
                    sort()?.key === column.key ? sort()!.direction : "none"
                  }
                >
                  <button
                    type="button"
                    class="sort-button"
                    onClick={() => sortBy(column.key)}
                  >
                    {column.label}
                  </button>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={sortedRows()}>
            {(row: MoveRowData) => (
              <tr>
                <Show when={isLevelUp()}>
                  <td class="numeric-cell">{row.level}</td>
                </Show>
                <td>
                  <A class="move-link" href={`/moves/${row.moveApiName}`}>
                    {row.moveName}
                  </A>
                </td>
                <td>
                  <Show
                    when={row.typeName}
                    fallback={<span>{row.typeLabel}</span>}
                  >
                    <TypeBadge
                      name={row.typeName}
                      label={row.typeLabel}
                      link
                    />
                  </Show>
                </td>
                <td>{row.category}</td>
                <td class="numeric-cell">{displayValue(row.power)}</td>
                <td class="numeric-cell">{displayValue(row.accuracy)}</td>
                <td class="numeric-cell">{displayValue(row.pp)}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
