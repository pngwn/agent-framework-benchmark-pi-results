import { useState } from "react";
import { Link, data, useLocation, useNavigate } from "react-router";
import type { Route } from "./+types/pokemon";
import { getPokemonPage } from "../lib/data.server";
import type { EvolutionNode, MoveRow, MoveTableData } from "../lib/data.server";
import { NotFound, Section, TypeBadgeLink } from "../components/ui";
import { MISSING, dexNumber, humanize } from "../lib/format";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.displayName} – Pokédex` : "Not found – Pokédex" },
];

export async function loader({ params, request }: Route.LoaderArgs) {
  const game = new URL(request.url).searchParams.get("game");
  const page = await getPokemonPage(params.name, game);
  if (!page) throw data(null, { status: 404 });
  return page;
}

export function ErrorBoundary() {
  return <NotFound />;
}

function StatBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="stat-track" aria-hidden="true">
      <div className="stat-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function EvolutionTree({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <EvolutionTree key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type SortKey = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";

interface SortState {
  key: SortKey;
  direction: "ascending" | "descending";
}

function rowValue(row: MoveRow, key: SortKey): string | number | null {
  switch (key) {
    case "level":
      return row.level;
    case "move":
      return row.label;
    case "type":
      return row.type.label;
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

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function MovesTable({ table }: { table: MoveTableData }) {
  const [sort, setSort] = useState<SortState | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "ascending" };
      return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
    });
  };

  const rows = sort
    ? [...table.rows].sort((a, b) => {
        const av = rowValue(a, sort.key);
        const bv = rowValue(b, sort.key);
        // Missing values sort last in both directions.
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        const result = compareValues(av, bv);
        return sort.direction === "ascending" ? result : -result;
      })
    : table.rows;

  const columns: Array<{ key: SortKey; label: string }> = [
    ...(table.levelUp ? [{ key: "level" as SortKey, label: "Level" }] : []),
    { key: "move", label: "Move" },
    { key: "type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "power", label: "Power" },
    { key: "accuracy", label: "Accuracy" },
    { key: "pp", label: "PP" },
  ];

  return (
    <table className="moves-table">
      <caption>{table.label}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              aria-sort={sort?.key === column.key ? sort.direction : undefined}
            >
              <button type="button" className="sort-button" onClick={() => toggleSort(column.key)}>
                {column.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.name}-${row.level ?? ""}`}>
            {table.levelUp ? <td>{row.level ?? MISSING}</td> : null}
            <td>
              <Link to={`/moves/${row.name}`}>{row.label}</Link>
            </td>
            <td>
              <TypeBadgeLink type={row.type} />
            </td>
            <td>{row.category}</td>
            <td>{row.power ?? MISSING}</td>
            <td>{row.accuracy ?? MISSING}</td>
            <td>{row.pp ?? MISSING}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Pokemon({ loaderData }: Route.ComponentProps) {
  const page = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <div className="hero surface">
        <div className="hero-top">
          {page.artwork ? (
            <img className="artwork" src={page.artwork} alt={page.displayName} width={288} height={288} />
          ) : null}
          <div className="hero-info">
            <p className="dex-number">{dexNumber(page.dexId)}</p>
            <h1>{page.displayName}</h1>
            <p className="genus">{page.genus}</p>
            <p className="hero-types">
              {page.types.map((t) => (
                <TypeBadgeLink key={t.name} type={t} />
              ))}
            </p>
            <dl className="fact-list">
              <div>
                <dt>Height</dt>
                <dd>{page.height} m</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{page.weight} kg</dd>
              </div>
            </dl>
          </div>
        </div>
        {page.flavorText ? <p className="flavor-text">{page.flavorText}</p> : null}
      </div>

      <Section id="base-stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {page.stats.map((stat: any) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td className="stat-value">{stat.value}</td>
                <td className="stat-bar">
                  <StatBar value={stat.value} max={255} />
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{page.total}</td>
              <td className="stat-bar">
                <StatBar value={page.total} max={255 * page.stats.length || 1} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {page.abilities.map((ability) => (
            <li key={ability.name}>
              <Link to={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? <span className="hidden-note"> (hidden)</span> : null}
            </li>
          ))}
        </ul>
      </Section>

      {page.evolution ? (
        <Section id="evolution" title="Evolution">
          <ul className="evolution-tree">
            <EvolutionTree node={page.evolution} />
          </ul>
        </Section>
      ) : null}

      <Section id="moves" title="Moves">
        <div className="game-picker">
          <label htmlFor="game">Game</label>
          <select
            id="game"
            value={page.selectedGame ?? ""}
            onChange={(event) =>
              navigate(`?game=${encodeURIComponent(event.target.value)}${location.hash}`)
            }
          >
            {page.games.map((game) => (
              <option key={game.name} value={game.name}>
                {game.label}
              </option>
            ))}
          </select>
        </div>
        {page.moveTables.map((table) => (
          <MovesTable key={table.method} table={table} />
        ))}
      </Section>
    </>
  );
}
