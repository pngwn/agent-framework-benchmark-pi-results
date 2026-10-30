import { component$, useComputed$, useSignal } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  displayDex,
  englishName,
  formatValue,
  getEvolutionChain,
  getMoveDetails,
  getPokemonByUrlOrId,
  getSpeciesByName,
  getTypeLabelMap,
  getVersionGroups,
  humanize,
  latestEnglishFlavor,
  typeLabelFor,
} from "../../../lib/data";
import { NotFound } from "../../../components/not-found";
import { TypeBadgeLink } from "../../../components/ui";

type EvoNode = { name: string; evolvesTo: EvoNode[] };
type MoveRow = {
  level: number;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};
type MoveTableData = { method: string; label: string; hasLevel: boolean; rows: MoveRow[] };

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

function evolutionTree(node: any): EvoNode {
  return {
    name: String(node?.species?.name ?? ""),
    evolvesTo: (node?.evolves_to ?? []).map((child: any) => evolutionTree(child)),
  };
}

function renderEvolution(node: EvoNode) {
  return (
    <li key={node.name}>
      <a href={`/pokemon/${node.name}`}>{humanize(node.name)}</a>
      {node.evolvesTo.length ? <ul>{node.evolvesTo.map((child) => renderEvolution(child))}</ul> : null}
    </li>
  );
}

function sortDefault(rows: MoveRow[], hasLevel: boolean): MoveRow[] {
  return [...rows].sort((a, b) => {
    if (hasLevel && a.level !== b.level) return a.level - b.level;
    return a.moveLabel.localeCompare(b.moveLabel);
  });
}

export const usePokemonData = routeLoader$(async ({ params, url }) => {
  const species = await getSpeciesByName(params.name);
  if (!species) return { notFound: true as const };

  const variety =
    (species.varieties ?? []).find((entry: any) => entry.is_default) ?? (species.varieties ?? [])[0];
  const pokemon = await getPokemonByUrlOrId(variety?.pokemon?.url, Number(species.id));
  if (!pokemon) return { notFound: true as const };

  const [typeLabels, versionGroups, chainRecord] = await Promise.all([
    getTypeLabelMap(),
    getVersionGroups(),
    getEvolutionChain(species.evolution_chain?.url),
  ]);

  const english = englishName(species);
  const usedVersionGroups = new Set<string>();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name) usedVersionGroups.add(String(detail.version_group.name));
    }
  }
  const games = versionGroups
    .filter((group) => usedVersionGroups.has(group.name))
    .map((group) => ({ name: group.name, label: group.label, order: group.order }));
  const requestedGame = searchParam(url, "game");
  const selectedGame =
    games.find((game) => game.name === requestedGame) ?? (games.length ? games[games.length - 1] : null);

  let moveTables: MoveTableData[] = [];
  if (selectedGame) {
    const candidateRows = new Map<string, { method: string; moveName: string; level: number }>();
    for (const moveEntry of pokemon.moves ?? []) {
      for (const detail of moveEntry.version_group_details ?? []) {
        if (detail.version_group?.name !== selectedGame.name) continue;
        const method = String(detail.move_learn_method?.name ?? "");
        const moveName = String(moveEntry.move?.name ?? "");
        if (!method || !moveName) continue;
        const key = `${method}:${moveName}`;
        if (!candidateRows.has(key)) {
          candidateRows.set(key, {
            method,
            moveName,
            level: Number(detail.level_learned_at ?? 0),
          });
        }
      }
    }

    const candidates = [...candidateRows.values()];
    const records = await getMoveDetails([...new Set(candidates.map((candidate) => candidate.moveName))]);
    const grouped = new Map<string, MoveRow[]>();
    for (const candidate of candidates) {
      const record = records.get(candidate.moveName);
      const typeName = String(record?.type?.name ?? "");
      const row: MoveRow = {
        level: candidate.level,
        moveName: candidate.moveName,
        moveLabel: record ? englishName(record) : humanize(candidate.moveName),
        typeName,
        typeLabel: typeName ? typeLabelFor(typeLabels, typeName) : "—",
        category: humanize(String(record?.damage_class?.name ?? "")),
        power: record?.power ?? null,
        accuracy: record?.accuracy ?? null,
        pp: record?.pp ?? null,
      };
      const list = grouped.get(candidate.method) ?? [];
      list.push(row);
      grouped.set(candidate.method, list);
    }

    const methodOrder = new Map([
      ["level-up", 0],
      ["machine", 1],
      ["egg", 2],
      ["tutor", 3],
    ]);
    const methodNames = [...grouped.keys()].sort((a, b) => {
      const ao = methodOrder.get(a);
      const bo = methodOrder.get(b);
      if (ao !== undefined || bo !== undefined) return (ao ?? 99) - (bo ?? 99);
      return humanize(a).localeCompare(humanize(b));
    });
    moveTables = methodNames.map((method) => {
      const hasLevel = method === "level-up";
      return {
        method,
        label: humanize(method),
        hasLevel,
        rows: sortDefault(grouped.get(method) ?? [], hasLevel),
      };
    });
  }

  const stats = (pokemon.stats ?? []).map((entry: any) => {
    const statName = String(entry.stat?.name ?? "");
    return {
      name: statName,
      label: STAT_LABELS[statName] ?? humanize(statName),
      value: Number(entry.base_stat ?? 0),
    };
  });
  const total = stats.reduce((sum: number, stat: { value: number }) => sum + stat.value, 0);

  const types = (pokemon.types ?? [])
    .slice()
    .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
    .map((entry: any) => {
      const name = String(entry.type?.name ?? "");
      return { name, label: typeLabelFor(typeLabels, name) };
    });

  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
    .map((entry: any) => {
      const name = String(entry.ability?.name ?? "");
      return {
        name,
        label: humanize(name),
        hidden: Boolean(entry.is_hidden),
        slot: Number(entry.slot ?? 0),
      };
    });

  const genus = (species.genera ?? []).find((entry: any) => entry.language?.name === "en")?.genus ?? "";

  return {
    notFound: false as const,
    englishName: english,
    dexNumber: displayDex(Number(species.id)),
    genus,
    flavor: latestEnglishFlavor(species),
    height: (Number(pokemon.height ?? 0) / 10).toFixed(1),
    weight: (Number(pokemon.weight ?? 0) / 10).toFixed(1),
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon.sprites?.front_default ??
      null,
    types,
    stats,
    total,
    abilities,
    evolution: chainRecord?.chain
      ? evolutionTree(chainRecord.chain)
      : { name: String(species.name), evolvesTo: [] },
    games,
    selectedGame: selectedGame?.name ?? "",
    moveTables,
  };
});

function searchParam(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

type SortKey = "level" | "move" | "type" | "category" | "power" | "accuracy" | "pp";

function valueFor(row: MoveRow, key: SortKey): string | number | null {
  if (key === "move") return row.moveLabel;
  if (key === "type") return row.typeLabel;
  return row[key];
}

function compareRows(a: MoveRow, b: MoveRow, key: SortKey, direction: "ascending" | "descending"): number {
  const av = valueFor(a, key);
  const bv = valueFor(b, key);
  const aMissing = av === null || av === undefined || av === "";
  const bMissing = bv === null || bv === undefined || bv === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  const comparison =
    typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
  return direction === "ascending" ? comparison : -comparison;
}

const MoveTable = component$<{ table: MoveTableData }>(({ table }) => {
  const sort = useSignal<{ key: SortKey; direction: "ascending" | "descending" } | null>(null);
  const sortedRows = useComputed$(() => {
    if (!sort.value) return table.rows;
    return [...table.rows].sort((a, b) =>
      compareRows(a, b, sort.value!.key, sort.value!.direction),
    );
  });

  const columns: { key: SortKey; label: string }[] = [
    ...(table.hasLevel ? [{ key: "level" as SortKey, label: "Level" }] : []),
    { key: "move", label: "Move" },
    { key: "type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "power", label: "Power" },
    { key: "accuracy", label: "Accuracy" },
    { key: "pp", label: "PP" },
  ];

  return (
    <div class="table-wrap">
      <table class="moves-table">
        <caption>{table.label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort.value?.key === column.key ? sort.value.direction : undefined}
              >
                <button
                  class="sort-button"
                  type="button"
                  onClick$={() => {
                    const current = sort.value;
                    sort.value =
                      current?.key === column.key
                        ? {
                            key: column.key,
                            direction:
                              current.direction === "ascending" ? "descending" : "ascending",
                          }
                        : { key: column.key, direction: "ascending" };
                  }}
                >
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.value.map((row, index) => (
            <tr key={`${row.moveName}:${index}`}>
              {table.hasLevel ? <td>{row.level}</td> : null}
              <td>
                <a href={`/moves/${row.moveName}`}>{row.moveLabel}</a>
              </td>
              <td>
                {row.typeName ? (
                  <a class={`type-badge type-${row.typeName}`} href={`/types/${row.typeName}`}>
                    {row.typeLabel}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>{row.category || "—"}</td>
              <td>{formatValue(row.power)}</td>
              <td>{formatValue(row.accuracy)}</td>
              <td>{formatValue(row.pp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default component$(() => {
  const data = usePokemonData();

  if (data.value.notFound) {
    return <NotFound />;
  }

  const info = data.value;
  return (
    <>
      <div class="summary">
        <div class="artwork-wrap">
          {info.artwork ? <img class="artwork" src={info.artwork} alt={info.englishName} width={288} height={288} /> : null}
        </div>
        <div class="summary-info">
          <span class="dex-number">{info.dexNumber}</span>
          <h1>{info.englishName}</h1>
          {info.genus ? <p class="genus">{info.genus}</p> : null}
          <div class="summary-types">
            {info.types.map((type: { name: string; label: string }) => (
              <TypeBadgeLink key={type.name} name={type.name} label={type.label} />
            ))}
          </div>
          <dl class="measurements">
            <div>
              <dt>Height</dt>
              <dd>{info.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{info.weight} kg</dd>
            </div>
          </dl>
          <p class="flavor">{info.flavor || "—"}</p>
        </div>
      </div>

      <section class="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table class="stats-table">
          <tbody>
            {info.stats.map((stat: { name: string; label: string; value: number }) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td class="stat-value">{stat.value}</td>
                <td>
                  <div class="stat-track">
                    <div
                      class="stat-fill"
                      style={{ width: `${Math.min(100, (stat.value / 200) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr class="total">
              <th scope="row">Total</th>
              <td class="stat-value">{info.total}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul class="plain-list">
          {info.abilities.map((ability: { name: string; label: string; hidden: boolean }) => (
            <li key={ability.name}>
              <a href={`/abilities/${ability.name}`}>{ability.label}</a>
              {ability.hidden ? " (hidden)" : null}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        <ul class="evolution-root">{renderEvolution(info.evolution)}</ul>
      </section>

      <section class="panel moves-section" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <div class="game-picker">
          <label for="game-select">Game</label>
          <select
            id="game-select"
            value={info.selectedGame}
            onChange$={(event) => {
              const target = new URL(window.location.href);
              target.searchParams.set("game", (event.target as HTMLSelectElement).value);
              target.hash = "moves";
              window.location.assign(target.toString());
            }}
          >
            {info.games.map((game) => (
              <option key={game.name} value={game.name} selected={info.selectedGame === game.name}>
                {game.label}
              </option>
            ))}
          </select>
        </div>
        {info.moveTables.map((table) => (
          <MoveTable key={table.method} table={table} />
        ))}
      </section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemonData);
  return { title: data.notFound ? "Not found – Pokédex" : `${data.englishName} – Pokédex` };
};
