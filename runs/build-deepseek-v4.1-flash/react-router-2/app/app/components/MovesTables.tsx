import { useState } from "react";
import { Link } from "react-router";
import { displayMissing } from "../lib/format";
import { TypeBadge } from "./TypeBadge";

type MoveRow = {
  level: number | null;
  moveName: string;
  moveDisplay: string;
  moveType: string;
  typeEnglish: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type MoveTable = {
  method: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
};

type SortState = { key: string; direction: "ascending" | "descending" } | null;

type Column = {
  key: string;
  label: string;
  value: (row: MoveRow) => string | number | null;
  numeric?: boolean;
};

const COLUMNS: Record<string, any> = {
  level: { key: "level", label: "Level", value: (row: MoveRow) => row.level, numeric: true },
  move: { key: "move", label: "Move", value: (row: MoveRow) => row.moveDisplay },
  type: { key: "type", label: "Type", value: (row: MoveRow) => row.typeEnglish },
  category: { key: "category", label: "Category", value: (row: MoveRow) => row.category },
  power: { key: "power", label: "Power", value: (row: MoveRow) => row.power, numeric: true },
  accuracy: { key: "accuracy", label: "Accuracy", value: (row: MoveRow) => row.accuracy, numeric: true },
  pp: { key: "pp", label: "PP", value: (row: MoveRow) => row.pp, numeric: true },
};

function compareRows(a: MoveRow, b: MoveRow, column: Column, direction: "ascending" | "descending") {
  const aValue = column.value(a);
  const bValue = column.value(b);
  const aMissing = aValue === null || aValue === undefined || aValue === "";
  const bMissing = bValue === null || bValue === undefined || bValue === "";
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }
  if (typeof aValue === "number" && typeof bValue === "number") {
    return direction === "ascending" ? aValue - bValue : bValue - aValue;
  }
  const result = String(aValue).localeCompare(String(bValue));
  return direction === "ascending" ? result : -result;
}

function MoveTable({ table }: { table: MoveTable }) {
  const [sort, setSort] = useState<SortState>(null);
  const columns: Column[] = table.hasLevel
    ? [COLUMNS.level, COLUMNS.move, COLUMNS.type, COLUMNS.category, COLUMNS.power, COLUMNS.accuracy, COLUMNS.pp]
    : [COLUMNS.move, COLUMNS.type, COLUMNS.category, COLUMNS.power, COLUMNS.accuracy, COLUMNS.pp];

  const rows = sort
    ? [...table.rows].sort((a, b) =>
        compareRows(a, b, columns.find((column) => column.key === sort.key) ?? columns[0], sort.direction),
      )
    : table.rows;

  function handleSort(key: string) {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        };
      }
      return { key, direction: "ascending" };
    });
  }

  return (
    <div className="table-block">
      <div className="table-scroll">
        <table className="move-table">
          <caption className="move-table-caption">{table.label}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? sort.direction : undefined}
                    className={`move-col-${column.key}`}
                  >
                    <button type="button" onClick={() => handleSort(column.key)}>
                      {column.label}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.moveName}-${row.level ?? "none"}-${index}`}>
                {table.hasLevel ? <td>{displayMissing(row.level)}</td> : null}
                <td>
                  <Link to={`/moves/${row.moveName}`}>{row.moveDisplay}</Link>
                </td>
                <td>
                  <TypeBadge name={row.moveType} label={row.typeEnglish} to={`/types/${row.moveType}`} small />
                </td>
                <td>{row.category}</td>
                <td>{displayMissing(row.power)}</td>
                <td>{displayMissing(row.accuracy)}</td>
                <td>{displayMissing(row.pp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MovesTables({ tables }: { tables: MoveTable[] }) {
  return (
    <>
      {tables.map((table) => (
        <MoveTable key={table.method} table={table} />
      ))}
    </>
  );
}
