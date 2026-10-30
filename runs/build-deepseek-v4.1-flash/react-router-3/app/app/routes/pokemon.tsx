import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { NotFound } from "../components/NotFound";
import { TypeBadge } from "../components/ui";
import {
  getByUrl,
  getResource,
  getTypeDisplayMap,
  getTypeEntries,
} from "../lib/data.server";
import {
  displayName,
  humanize,
  inKilograms,
  inMetres,
  latestEnglishFlavorText,
  orDash,
  statLabel,
  titleFor,
} from "../lib/format";

export function meta({ loaderData }: any) {
  if (loaderData?.notFound) return [{ title: "Not found – Pokédex" }];
  return [{ title: titleFor(loaderData?.title) }];
}

function evolutionTree(node: any): any {
  return {
    name: node.species.name,
    displayName: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(evolutionTree),
  };
}

function EvolutionList({ nodes }: { nodes: any[] }) {
  return (
    <ul className="evolution-list">
      {nodes.map((node) => (
        <li key={`${node.name}-${node.children.length}`}>
          <Link to={`/pokemon/${node.name}`}>{node.displayName}</Link>
          {node.children.length ? <EvolutionList nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

const FIXED_METHODS = ["level-up", "machine", "egg", "tutor"];

function methodSortValue(name: string): number {
  const index = FIXED_METHODS.indexOf(name);
  return index === -1 ? FIXED_METHODS.length : index;
}

function compareRows(a: any, b: any, key: string, direction: "ascending" | "descending") {
  const av = a[key];
  const bv = b[key];
  const aMissing = av === null || av === undefined || av === "";
  const bMissing = bv === null || bv === undefined || bv === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let result: number;
  if (typeof av === "number" && typeof bv === "number") result = av - bv;
  else result = String(av).localeCompare(String(bv));
  return direction === "descending" ? -result : result;
}

const COLUMNS = [
  { key: "level", label: "Level", numeric: true },
  { key: "moveName", label: "Move", numeric: false },
  { key: "typeDisplay", label: "Type", numeric: false },
  { key: "category", label: "Category", numeric: false },
  { key: "power", label: "Power", numeric: true },
  { key: "accuracy", label: "Accuracy", numeric: true },
  { key: "pp", label: "PP", numeric: true },
];

function MoveTable({ name, rows, levelTable }: { name: string; rows: any[]; levelTable: boolean }) {
  const [sort, setSort] = useState<{ key: string; direction: "ascending" | "descending" } | null>(
    null,
  );
  const columns = levelTable ? COLUMNS : COLUMNS.filter((column) => column.key !== "level");
  const sortedRows = sort
    ? rows.slice().sort((a, b) => compareRows(a, b, sort.key, sort.direction))
    : rows;

  const clickHeader = (key: string) => {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "ascending" ? "descending" : "ascending",
        };
      }
      return { key, direction: "ascending" };
    });
  };

  return (
    <div className="move-table-wrap">
      <table className="move-table">
        <caption>{name}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort?.key === column.key ? sort.direction : "none"}
              >
                <button type="button" onClick={() => clickHeader(column.key)}>
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={`${row.moveApi}-${index}`}>
              {levelTable ? <td>{orDash(row.level)}</td> : null}
              <td>
                <Link to={`/moves/${row.moveApi}`}>{row.moveName}</Link>
              </td>
              <td>
                <TypeBadge name={row.typeName} label={row.typeDisplay} link />
              </td>
              <td>{row.category}</td>
              <td>{orDash(row.power)}</td>
              <td>{orDash(row.accuracy)}</td>
              <td>{orDash(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function loader({ params, request }: any) {
  const species = await getResource("pokemon-species", params.name);
  if (!species) return { notFound: true };

  const defaultVariety =
    species.varieties?.find((variety: any) => variety.is_default)?.pokemon ??
    species.varieties?.[0]?.pokemon;
  const pokemon = defaultVariety?.url ? await getByUrl(defaultVariety.url) : null;

  const [typeEntries, evolutionChain] = await Promise.all([
    getTypeEntries(),
    species.evolution_chain?.url ? getByUrl(species.evolution_chain.url) : Promise.resolve(null),
  ]);
  const typeNames = getTypeDisplayMap(typeEntries);

  const gameNames = new Set<string>();
  for (const moveEntry of pokemon?.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name) gameNames.add(detail.version_group.name);
    }
  }

  const gameRecords = await Promise.all(
    [...gameNames].map((name) => getResource("version-group", name)),
  );
  const games = gameRecords
    .filter(Boolean)
    .map((record: any) => ({
      name: record.name,
      displayName: humanize(record.name),
      order: record.order ?? 0,
    }))
    .sort((a: any, b: any) => a.order - b.order || a.name.localeCompare(b.name));

  const requestedGame = new URL(request.url).searchParams.get("game");
  const selectedGame =
    games.find((game: any) => game.name === requestedGame)?.name ??
    games[games.length - 1]?.name ??
    "";

  const selectedDetails: any[] = [];
  for (const moveEntry of pokemon?.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name === selectedGame) {
        selectedDetails.push({ move: moveEntry.move, detail });
      }
    }
  }

  const moveRefs = new Map<string, any>();
  for (const entry of selectedDetails) moveRefs.set(entry.move.name, entry.move);
  const moveRecords = await Promise.all(
    [...moveRefs.values()].map((ref) => getByUrl(ref.url)),
  );
  const moveByName = new Map<string, any>();
  [...moveRefs.keys()].forEach((name, index) => moveByName.set(name, moveRecords[index]));

  const methods = new Map<string, any>();
  for (const entry of selectedDetails) {
    const move = moveByName.get(entry.move.name);
    if (!move) continue;
    const methodName = entry.detail.move_learn_method?.name ?? "other";
    if (!methods.has(methodName)) {
      methods.set(methodName, {
        name: methodName,
        displayName: humanize(methodName),
        rows: [],
      });
    }
    methods.get(methodName).rows.push({
      level: entry.detail.level_learned_at ?? null,
      moveApi: entry.move.name,
      moveName: displayName(move),
      typeName: move.type?.name ?? "",
      typeDisplay: typeNames.get(move.type?.name) ?? humanize(move.type?.name),
      category: humanize(move.damage_class?.name),
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    });
  }

  const moveTables = [...methods.values()].sort((a, b) => {
    const methodOrder =
      methodSortValue(a.name) - methodSortValue(b.name);
    if (methodOrder !== 0) return methodOrder;
    return a.displayName.localeCompare(b.displayName);
  });

  for (const table of moveTables) {
    if (table.name === "level-up") {
      table.rows.sort(
        (a: any, b: any) =>
          (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER) ||
          a.moveName.localeCompare(b.moveName),
      );
    } else {
      table.rows.sort((a: any, b: any) => a.moveName.localeCompare(b.moveName));
    }
  }

  const stats = (pokemon?.stats ?? []).map((entry: any) => ({
    name: entry.stat.name,
    label: statLabel(entry.stat.name),
    value: entry.base_stat,
  }));
  const statTotal = stats.reduce((sum: number, entry: any) => sum + entry.value, 0);

  const types = (pokemon?.types ?? [])
    .slice()
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      name: entry.type.name,
      displayName: typeNames.get(entry.type.name) ?? humanize(entry.type.name),
    }));

  const abilities = (pokemon?.abilities ?? [])
    .slice()
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      name: entry.ability.name,
      displayName: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    }));

  const evolution = evolutionChain?.chain ? evolutionTree(evolutionChain.chain) : null;

  return {
    notFound: false,
    title: displayName(species),
    dexId: species.id,
    genus: species.genera?.find((entry: any) => entry.language.name === "en")?.genus ?? "—",
    flavorText: latestEnglishFlavorText(species.flavor_text_entries) ?? "—",
    height: pokemon?.height ?? null,
    weight: pokemon?.weight ?? null,
    artwork:
      pokemon?.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon?.sprites?.front_default ??
      null,
    types,
    abilities,
    stats,
    statTotal,
    evolution,
    games,
    selectedGame,
    moveTables,
  };
}

export default function Pokemon({ loaderData }: any) {
  const [searchParams, setSearchParams] = useSearchParams();

  if (loaderData.notFound) return <NotFound />;

  const changeGame = (game: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("game", game);
    setSearchParams(next);
  };

  return (
    <>
      <div className="pokemon-hero">
        <div className="artwork-frame">
          {loaderData.artwork ? (
            <img
              className="artwork"
              src={loaderData.artwork}
              alt={loaderData.title}
            />
          ) : null}
        </div>

        <div className="pokemon-summary">
          <p className="dex-number">#{String(loaderData.dexId).padStart(4, "0")}</p>
          <h1>{loaderData.title}</h1>
          <p className="genus">{loaderData.genus}</p>

          <div className="type-list">
            {loaderData.types.map((type: any) => (
              <TypeBadge
                key={type.name}
                name={type.name}
                label={type.displayName}
                link
              />
            ))}
          </div>

          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{inMetres(loaderData.height)}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{inKilograms(loaderData.weight)}</dd>
            </div>
          </dl>

          <p className="flavor-text">{loaderData.flavorText}</p>
        </div>
      </div>

      <section className="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {loaderData.stats.map((stat: any) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td className="stat-value">{stat.value}</td>
                <td className="stat-track">
                  <span className="stat-track-inner">
                    <span
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{loaderData.statTotal}</td>
              <td className="stat-track">
                <span className="stat-track-inner">
                  <span
                    className="stat-bar"
                    style={{ width: `${Math.min(100, (loaderData.statTotal / 255) * 100)}%` }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="plain-list">
          {loaderData.abilities.map((ability: any) => (
            <li key={ability.name}>
              <Link to={`/abilities/${ability.name}`}>{ability.displayName}</Link>
              {ability.hidden ? <span className="muted"> (hidden)</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {loaderData.evolution ? <EvolutionList nodes={[loaderData.evolution]} /> : null}
      </section>

      <section id="moves" className="panel moves-panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div className="field game-field">
          <label className="field-label" htmlFor="game-select">
            Game
          </label>
          <select
            id="game-select"
            className="select-input"
            value={loaderData.selectedGame}
            onChange={(event) => changeGame(event.target.value)}
          >
            {loaderData.games.map((game: any) => (
              <option key={game.name} value={game.name}>
                {game.displayName}
              </option>
            ))}
          </select>
        </div>

        {loaderData.moveTables.map((table: any) => (
          <MoveTable
            key={table.name}
            name={table.displayName}
            rows={table.rows}
            levelTable={table.name === "level-up"}
          />
        ))}
      </section>
    </>
  );
}
