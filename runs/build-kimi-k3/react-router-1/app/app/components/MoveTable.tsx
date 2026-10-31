import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EM_DASH } from "../lib/format";
import { TypeBadgeLink } from "./TypeBadge";

export interface MoveRow {
  level: number | null;
  move: string;
  moveLabel: string;
  type: string | null;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type SortDir = "ascending" | "descending";

interface Column {
  key: keyof MoveRow;
  label: string;
  numeric: boolean;
}

function compareValues(a: unknown, b: unknown, numeric: boolean, dir: SortDir): number {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  // Missing values always sort last, in both directions.
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  const result = numeric
    ? (a as number) - (b as number)
    : String(a).localeCompare(String(b));
  return dir === "ascending" ? result : -result;
}

/**
 * A table of moves for one learn method, with sortable column headers.
 */
export function MoveTable({ label, hasLevel, rows }: { label: string; hasLevel: boolean; rows: MoveRow[] }) {
  const [sort, setSort] = useState<{ key: keyof MoveRow; dir: SortDir } | null>(null);

  const columns: Column[] = useMemo(
    () => [
      ...(hasLevel ? [{ key: "level" as const, label: "Level", numeric: true }] : []),
      { key: "moveLabel", label: "Move", numeric: false },
      { key: "typeLabel", label: "Type", numeric: false },
      { key: "category", label: "Category", numeric: false },
      { key: "power", label: "Power", numeric: true },
      { key: "accuracy", label: "Accuracy", numeric: true },
      { key: "pp", label: "PP", numeric: true },
    ],
    [hasLevel],
  );

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    return [...rows].sort((a, b) => compareValues(a[sort.key], b[sort.key], column.numeric, sort.dir));
  }, [rows, sort, columns]);

  function toggleSort(column: Column) {
    setSort((prev) =>
      prev?.key === column.key
        ? { key: column.key, dir: prev.dir === "ascending" ? "descending" : "ascending" }
        : { key: column.key, dir: "ascending" },
    );
  }

  const num = (v: number | null) => (v === null || v === undefined ? EM_DASH : String(v));

  return (
    <table className="move-table">
      <caption>{label}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              aria-sort={sort?.key === column.key ? sort.dir : undefined}
              className={column.numeric ? "num" : undefined}
            >
              <button type="button" className="sort-button" onClick={() => toggleSort(column)}>
                {column.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, i) => (
          <tr key={`${row.move}-${i}`}>
            {hasLevel ? <td className="num">{num(row.level)}</td> : null}
            <td>
              <Link to={`/moves/${row.move}`}>{row.moveLabel}</Link>
            </td>
            <td>{row.type ? <TypeBadgeLink name={row.type} label={row.typeLabel} /> : EM_DASH}</td>
            <td>{row.category}</td>
            <td className="num">{num(row.power)}</td>
            <td className="num">{num(row.accuracy)}</td>
            <td className="num">{num(row.pp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
