import { useState } from "react";
import { data, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/pokemon";
import {
  ApiNotFoundError,
  getResource,
  getAllTypes,
  mediaUrl,
} from "../lib/api.server";
import {
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from "../lib/format";
import { NotFound } from "../components/NotFound";
import { TypeBadge } from "../components/TypeBadge";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

type MoveRow = {
  key: string;
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

type MoveTable = {
  method: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
};

type EvolutionNode = { name: string; children: EvolutionNode[] };

function pruneEvolutionChain(node: any): EvolutionNode {
  return {
    name: node.species.name,
    children: (node.evolves_to ?? []).map(pruneEvolutionChain),
  };
}

function notFound() {
  return data({ notFound: true } as const, { status: 404 });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData && "name" in loaderData ? loaderData.name : null;
  const title = loaderData && "notFound" in loaderData && loaderData.notFound ? "Not found" : name ?? "Pokémon";
  return [{ title: `${title} – Pokédex` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  let species: any;
  let pokemon: any;
  try {
    species = await getResource("pokemon-species", params.name);
    pokemon = await getResource("pokemon", species.id);
  } catch (error) {
    if (error instanceof ApiNotFoundError) return notFound();
    throw error;
  }

  const [types, evolutionChain] = await Promise.all([
    getAllTypes(),
    getResource("evolution-chain", idFromUrl(species.evolution_chain?.url)),
  ]);
  const typeLabels = new Map(types.map((entry) => [entry.name, entry.label]));

  const name = englishName(species.names) ?? humanize(species.name);
  const genus = englishName(species.genera, "genus") ?? "";
  const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? "";
  const artwork =
    mediaUrl(pokemon.sprites?.other?.["official-artwork"]?.front_default) ??
    mediaUrl(pokemon.sprites?.other?.home?.front_default) ??
    mediaUrl(pokemon.sprites?.front_default) ??
    "";

  const pokemonTypes = [...(pokemon.types ?? [])]
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => ({
      name: entry.type.name,
      label: typeLabels.get(entry.type.name) ?? humanize(entry.type.name),
    }));

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => ({
      name: entry.ability.name,
      label: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    }));

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat.name,
    label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat as number,
  }));
  const total = stats.reduce((sum: number, stat: any) => sum + stat.value, 0);

  const gameRefs = new Map<string, any>();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (!gameRefs.has(detail.version_group.name)) {
        gameRefs.set(detail.version_group.name, detail.version_group);
      }
    }
  }
  const gameDetails = await Promise.all(
    [...gameRefs.values()].map((ref) => getResource("version-group", ref.name)),
  );
  const games = gameDetails
    .map((game) => ({ name: game.name, label: humanize(game.name), order: game.order ?? 0 }))
    .sort((a, b) => a.order - b.order);
  const requestedGame = url.searchParams.get("game");
  const selectedGame =
    (requestedGame && games.some((game) => game.name === requestedGame) ? requestedGame : null) ??
    games[games.length - 1]?.name ??
    null;

  const learnEntries: {
    moveName: string;
    method: string;
    level: number | null;
    key: string;
  }[] = [];
  if (selectedGame) {
    const seen = new Set<string>();
    for (const moveEntry of pokemon.moves ?? []) {
      for (const detail of moveEntry.version_group_details ?? []) {
        if (detail.version_group.name !== selectedGame) continue;
        const method = detail.move_learn_method.name;
        const key = `${method}:${moveEntry.move.name}:${detail.level_learned_at ?? 0}`;
        if (seen.has(key)) continue;
        seen.add(key);
        learnEntries.push({
          moveName: moveEntry.move.name,
          method,
          level: detail.level_learned_at ?? null,
          key,
        });
      }
    }
  }

  const moveNames = [...new Set(learnEntries.map((entry) => entry.moveName))];
  const moveDetails = await Promise.all(
    moveNames.map((moveName) => getResource("move", moveName)),
  );
  const movesByName = new Map(moveDetails.map((move) => [move.name, move]));

  const rowsByMethod = new Map<string, MoveRow[]>();
  for (const entry of learnEntries) {
    const move = movesByName.get(entry.moveName);
    if (!move) continue;
    const row: MoveRow = {
      key: entry.key,
      level: entry.level,
      moveName: move.name,
      moveLabel: englishName(move.names) ?? humanize(move.name),
      typeName: move.type?.name ?? "",
      typeLabel: typeLabels.get(move.type?.name) ?? humanize(move.type?.name ?? ""),
      category: humanize(move.damage_class?.name ?? ""),
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    };
    const rows = rowsByMethod.get(entry.method) ?? [];
    rows.push(row);
    rowsByMethod.set(entry.method, rows);
  }

  const preferredOrder = ["level-up", "machine", "egg", "tutor"];
  const tables: MoveTable[] = [...rowsByMethod.entries()]
    .map(([method, rows]) => {
      const label = humanize(method);
      const sortedRows =
        method === "level-up"
          ? [...rows].sort(
              (a, b) =>
                (a.level ?? Number.POSITIVE_INFINITY) - (b.level ?? Number.POSITIVE_INFINITY) ||
                a.moveLabel.localeCompare(b.moveLabel),
            )
          : [...rows].sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
      return { method, label, hasLevel: method === "level-up", rows: sortedRows };
    })
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.method);
      const bIndex = preferredOrder.indexOf(b.method);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
          (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
      }
      return a.label.localeCompare(b.label);
    });

  return {
    notFound: false,
    name,
    apiName: species.name,
    id: species.id,
    genus,
    flavor,
    artwork,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types: pokemonTypes,
    abilities,
    stats,
    total,
    evolution: pruneEvolutionChain(evolutionChain.chain),
    games,
    selectedGame,
    tables,
  };
}

const MOVE_COLUMNS = [
  { key: "level", label: "Level" },
  { key: "move", label: "Move" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
] as const;

type SortKey = (typeof MOVE_COLUMNS)[number]["key"];
type SortState = { key: SortKey; direction: "ascending" | "descending" } | null;

function valueFor(row: MoveRow, key: SortKey): string | number | null {
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

function compareRows(a: MoveRow, b: MoveRow, key: SortKey, direction: "ascending" | "descending") {
  const left = valueFor(a, key);
  const right = valueFor(b, key);
  const leftMissing = left === null || left === undefined || left === "";
  const rightMissing = right === null || right === undefined || right === "";
  if (leftMissing && rightMissing) return a.moveLabel.localeCompare(b.moveLabel);
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  let result = 0;
  if (typeof left === "number" && typeof right === "number") result = left - right;
  else result = String(left).localeCompare(String(right));
  if (result === 0) result = a.moveLabel.localeCompare(b.moveLabel);
  return direction === "ascending" ? result : -result;
}

function MovesTable({ table }: { table: MoveTable }) {
  const [sort, setSort] = useState<SortState>(null);
  const columns = MOVE_COLUMNS.filter((column) => column.key !== "level" || table.hasLevel);
  const rows = sort
    ? [...table.rows].sort((a, b) => compareRows(a, b, sort.key, sort.direction))
    : table.rows;

  function changeSort(key: SortKey) {
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
    <div className="moves-table-wrap table-scroll">
      <table className="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const direction = sort?.key === column.key ? sort.direction : "none";
              return (
                <th key={column.key} scope="col" aria-sort={direction}>
                  <button type="button" onClick={() => changeSort(column.key)}>
                    {column.label}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column) => {
                if (column.key === "level") {
                  return <td key={column.key}>{row.level === null ? "—" : row.level}</td>;
                }
                if (column.key === "move") {
                  return (
                    <td key={column.key}>
                      <Link to={`/moves/${row.moveName}`}>{row.moveLabel}</Link>
                    </td>
                  );
                }
                if (column.key === "type") {
                  return (
                    <td key={column.key}>
                      <Link className={`type-badge type-${row.typeName}`} to={`/types/${row.typeName}`}>
                        {row.typeLabel}
                      </Link>
                    </td>
                  );
                }
                if (column.key === "category") {
                  return <td key={column.key}>{row.category}</td>;
                }
                const value = row[column.key];
                return <td key={column.key}>{value === null ? "—" : value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvolutionList({ node }: { node: EvolutionNode }) {
  return (
    <ul className="evolution-list">
      <li>
        <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
        {node.children.length ? <EvolutionListMany nodes={node.children} /> : null}
      </li>
    </ul>
  );
}

function EvolutionListMany({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <ul className="evolution-list">
      {nodes.map((node) => (
        <li key={node.name}>
          <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
          {node.children.length ? <EvolutionListMany nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default function Pokemon({ loaderData }: Route.ComponentProps) {
  if (loaderData.notFound) return <NotFound />;

  const [searchParams, setSearchParams] = useSearchParams();
  const {
    name,
    id,
    genus,
    flavor,
    artwork,
    height,
    weight,
    types,
    abilities,
    stats,
    total,
    evolution,
    games,
    selectedGame,
    tables,
  } = loaderData;

  function selectGame(game: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("game", game);
      return next;
    });
  }

  return (
    <div className="page">
      <div className="pokemon-summary">
        <div className="pokemon-artwork-wrap">
          <img className="pokemon-artwork" src={artwork} alt={name} />
        </div>
        <div>
          <span className="pokemon-dex-number">#{String(id).padStart(4, "0")}</span>
          <h1>{name}</h1>
          <p className="pokemon-genus">{genus}</p>
          <div className="type-badges">
            {types.map((type) => (
              <Link
                key={type.name}
                className={`type-badge type-${type.name}`}
                to={`/types/${type.name}`}
              >
                {type.label}
              </Link>
            ))}
          </div>
          <dl className="pokemon-facts">
            <div>
              <dt>Height</dt>
              <dd>{height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{weight} kg</dd>
            </div>
          </dl>
          <p className="flavor-text">{flavor}</p>
        </div>
      </div>

      <section className="section" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {stats.map((stat: any) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td>
                  <div className="stat-value">
                    <span className="stat-number">{stat.value}</span>
                    <span className="stat-track" aria-hidden="true">
                      <span
                        className="stat-bar"
                        style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%`, display: "block" }}
                      />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{total}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="section" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="simple-list">
          {abilities.map((ability) => (
            <li key={ability.name}>
              <Link to={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? " (hidden)" : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <EvolutionList node={evolution} />
      </section>

      <section id="moves" className="section" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div className="moves-controls">
          <div className="field">
            <label htmlFor="game-select">Game</label>
            <select
              id="game-select"
              value={selectedGame ?? ""}
              onChange={(event) => selectGame(event.target.value)}
            >
              {games.map((game) => (
                <option key={game.name} value={game.name}>
                  {game.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {tables.map((table) => (
          <MovesTable key={table.method} table={table} />
        ))}
      </section>
    </div>
  );
}
