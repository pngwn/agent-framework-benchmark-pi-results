import { component$, useSignal, type JSXOutput } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { NotFoundContent, TypeLink } from "../../../components/ui";
import {
  getEvolutionChain,
  getMoveRecord,
  getPokemonById,
  getSpecies,
  getVersionGroups,
} from "../../../lib/api";
import {
  displayValue,
  englishName,
  humanize,
  latestEnglishFlavor,
  padDexNumber,
} from "../../../lib/format";

interface EvolutionNode {
  name: string;
  display: string;
  children: EvolutionNode[];
}

function buildEvolutionNode(node: any): EvolutionNode {
  return {
    name: node.species.name,
    display: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(buildEvolution),
  };
}

function buildEvolution(node: any): EvolutionNode {
  return buildEvolutionNode(node);
}

function evolutionItems(nodes: EvolutionNode[]): JSXOutput[] {
  return nodes.map((node) => (
    <li key={node.name}>
      <Link href={`/pokemon/${node.name}`}>{node.display}</Link>
      {node.children.length ? (
        <ul class="evolution-list">{evolutionItems(node.children)}</ul>
      ) : null}
    </li>
  ));
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER: Record<string, number> = {
  "level-up": 0,
  machine: 1,
  egg: 2,
  tutor: 3,
};

interface MoveRow {
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string | null;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveTable {
  method: string;
  label: string;
  hasLevel: boolean;
  rows: MoveRow[];
}

type SortKey = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";

const MovesTable = component$<{ table: MoveTable }>(({ table }) => {
  const sort = useSignal<{ key: SortKey; direction: 1 | -1 } | null>(null);

  const sortedRows = () => {
    const active = sort.value;
    if (!active) return table.rows;
    const { key, direction } = active;
    return [...table.rows].sort((a, b) => {
      const valueFor = (row: MoveRow): string | number | null => {
        switch (key) {
          case "level": return row.level;
          case "move": return row.moveLabel;
          case "type": return row.typeLabel;
          case "category": return row.category;
          case "power": return row.power;
          case "accuracy": return row.accuracy;
          case "pp": return row.pp;
        }
      };
      const av = valueFor(a);
      const bv = valueFor(b);
      const aMissing = av === null || av === undefined;
      const bMissing = bv === null || bv === undefined;
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      let comparison: number;
      if (typeof av === "number" && typeof bv === "number") {
        comparison = av - bv;
      } else {
        comparison = String(av).localeCompare(String(bv));
      }
      return comparison * direction;
    });
  };

  const header = (key: SortKey, label: string) => {
    const active = sort.value;
    const ariaSort =
      active?.key === key
        ? active.direction === 1
          ? "ascending"
          : "descending"
        : undefined;
    return (
      <th scope="col" aria-sort={ariaSort}>
        <button
          type="button"
          class="sort-button"
          onClick$={() => {
            if (sort.value?.key === key) {
              sort.value = {
                key,
                direction: sort.value.direction === 1 ? -1 : 1,
              };
            } else {
              sort.value = { key, direction: 1 };
            }
          }}
        >
          {label}
          {active?.key === key ? (
            <span class="sort-arrow" aria-hidden="true">
              {active.direction === 1 ? "▲" : "▼"}
            </span>
          ) : null}
        </button>
      </th>
    );
  };

  return (
    <div class="table-scroll">
      <table class="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {table.hasLevel ? header("level", "Level") : null}
            {header("move", "Move")}
            {header("type", "Type")}
            {header("category", "Category")}
            {header("power", "Power")}
            {header("accuracy", "Accuracy")}
            {header("pp", "PP")}
          </tr>
        </thead>
        <tbody>
          {sortedRows().map((row, index) => (
            <tr key={`${row.moveName}-${index}`}>
              {table.hasLevel ? <td>{displayValue(row.level)}</td> : null}
              <td><Link href={`/moves/${row.moveName}`}>{row.moveLabel}</Link></td>
              <td>
                {row.typeName ? (
                  <TypeLink name={row.typeName} label={row.typeLabel} />
                ) : (
                  "—"
                )}
              </td>
              <td>{row.category}</td>
              <td>{displayValue(row.power)}</td>
              <td>{displayValue(row.accuracy)}</td>
              <td>{displayValue(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

interface MethodDetail {
  method: string;
  level: number;
  moveName: string;
}

export const usePokemonData = routeLoader$(async ({ params, url }) => {
  const species = await getSpecies(params.name);
  if (!species) return { notFound: true as const };

  const [pokemon, evolution] = await Promise.all([
    getPokemonById(species.id),
    getEvolutionChain(species.evolution_chain.url),
  ]);
  if (!pokemon) return { notFound: true as const };

  const title = englishName(species.names, species.name);
  const genus =
    species.genera.find((entry) => entry.language.name === "en")?.genus ?? "—";
  const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? "—";
  const artwork =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  const stats = pokemon.stats.map((entry) => ({
    key: entry.stat.name,
    label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat,
  }));
  const statTotal = pokemon.stats.reduce((sum, entry) => sum + entry.base_stat, 0);

  const versionGroups = await getVersionGroups(
    refsUnique(
      pokemon.moves.flatMap((entry) =>
        entry.version_group_details.map((detail) => detail.version_group),
      ),
    ),
  );
  const requestedGame = url.searchParams.get("game");
  const selectedGame =
    versionGroups.find((group) => group.name === requestedGame) ??
    (versionGroups.length ? versionGroups[versionGroups.length - 1] : null);

  let tables: MoveTable[] = [];
  if (selectedGame) {
    const methodDetails: MethodDetail[] = [];
    for (const entry of pokemon.moves) {
      for (const detail of entry.version_group_details) {
        if (detail.version_group.name !== selectedGame.name) continue;
        methodDetails.push({
          method: detail.move_learn_method.name,
          level: detail.level_learned_at,
          moveName: entry.move.name,
        });
      }
    }

    const moveNames = [...new Set(methodDetails.map((detail) => detail.moveName))];
    const moveRecords = await Promise.all(
      moveNames.map(async (name) => {
        const moveRef = pokemon.moves.find((entry) => entry.move.name === name)?.move;
        const record = moveRef ? await getMoveRecord(moveRef.url) : null;
        return { name, record };
      }),
    );
    const recordsByName = new Map(moveRecords.map((entry) => [entry.name, entry.record]));

    const byMethod = new Map<string, MoveRow[]>();
    for (const detail of methodDetails) {
      const record = recordsByName.get(detail.moveName) ?? null;
      const row: MoveRow = {
        level: detail.method === "level-up" ? detail.level : null,
        moveName: detail.moveName,
        moveLabel: record
          ? englishName(record.names, record.name)
          : humanize(detail.moveName),
        typeName: record?.type?.name ?? null,
        typeLabel: record?.type ? humanize(record.type.name) : "—",
        category: record?.damage_class
          ? humanize(record.damage_class.name)
          : "—",
        power: record?.power ?? null,
        accuracy: record?.accuracy ?? null,
        pp: record?.pp ?? null,
      };
      const rows = byMethod.get(detail.method) ?? [];
      rows.push(row);
      byMethod.set(detail.method, rows);
    }

    tables = [...byMethod.entries()]
      .map(([method, rows]) => {
        const hasLevel = method === "level-up";
        rows.sort((a, b) => {
          if (hasLevel) {
            const aLevel = a.level ?? Number.MAX_SAFE_INTEGER;
            const bLevel = b.level ?? Number.MAX_SAFE_INTEGER;
            if (aLevel !== bLevel) return aLevel - bLevel;
          }
          return a.moveLabel.localeCompare(b.moveLabel);
        });
        return { method, label: humanize(method), hasLevel, rows };
      })
      .sort((a, b) => {
        const ar = METHOD_ORDER[a.method] ?? 4;
        const br = METHOD_ORDER[b.method] ?? 4;
        if (ar !== br) return ar - br;
        return a.label.localeCompare(b.label);
      });
  }

  return {
    notFound: false as const,
    name: species.name,
    title,
    dex: padDexNumber(species.id),
    genus,
    flavor,
    artwork,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.type.name,
        english: humanize(entry.type.name),
      })),
    stats,
    statTotal,
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: entry.is_hidden,
      })),
    evolution: evolution ? buildEvolutionNode(evolution.chain) : null,
    games: versionGroups.map((group) => ({
      name: group.name,
      label: humanize(group.name),
      order: group.order,
    })),
    selectedGame: selectedGame?.name ?? "",
    tables,
  };
});

function refsUnique(refs: { name: string; url: string }[]): { name: string; url: string }[] {
  const map = new Map<string, { name: string; url: string }>();
  for (const ref of refs) map.set(ref.name, ref);
  return [...map.values()];
}

export default component$(() => {
  const data = usePokemonData();
  const navigate = useNavigate();
  if (data.value.notFound) return <NotFoundContent />;

  return (
    <>
      <div class="pokemon-hero">
        <div class="artwork">
          {data.value.artwork ? (
            <img src={data.value.artwork} alt={data.value.title} width={288} height={288} />
          ) : null}
        </div>
        <div class="hero-info">
          <p class="pokemon-number">{data.value.dex}</p>
          <h1>{data.value.title}</h1>
          <p class="genus">{data.value.genus}</p>
          <div class="hero-types">
            {data.value.types.map((type) => (
              <TypeLink key={type.name} name={type.name} label={type.english} />
            ))}
          </div>
          <dl class="hero-facts">
            <div>
              <dt>Height</dt>
              <dd>{data.value.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.value.weight} kg</dd>
            </div>
          </dl>
          <p class="flavor-text">{data.value.flavor}</p>
        </div>
      </div>

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            {data.value.stats.map((stat) => (
              <tr key={stat.key}>
                <th scope="row">{stat.label}</th>
                <td class="stat-value">{stat.value}</td>
                <td class="stat-bar-cell">
                  <span class="stat-bar-track">
                    <span
                      class="stat-bar-fill"
                      style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">{data.value.statTotal}</td>
              <td class="stat-bar-cell" />
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="bullet-list">
          {data.value.abilities.map((ability) => (
            <li key={ability.name}>
              <Link href={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? " (hidden)" : null}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {data.value.evolution ? (
          <ul class="evolution-list">{evolutionItems([data.value.evolution])}</ul>
        ) : (
          <p>—</p>
        )}
      </section>

      <section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        {data.value.games.length ? (
          <>
            <div class="moves-game">
              <label for="game-select">Game</label>
              <select
                id="game-select"
                value={data.value.selectedGame}
                onChange$={(event) => {
                  const value = (event.target as HTMLSelectElement).value;
                  void navigate(
                    `/pokemon/${data.value.name}?game=${encodeURIComponent(value)}`,
                  );
                }}
              >
                {data.value.games.map((game) => (
                  <option
                    key={game.name}
                    value={game.name}
                    selected={game.name === data.value.selectedGame}
                  >
                    {game.label}
                  </option>
                ))}
              </select>
            </div>
            {data.value.tables.map((table) => (
              <MovesTable key={table.method} table={table} />
            ))}
          </>
        ) : (
          <p>No moves found.</p>
        )}
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemonData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.title} – Pokédex` };
};
