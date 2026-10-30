import { useMemo, useState } from "react";
import { Link } from "react-router";
import { orMissing } from "../lib/format";
import type { TypeInfo } from "../lib/types";
import { TypeBadge } from "./TypeBadge";

export type MoveRow = {
  name: string;
  label: string;
  level: number | null;
  type: TypeInfo | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

type Column = {
  key: string;
  label: string;
  value: (row: MoveRow) => number | string | null;
};

const COLUMNS: Column[] = [
  { key: "level", label: "Level", value: (r) => r.level },
  { key: "move", label: "Move", value: (r) => r.label },
  { key: "type", label: "Type", value: (r) => r.type?.label ?? null },
  { key: "category", label: "Category", value: (r) => r.category },
  { key: "power", label: "Power", value: (r) => r.power },
  { key: "accuracy", label: "Accuracy", value: (r) => r.accuracy },
  { key: "pp", label: "PP", value: (r) => r.pp },
];

type Sort = { key: string; direction: "ascending" | "descending" };

function compare(a: number | string, b: number | string): number {
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
}

type Props = { caption: string; rows: MoveRow[]; showLevel: boolean };

export function MoveTable({ caption, rows, showLevel }: Props) {
  const columns = showLevel ? COLUMNS : COLUMNS.filter((c) => c.key !== "level");
  const [sort, setSort] = useState<Sort | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key)!;
    const sign = sort.direction === "ascending" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = column.value(a);
      const vb = column.value(b);
      // Missing values go last in both directions.
      if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
      return sign * compare(va, vb) || a.label.localeCompare(b.label);
    });
  }, [rows, sort]);

  const toggle = (key: string) =>
    setSort((current) => ({
      key,
      direction: current?.key === key && current.direction === "ascending" ? "descending" : "ascending",
    }));

  return (
    <div className="table-scroll">
      <table className="moves">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? sort.direction : undefined}>
                <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                  {c.label}
                  {sort?.key === c.key && (
                    <span className="sort-indicator" aria-hidden="true">
                      {sort.direction === "ascending" ? "▲" : "▼"}
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={`${row.name}-${row.level ?? ""}-${i}`}>
              {showLevel && <td>{orMissing(row.level)}</td>}
              <td>
                <Link to={`/moves/${row.name}`}>{row.label}</Link>
              </td>
              <td>{row.type ? <TypeBadge {...row.type} link /> : "—"}</td>
              <td>{orMissing(row.category)}</td>
              <td>{orMissing(row.power)}</td>
              <td>{orMissing(row.accuracy)}</td>
              <td>{orMissing(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
