import { A } from "@solidjs/router";
import { createMemo, createSignal, For } from "solid-js";
import { displayValue } from "~/lib/format";
import type { MoveRowData, MoveTableData } from "~/lib/queries";
import TypeBadge from "./TypeBadge";

type SortState = { key: string; dir: "ascending" | "descending" } | null;

function isMissing(value: unknown): boolean {
  return value == null || value === "";
}

function sortRows(rows: MoveRowData[], sort: SortState): MoveRowData[] {
  if (!sort) return rows;
  const direction = sort.dir === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const valueA = a[sort.key as keyof MoveRowData];
    const valueB = b[sort.key as keyof MoveRowData];
    const missingA = isMissing(valueA);
    const missingB = isMissing(valueB);
    if (missingA && missingB) return 0;
    if (missingA) return 1;
    if (missingB) return -1;
    if (typeof valueA === "number" && typeof valueB === "number") {
      return (valueA - valueB) * direction;
    }
    return String(valueA).localeCompare(String(valueB)) * direction;
  });
}

export default function MoveTable(props: { table: MoveTableData }) {
  const [sort, setSort] = createSignal<SortState>(null);
  const rows = createMemo(() => sortRows(props.table.rows, sort()));

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          dir: current.dir === "ascending" ? "descending" : "ascending",
        };
      }
      return { key, dir: "ascending" };
    });
  };

  const ariaSort = (key: string) => (sort()?.key === key ? sort()!.dir : undefined);

  return (
    <table class="moves-table">
      <caption>{props.table.label}</caption>
      <thead>
        <tr>
          <For each={props.table.columns}>
            {(column) => (
              <th scope="col" aria-sort={ariaSort(column.key)}>
                <button type="button" onClick={() => toggleSort(column.key)}>
                  {column.label}
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
              <For each={props.table.columns}>
                {(column) => {
                  if (column.key === "level") return <td>{displayValue(row.level)}</td>;
                  if (column.key === "move") {
                    return (
                      <td>
                        <A href={`/moves/${row.moveName}`}>{row.moveLabel}</A>
                      </td>
                    );
                  }
                  if (column.key === "type") {
                    return (
                      <td>
                        {row.typeName ? (
                          <TypeBadge name={row.typeName} label={row.typeLabel} link />
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  }
                  if (column.key === "category") {
                    return <td>{row.categoryLabel || "—"}</td>;
                  }
                  if (column.key === "power") return <td>{displayValue(row.power)}</td>;
                  if (column.key === "accuracy") return <td>{displayValue(row.accuracy)}</td>;
                  return <td>{displayValue(row.pp)}</td>;
                }}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
