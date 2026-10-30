import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { humanize } from "~/lib/format";
import { TypeBadge } from "./TypeBadge";

export type MoveRow = {
  id: number;
  method: string;
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MoveTableData = {
  method: string;
  label: string;
  rows: MoveRow[];
};

type Props = {
  games: Array<{ name: string; label: string; order: number }>;
  selectedGame: string;
  tables: MoveTableData[];
};

const FIXED_METHODS = ["level-up", "machine", "egg", "tutor"];

export function MovesSection({ games, selectedGame, tables }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (window.location.hash === "#moves") {
      const target = document.getElementById("moves");
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    }
  }, []);

  function changeGame(value: string) {
    const params = new URLSearchParams(location.search);
    params.set("game", value);
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash },
      { preventScrollReset: true },
    );
  }

  return (
    <section id="moves" className="panel" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div className="game-field">
        <label htmlFor="game-select">Game</label>
        <select id="game-select" value={selectedGame} onChange={(event) => changeGame(event.target.value)}>
          {games.map((game) => (
            <option key={game.name} value={game.name}>
              {game.label}
            </option>
          ))}
        </select>
      </div>
      {tables.map((table) => (
        <MoveTable key={`${selectedGame}-${table.method}`} table={table} />
      ))}
    </section>
  );
}

type ColumnKey = "level" | "moveLabel" | "typeLabel" | "category" | "power" | "accuracy" | "pp";

type Column = {
  key: ColumnKey;
  label: string;
};

const LEVEL_COLUMNS: Column[] = [
  { key: "level", label: "Level" },
  { key: "moveLabel", label: "Move" },
  { key: "typeLabel", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
];

const OTHER_COLUMNS: Column[] = LEVEL_COLUMNS.filter((column) => column.key !== "level");

function MoveTable({ table }: { table: MoveTableData }) {
  const [sort, setSort] = useState<{ key: ColumnKey; direction: "ascending" | "descending" } | null>(null);
  const columns = table.method === "level-up" ? LEVEL_COLUMNS : OTHER_COLUMNS;

  const rows = [...table.rows];
  if (sort) {
    rows.sort((a, b) => compareRows(a, b, sort.key, sort.direction));
  } else if (table.method === "level-up") {
    rows.sort((a, b) => {
      const byLevel = (a.level ?? 0) - (b.level ?? 0);
      return byLevel !== 0 ? byLevel : a.moveLabel.localeCompare(b.moveLabel);
    });
  } else {
    rows.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
  }

  function clickColumn(column: Column) {
    setSort((current) => {
      if (current?.key === column.key) {
        return {
          key: column.key,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        };
      }
      return { key: column.key, direction: "ascending" };
    });
  }

  return (
    <div className="move-table-block">
      <h3>{table.label}</h3>
      <div className="table-scroll">
        <table className="move-table">
          <caption className="sr-only">{table.label}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sort?.key === column.key ? sort.direction : undefined}
                >
                  <button type="button" className="sort-button" onClick={() => clickColumn(column)}>
                    {column.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.id}-${row.method}`}>
                {columns.map((column) => (
                  <Cell key={column.key} row={row} column={column.key} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ row, column }: { row: MoveRow; column: ColumnKey }) {
  if (column === "level") return <td>{row.level === null ? "—" : row.level}</td>;
  if (column === "moveLabel") {
    return (
      <td>
        <Link to={`/moves/${row.moveName}`}>{row.moveLabel}</Link>
      </td>
    );
  }
  if (column === "typeLabel") {
    return (
      <td>
        <TypeBadge name={row.typeName} label={row.typeLabel} link />
      </td>
    );
  }
  if (column === "category") return <td>{row.category}</td>;
  if (column === "power") return <td>{row.power === null ? "—" : row.power}</td>;
  if (column === "accuracy") return <td>{row.accuracy === null ? "—" : row.accuracy}</td>;
  return <td>{row.pp === null ? "—" : row.pp}</td>;
}

function compareRows(
  a: MoveRow,
  b: MoveRow,
  key: ColumnKey,
  direction: "ascending" | "descending",
) {
  const av = a[key];
  const bv = b[key];

  if (av === null && bv === null) return a.moveLabel.localeCompare(b.moveLabel);
  if (av === null) return 1;
  if (bv === null) return -1;

  let result: number;
  if (typeof av === "number" && typeof bv === "number") result = av - bv;
  else result = String(av).localeCompare(String(bv));

  if (result === 0) result = a.moveLabel.localeCompare(b.moveLabel);
  return direction === "ascending" ? result : -result;
}

export function orderMoveTables(rows: MoveRow[]): MoveTableData[] {
  const methods = Array.from(new Set(rows.map((row) => row.method)));
  methods.sort((a, b) => {
    const ai = FIXED_METHODS.indexOf(a);
    const bi = FIXED_METHODS.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  return methods.map((method) => ({
    method,
    label: humanize(method),
    rows: rows.filter((row) => row.method === method),
  }));
}
