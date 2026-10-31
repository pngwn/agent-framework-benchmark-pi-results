import { useMemo, useState } from "react";
import { data, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/pokemon";
import { apiGet, isNotFound, mapLimit, mediaUrl, spritePatternUrl } from "../lib/pokeapi.server";
import { dexNumber, EM_DASH, englishName, humanize, latestEnglishFlavor } from "../lib/format";
import { NotFound, Section, TypeBadge } from "../components/ui";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const FIXED_METHODS = ["level-up", "machine", "egg", "tutor"];

interface MoveRow {
  level: number | null;
  moveName: string;
  moveEnglish: string;
  typeName: string;
  typeEnglish: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MethodTable {
  name: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
}

interface EvoNode {
  name: string;
  children: EvoNode[];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const name = decodeURIComponent(params.name).toLowerCase();
  let species: any;
  try {
    species = await apiGet(`/api/v2/pokemon-species/${name}/`);
  } catch (err) {
    if (isNotFound(err)) return data({ notFound: true as const }, { status: 404 });
    throw err;
  }

  const [pokemon, chain] = await Promise.all([
    apiGet<any>(`/api/v2/pokemon/${species.id}/`),
    apiGet<any>(species.evolution_chain.url),
  ]);

  // Version groups in which this Pokémon learns moves, in order.
  const vgNames = new Set<string>();
  for (const m of pokemon.moves as any[]) {
    for (const d of m.version_group_details as any[]) vgNames.add(d.version_group.name);
  }
  const vgs = await mapLimit([...vgNames], 16, (n) => apiGet<any>(`/api/v2/version-group/${n}/`));
  vgs.sort((a, b) => a.order - b.order);

  const url = new URL(request.url);
  const gameParam = url.searchParams.get("game");
  const selected = vgs.find((v) => v.name === gameParam) ?? vgs[vgs.length - 1] ?? null;

  let methods: MethodTable[] = [];
  if (selected) {
    const byMoveMethod = new Map<string, { move: string; method: string; level: number }>();
    for (const m of pokemon.moves as any[]) {
      for (const d of m.version_group_details as any[]) {
        if (d.version_group.name !== selected.name) continue;
        const method = d.move_learn_method.name as string;
        const key = `${m.move.name}|${method}`;
        const level = d.level_learned_at ?? 0;
        const existing = byMoveMethod.get(key);
        if (!existing || level < existing.level) {
          byMoveMethod.set(key, { move: m.move.name, method, level });
        }
      }
    }
    const moveNames = [...new Set([...byMoveMethod.values()].map((r) => r.move))];
    const details = new Map(
      await mapLimit(moveNames, 32, async (n) => [n, await apiGet<any>(`/api/v2/move/${n}/`)] as const),
    );

    const byMethod = new Map<string, MoveRow[]>();
    for (const r of byMoveMethod.values()) {
      const detail = details.get(r.move)!;
      const row: MoveRow = {
        level: r.method === "level-up" ? r.level : null,
        moveName: r.move,
        moveEnglish: englishName(detail),
        typeName: detail.type?.name ?? "",
        typeEnglish: humanize(detail.type?.name ?? ""),
        category: humanize(detail.damage_class?.name ?? ""),
        power: detail.power ?? null,
        accuracy: detail.accuracy ?? null,
        pp: detail.pp ?? null,
      };
      let rows = byMethod.get(r.method);
      if (!rows) byMethod.set(r.method, (rows = []));
      rows.push(row);
    }

    const methodNames = [...byMethod.keys()].sort((a, b) => {
      const ia = FIXED_METHODS.indexOf(a);
      const ib = FIXED_METHODS.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return humanize(a).localeCompare(humanize(b));
    });

    methods = methodNames.map((methodName) => {
      const rows = byMethod.get(methodName)!;
      if (methodName === "level-up") {
        rows.sort((a, b) => a.level! - b.level! || a.moveEnglish.localeCompare(b.moveEnglish));
      } else {
        rows.sort((a, b) => a.moveEnglish.localeCompare(b.moveEnglish));
      }
      return {
        name: methodName,
        label: humanize(methodName),
        hasLevel: methodName === "level-up",
        rows,
      };
    });
  }

  const buildEvo = (node: any): EvoNode => ({
    name: node.species.name,
    children: (node.evolves_to as any[]).map(buildEvo),
  });

  const artwork =
    mediaUrl(pokemon.sprites?.other?.["official-artwork"]?.front_default) ??
    spritePatternUrl(species.id, "other/official-artwork");

  const stats = (pokemon.stats as any[]).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return data({
    title: englishName(species),
    dex: dexNumber(species.id),
    genus:
      (species.genera as any[]).find((g) => g.language.name === "en")?.genus ?? "",
    types: (pokemon.types as any[])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, english: humanize(t.type.name) })),
    artwork,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: (pokemon.abilities as any[])
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({
        name: a.ability.name as string,
        label: humanize(a.ability.name),
        hidden: a.is_hidden as boolean,
      })),
    evolution: buildEvo(chain.chain),
    games: vgs.map((v) => ({ name: v.name as string, label: humanize(v.name) })),
    selectedGame: selected?.name ?? "",
    methods,
  });
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData || "notFound" in loaderData) return [{ title: "Not found – Pokédex" }];
  return [{ title: `${loaderData.title} – Pokédex` }];
}

function EvoTree({ node }: { node: EvoNode }) {
  return (
    <li>
      <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
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

type SortKey = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";

function sortValue(row: MoveRow, key: SortKey): number | string | null {
  switch (key) {
    case "level": return row.level;
    case "move": return row.moveEnglish;
    case "type": return row.typeEnglish;
    case "category": return row.category;
    case "power": return row.power;
    case "accuracy": return row.accuracy;
    case "pp": return row.pp;
  }
}

function MovesTable({ method }: { method: MethodTable }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "ascending" | "descending" } | null>(null);

  const columns: { key: SortKey; label: string }[] = [
    ...(method.hasLevel ? [{ key: "level" as SortKey, label: "Level" }] : []),
    { key: "move", label: "Move" },
    { key: "type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "power", label: "Power" },
    { key: "accuracy", label: "Accuracy" },
    { key: "pp", label: "PP" },
  ];

  const rows = useMemo(() => {
    if (!sort) return method.rows;
    const { key, dir } = sort;
    return [...method.rows].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // missing values sort last in both directions
      if (bv == null) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return dir === "ascending" ? cmp : -cmp;
    });
  }, [method.rows, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === "ascending" ? "descending" : "ascending" }
        : { key, dir: "ascending" },
    );
  };

  const num = (v: number | null) => (v == null ? EM_DASH : String(v));

  return (
    <table className="moves-table">
      <caption>{method.label}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              aria-sort={sort?.key === col.key ? sort.dir : "none"}
              scope="col"
            >
              <button type="button" onClick={() => toggleSort(col.key)}>
                {col.label}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.moveName}>
            {method.hasLevel && <td>{num(row.level)}</td>}
            <td>
              <Link to={`/moves/${row.moveName}`}>{row.moveEnglish}</Link>
            </td>
            <td>
              <Link to={`/types/${row.typeName}`}>
                <TypeBadge name={row.typeName} english={row.typeEnglish} />
              </Link>
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

export default function PokemonPage({ loaderData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  if ("notFound" in loaderData) return <NotFound />;
  const d = loaderData;

  return (
    <>
      <div className="pokemon-hero">
        <div className="pokemon-artwork">
          {d.artwork && <img src={d.artwork} alt={d.title} width={288} height={288} />}
        </div>
        <div className="pokemon-summary">
          <p className="dex-number">{d.dex}</p>
          <h1>{d.title}</h1>
          <p className="genus">{d.genus}</p>
          <p className="pokemon-types">
            {d.types.map((t) => (
              <Link key={t.name} to={`/types/${t.name}`} className="type-badge-link">
                <TypeBadge name={t.name} english={t.english} />
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
        </div>
      </div>
      {d.flavor && <p className="flavor">{d.flavor}</p>}

      <Section title="Base stats" headingId="stats-heading">
        <table className="stats-table">
          <tbody>
            {d.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="stat-value">{s.value}</td>
                <td className="stat-bar-cell">
                  <div className="stat-track">
                    <div
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (s.value / 200) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{d.total}</td>
              <td className="stat-bar-cell">
                <div className="stat-track">
                  <div
                    className="stat-bar"
                    style={{ width: `${Math.min(100, (d.total / 720) * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {d.abilities.map((a) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{a.label}</Link>
              {a.hidden ? " (hidden)" : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        <ul className="plain-list">
          <EvoTree node={d.evolution} />
        </ul>
      </Section>

      <Section title="Moves" id="moves">
        <div className="control game-control">
          <label htmlFor="game">Game</label>
          <select
            id="game"
            value={d.selectedGame}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              next.set("game", e.target.value);
              setSearchParams(next);
            }}
          >
            {d.games.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        {d.methods.map((method) => (
          <MovesTable key={method.name} method={method} />
        ))}
      </Section>
    </>
  );
}
