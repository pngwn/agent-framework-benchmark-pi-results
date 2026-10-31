import { data, Link, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import {
  apiGet,
  apiGetByUrl,
  getSpeciesIndex,
  getTypeNameMap,
  getVersionGroups,
  mapLimit,
  typeDisplayName,
} from "../lib/pokeapi";
import {
  collapse,
  englishGenus,
  englishName,
  dexNumber,
  humanize,
  latestEnglishFlavor,
  statLabel,
} from "../lib/utils";
import { TypeBadge } from "../components/cards";
import { NotFound } from "../components/not-found";
import type { EvoNode, MoveRow, MovesTableData } from "../lib/types";

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export async function loader({ params, request }: { params: any; request: Request }) {
  const name = String(params.name ?? "").toLowerCase();
  const species = await apiGet(`pokemon-species/${encodeURIComponent(name)}`);
  if (!species) return data(null, { status: 404 });

  const variety =
    (species.varieties ?? []).find((v: any) => v.is_default) ?? species.varieties?.[0];
  const [pokemon, evoChain, versionGroups, typeNames] = await Promise.all([
    variety ? apiGetByUrl(variety.pokemon.url) : null,
    species.evolution_chain?.url ? apiGetByUrl(species.evolution_chain.url) : null,
    getVersionGroups(),
    getTypeNameMap(),
  ]);

  // Version groups in which this Pokémon learns moves, in version-group order.
  const vgOrder = new Map<string, number>(
    versionGroups.map((v: any) => [v.name, v.order ?? 0]),
  );
  const gameNames = [
    ...new Set<string>(
      (pokemon?.moves ?? []).flatMap((m: any) =>
        (m.version_group_details ?? []).map((d: any) => d.version_group.name),
      ),
    ),
  ].sort((a, b) => (vgOrder.get(a) ?? 0) - (vgOrder.get(b) ?? 0));

  const url = new URL(request.url);
  const gameParam = url.searchParams.get("game");
  const selectedGame =
    gameParam && gameNames.includes(gameParam)
      ? gameParam
      : (gameNames[gameNames.length - 1] ?? null);

  // Rows grouped by learn method for the selected game.
  const rowsByMethod = new Map<string, { moveName: string; level: number }[]>();
  for (const m of pokemon?.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== selectedGame) continue;
      const method = d.move_learn_method.name;
      if (!rowsByMethod.has(method)) rowsByMethod.set(method, []);
      rowsByMethod.get(method)!.push({
        moveName: m.move.name,
        level: d.level_learned_at ?? 0,
      });
    }
  }

  const moveNames = [
    ...new Set([...rowsByMethod.values()].flat().map((r) => r.moveName)),
  ];
  const moveRecords = new Map<string, any>(
    await mapLimit(moveNames, 24, async (n) => [n, await apiGet(`move/${n}`)] as const),
  );

  const methods = [...rowsByMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    const oa = ia === -1 ? 99 : ia;
    const ob = ib === -1 ? 99 : ib;
    return oa - ob || humanize(a).localeCompare(humanize(b));
  });

  const tables: MovesTableData[] = methods.map((method) => {
    const showLevel = method === "level-up";
    const rows: MoveRow[] = rowsByMethod.get(method)!.map((r) => {
      const move = moveRecords.get(r.moveName);
      const typeName = move?.type?.name ?? "";
      return {
        level: showLevel ? r.level : null,
        moveName: r.moveName,
        moveDisplay: move ? englishName(move) : humanize(r.moveName),
        typeName,
        typeDisplay: typeName ? typeDisplayName(typeNames, typeName) : "",
        category: move?.damage_class?.name ? humanize(move.damage_class.name) : "—",
        power: move?.power ?? null,
        accuracy: move?.accuracy ?? null,
        pp: move?.pp ?? null,
      };
    });
    rows.sort(
      (a, b) =>
        (showLevel ? (a.level ?? 0) - (b.level ?? 0) : 0) ||
        a.moveDisplay.localeCompare(b.moveDisplay),
    );
    return { method, label: humanize(method), showLevel, rows };
  });

  const mapChain = (node: any): EvoNode => ({
    name: node.species.name,
    display: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(mapChain),
  });

  return {
    name: species.name,
    display: englishName(species),
    id: species.id,
    dex: dexNumber(species.id),
    genus: englishGenus(species),
    flavor: latestEnglishFlavor(species),
    types: (pokemon?.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({
        name: t.type.name,
        display: typeDisplayName(typeNames, t.type.name),
      })),
    artwork:
      pokemon?.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon?.sprites?.front_default ??
      null,
    height: pokemon ? `${(pokemon.height / 10).toFixed(1)} m` : "—",
    weight: pokemon ? `${(pokemon.weight / 10).toFixed(1)} kg` : "—",
    stats: (pokemon?.stats ?? []).map((s: any) => ({
      label: statLabel(s.stat.name),
      value: s.base_stat,
    })),
    abilities: (pokemon?.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({
        name: a.ability.name,
        display: humanize(a.ability.name),
        hidden: !!a.is_hidden,
      })),
    evolution: evoChain?.chain ? mapChain(evoChain.chain) : null,
    games: gameNames.map((g) => ({ name: g, display: humanize(g) })),
    selectedGame,
    tables,
  };
}

export function meta({ loaderData }: { loaderData: any }) {
  return [
    { title: loaderData ? `${loaderData.display} – Pokédex` : "Not found – Pokédex" },
  ];
}

function EvoTree({ node }: { node: EvoNode }) {
  return (
    <li>
      <Link to={`/pokemon/${node.name}`}>{node.display}</Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <EvoTree key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

type SortState = { col: string; dir: "ascending" | "descending" } | null;

function MovesTable({ table }: { table: MovesTableData }) {
  const [sort, setSort] = useState<SortState>(null);

  const columns: { key: string; label: string }[] = [
    ...(table.showLevel ? [{ key: "level", label: "Level" }] : []),
    { key: "move", label: "Move" },
    { key: "type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "power", label: "Power" },
    { key: "accuracy", label: "Accuracy" },
    { key: "pp", label: "PP" },
  ];

  const sorted = useMemo(() => {
    if (!sort) return table.rows;
    const value = (row: MoveRow): string | number | null => {
      switch (sort.col) {
        case "level":
          return row.level;
        case "move":
          return row.moveDisplay;
        case "type":
          return row.typeDisplay;
        case "category":
          return row.category;
        case "power":
          return row.power;
        case "accuracy":
          return row.accuracy;
        case "pp":
          return row.pp;
        default:
          return null;
      }
    };
    const dir = sort.dir === "ascending" ? 1 : -1;
    return [...table.rows].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      // Missing values sort last in both directions.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return cmp * dir || a.moveDisplay.localeCompare(b.moveDisplay);
    });
  }, [table.rows, sort]);

  function toggle(col: string) {
    setSort((prev) =>
      prev?.col === col
        ? { col, dir: prev.dir === "ascending" ? "descending" : "ascending" }
        : { col, dir: "ascending" },
    );
  }

  const num = (v: number | null) => (v == null ? "—" : String(v));

  return (
    <table className="moves-table">
      <caption>{table.label}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              aria-sort={sort?.col === c.key ? sort.dir : undefined}
            >
              <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                {c.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={`${row.moveName}-${row.level ?? 0}-${i}`}>
            {table.showLevel && <td>{num(row.level)}</td>}
            <td>
              <Link to={`/moves/${row.moveName}`}>{row.moveDisplay}</Link>
            </td>
            <td>
              {row.typeName && (
                <Link to={`/types/${row.typeName}`} className="type-badge-link">
                  <TypeBadge name={row.typeName} display={row.typeDisplay} />
                </Link>
              )}
            </td>
            <td>{row.category}</td>
            <td>{num(row.power)}</td>
            <td>{num(row.accuracy)}</td>
            <td>{num(row.pp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PokemonPage({ loaderData }: { loaderData: any }) {
  const [searchParams, setSearchParams] = useSearchParams();
  if (!loaderData) return <NotFound />;
  const d = loaderData;

  return (
    <>
      <div className="hero surface">
        <div className="hero-artwork">
          {d.artwork && <img src={d.artwork} alt={d.display} />}
        </div>
        <div className="hero-info">
          <p className="hero-dex">{d.dex}</p>
          <h1>{d.display}</h1>
          <p className="hero-genus">{d.genus}</p>
          <p className="hero-types">
            {d.types.map((t: any) => (
              <Link key={t.name} to={`/types/${t.name}`} className="type-badge-link">
                <TypeBadge name={t.name} display={t.display} />
              </Link>
            ))}
          </p>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{d.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{d.weight}</dd>
            </div>
          </dl>
          {d.flavor && <p className="hero-flavor">{d.flavor}</p>}
        </div>
      </div>

      <section aria-labelledby="stats-heading" className="surface section">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {d.stats.map((s: any) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="stat-value">{s.value}</td>
                <td className="stat-bar-cell">
                  <span className="stat-bar" aria-hidden="true">
                    <span
                      className="stat-bar-fill"
                      style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td className="stat-value">
                {d.stats.reduce((sum: number, s: any) => sum + s.value, 0)}
              </td>
              <td className="stat-bar-cell">
                <span className="stat-bar" aria-hidden="true">
                  <span
                    className="stat-bar-fill"
                    style={{
                      width: `${Math.min(100, (d.stats.reduce((sum: number, s: any) => sum + s.value, 0) / 1530) * 100)}%`,
                    }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section aria-labelledby="abilities-heading" className="surface section">
        <h2 id="abilities-heading">Abilities</h2>
        <ul>
          {d.abilities.map((a: any) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{a.display}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </section>

      {d.evolution && (
        <section aria-labelledby="evolution-heading" className="surface section">
          <h2 id="evolution-heading">Evolution</h2>
          <ul>
            <EvoTree node={d.evolution} />
          </ul>
        </section>
      )}

      <section id="moves" aria-labelledby="moves-heading" className="surface section">
        <h2 id="moves-heading">Moves</h2>
        {d.games.length > 0 && (
          <div className="game-picker">
            <label htmlFor="game">Game</label>
            <select
              id="game"
              value={d.selectedGame ?? ""}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                params.set("game", e.target.value);
                setSearchParams(params, { preventScrollReset: true });
              }}
            >
              {d.games.map((g: any) => (
                <option key={g.name} value={g.name}>
                  {g.display}
                </option>
              ))}
            </select>
          </div>
        )}
        {d.tables.map((t: MovesTableData) => (
          <MovesTable key={t.method} table={t} />
        ))}
      </section>
    </>
  );
}
