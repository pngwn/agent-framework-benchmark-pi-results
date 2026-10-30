import { A } from "@solidjs/router";
import { For, createEffect, createMemo, createSignal, on } from "solid-js";
import { displayValue, typeLabel } from "~/lib/format";

export interface MoveRow {
  moveName: string;
  moveApiName: string;
  level: number;
  type: { name: string; label: string } | null;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type SortKey = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";
type Direction = "ascending" | "descending";

export default function MoveTable(props: {
  label: string;
  rows: MoveRow[];
  includeLevel: boolean;
}) {
  const [sortKey, setSortKey] = createSignal<SortKey | null>(null);
  const [direction, setDirection] = createSignal<Direction>("ascending");

  createEffect(
    on(
      () => props.rows,
      () => {
        setSortKey(null);
        setDirection("ascending");
      },
      { defer: true },
    ),
  );

  const columns = () => {
    const cols: { key: SortKey; label: string }[] = [];
    if (props.includeLevel) cols.push({ key: "level", label: "Level" });
    cols.push(
      { key: "move", label: "Move" },
      { key: "type", label: "Type" },
      { key: "category", label: "Category" },
      { key: "power", label: "Power" },
      { key: "accuracy", label: "Accuracy" },
      { key: "pp", label: "PP" },
    );
    return cols;
  };

  const valueFor = (row: MoveRow, key: SortKey): string | number | null => {
    switch (key) {
      case "level":
        return row.level;
      case "move":
        return row.moveName;
      case "type":
        return row.type?.label ?? null;
      case "category":
        return row.category === "—" ? null : row.category;
      case "power":
        return row.power;
      case "accuracy":
        return row.accuracy;
      case "pp":
        return row.pp;
    }
  };

  const toggle = (key: SortKey) => {
    if (sortKey() === key) {
      setDirection((d) => (d === "ascending" ? "descending" : "ascending"));
    } else {
      setSortKey(key);
      setDirection("ascending");
    }
  };

  const sortedRows = createMemo(() => {
    const rows = props.rows.slice();
    const key = sortKey();
    if (!key) {
      rows.sort((a, b) => {
        if (props.includeLevel) {
          const level = a.level - b.level;
          if (level !== 0) return level;
        }
        return a.moveName.localeCompare(b.moveName);
      });
      return rows;
    }

    const dir = direction();
    rows.sort((a, b) => {
      const av = valueFor(a, key);
      const bv = valueFor(b, key);
      const am = av === null || av === "";
      const bm = bv === null || bv === "";
      if (am && bm) return a.moveName.localeCompare(b.moveName);
      if (am) return 1;
      if (bm) return -1;
      let result: number;
      if (typeof av === "number" && typeof bv === "number") {
        result = av - bv;
      } else {
        result = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
      }
      if (dir === "descending") result = -result;
      return result || a.moveName.localeCompare(b.moveName);
    });
    return rows;
  });

  return (
    <table class="move-table">
      <caption>{props.label}</caption>
      <thead>
        <tr>
          <For each={columns()}>
            {(column) => (
              <th
                scope="col"
                aria-sort={sortKey() === column.key ? direction() : undefined}
                onClick={() => toggle(column.key)}
              >
                <button
                  type="button"
                  class="sort-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(column.key);
                  }}
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
          {(row) => (
            <tr>
              {props.includeLevel && <td>{row.level}</td>}
              <td>
                <A href={`/moves/${row.moveApiName}`}>{row.moveName}</A>
              </td>
              <td>
                {row.type ? (
                  <A href={`/types/${row.type.name}`} class={`type-badge type-${row.type.name}`}>
                    {typeLabel(row.type.name)}
                  </A>
                ) : (
                  "—"
                )}
              </td>
              <td>{row.category}</td>
              <td>{displayValue(row.power)}</td>
              <td>{displayValue(row.accuracy)}</td>
              <td>{displayValue(row.pp)}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
