import { component$, useSignal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { displayMissing } from "../lib/format";
import { TypeBadge } from "./TypeBadge";

export interface MoveRowData {
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type SortKey =
  | "level"
  | "move"
  | "type"
  | "category"
  | "power"
  | "accuracy"
  | "pp";

interface Column {
  key: SortKey;
  label: string;
}

const COLUMNS: Column[] = [
  { key: "level", label: "Level" },
  { key: "move", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

function valueFor(row: MoveRowData, key: SortKey): string | number | null {
  switch (key) {
    case "level":
      return row.level;
    case "move":
      return row.moveLabel;
    case "type":
      return row.typeLabel;
    case "category":
      return row.category;
    case "power":
      return row.power;
    case "accuracy":
      return row.accuracy;
    case "pp":
      return row.pp;
  }
}

function isMissing(value: string | number | null): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

export const MoveTable = component$<{
  label: string;
  showLevel: boolean;
  rows: MoveRowData[];
}>((props) => {
  const sortKey = useSignal<SortKey>(props.showLevel ? "level" : "move");
  const sortDirection = useSignal<"ascending" | "descending">("ascending");
  const columns = props.showLevel
    ? COLUMNS
    : COLUMNS.filter((column) => column.key !== "level");

  const sortedRows = [...props.rows].sort((a, b) => {
    const key = sortKey.value;
    const aValue = valueFor(a, key);
    const bValue = valueFor(b, key);
    const aMissing = isMissing(aValue);
    const bMissing = isMissing(bValue);

    if (aMissing || bMissing) {
      if (aMissing && bMissing) return a.moveLabel.localeCompare(b.moveLabel);
      return aMissing ? 1 : -1;
    }

    let comparison = 0;
    if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    if (comparison === 0) {
      return a.moveLabel.localeCompare(b.moveLabel);
    }
    return sortDirection.value === "ascending" ? comparison : -comparison;
  });

  return (
    <div className="table-scroll">
      <table className="moves-table">
        <caption>{props.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const sorted = sortKey.value === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  data-sort-key={column.key}
                  aria-sort={sorted ? sortDirection.value : undefined}
                >
                  <button type="button">{column.label}</button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={`${row.moveName}-${row.level}-${index}`}>
              {props.showLevel ? (
                <td
                  data-key="level"
                  data-numeric="1"
                  data-sort-value={row.level ?? ""}
                  data-missing={row.level == null ? "1" : undefined}
                >
                  {displayMissing(row.level)}
                </td>
              ) : null}
              <td data-key="move" data-sort-value={row.moveLabel}>
                <Link href={`/moves/${row.moveName}`}>{row.moveLabel}</Link>
              </td>
              <td data-key="type" data-sort-value={row.typeLabel}>
                <TypeBadge
                  name={row.typeName}
                  label={row.typeLabel}
                  link
                />
              </td>
              <td data-key="category" data-sort-value={row.category}>
                {row.category}
              </td>
              <td
                data-key="power"
                data-numeric="1"
                data-sort-value={row.power ?? ""}
                data-missing={row.power == null ? "1" : undefined}
              >
                {displayMissing(row.power)}
              </td>
              <td
                data-key="accuracy"
                data-numeric="1"
                data-sort-value={row.accuracy ?? ""}
                data-missing={row.accuracy == null ? "1" : undefined}
              >
                {displayMissing(row.accuracy)}
              </td>
              <td
                data-key="pp"
                data-numeric="1"
                data-sort-value={row.pp ?? ""}
                data-missing={row.pp == null ? "1" : undefined}
              >
                {displayMissing(row.pp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
