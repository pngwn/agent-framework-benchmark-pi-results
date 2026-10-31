// Server-only data assembly for routes. All data comes from the live API.

import { apiFetch } from "./api.server";
import {
  humanize,
  enName,
  enGenus,
  latestEnFlavorText,
  enShortEffect,
  idFromUrl,
  isFormId,
} from "./format";

export interface TypeRef {
  name: string;
  label: string;
}

export interface CardData {
  id: number; // species (dex) id
  species: string; // species API name
  name: string; // humanized species name
  sprite: string | null;
  types?: TypeRef[];
  generation?: string;
  hidden?: boolean;
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

function cached<T>(store: { promise: Promise<T> | null }, build: () => Promise<T>): Promise<T> {
  if (!store.promise) {
    store.promise = build();
    store.promise.catch(() => {
      store.promise = null;
    });
  }
  return store.promise;
}

// ---------------------------------------------------------------- types ----

const typeMapStore: { promise: Promise<Map<string, string>> | null } = { promise: null };

/** Map of type API name -> English name, for the 18 main types. */
export function getTypeMap(): Promise<Map<string, string>> {
  return cached(typeMapStore, async () => {
    const list = await apiFetch("type/?limit=100");
    const map = new Map<string, string>();
    await Promise.all(
      list.results
        .filter((t: any) => !EXCLUDED_TYPES.has(t.name))
        .map(async (t: any) => {
          const record = await apiFetch(`type/${t.name}`);
          map.set(t.name, (record && enName(record.names)) || humanize(t.name));
        }),
    );
    return map;
  });
}

/** The 18 types, in API order. */
export async function getTypeList(): Promise<TypeRef[]> {
  const [list, map] = await Promise.all([apiFetch("type/?limit=100"), getTypeMap()]);
  return list.results
    .filter((t: any) => !EXCLUDED_TYPES.has(t.name))
    .map((t: any) => ({ name: t.name, label: map.get(t.name) ?? humanize(t.name) }));
}

function typeLabel(map: Map<string, string>, name: string): string {
  return map.get(name) ?? humanize(name);
}

// ---------------------------------------------------------------- cards ----

/** Build a card from a full Pokémon record (maps to its species). */
function cardFromPokemonRecord(pokemon: any): CardData | null {
  if (!pokemon?.species) return null;
  const speciesId = idFromUrl(pokemon.species.url);
  if (!Number.isFinite(speciesId)) return null;
  return {
    id: speciesId,
    species: pokemon.species.name,
    name: humanize(pokemon.species.name),
    sprite: pokemon.sprites?.front_default ?? null,
  };
}

/**
 * Build cards for a list of Pokémon references ({name, url}), excluding
 * alternate forms, deduplicating by species and ordering by dex number.
 */
export async function cardsForPokemonRefs(refs: Array<{ name: string; url: string }>): Promise<CardData[]> {
  const bySpecies = new Map<number, CardData>();
  await Promise.all(
    refs.map(async (ref) => {
      const id = idFromUrl(ref.url);
      if (!Number.isFinite(id) || isFormId(id)) return;
      const pokemon = await apiFetch(`pokemon/${id}`);
      const card = cardFromPokemonRecord(pokemon);
      if (card && !bySpecies.has(card.id)) bySpecies.set(card.id, card);
    }),
  );
  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}

// ----------------------------------------------------------------- home ----

export interface HomeData {
  cards: CardData[];
  types: TypeRef[];
  generations: TypeRef[];
}

const homeStore: { promise: Promise<HomeData> | null } = { promise: null };

export function getHomeData(): Promise<HomeData> {
  return cached(homeStore, async () => {
    const [speciesList, generationList, typeMap, types] = await Promise.all([
      apiFetch("pokemon-species/?limit=100000"),
      apiFetch("generation/?limit=100"),
      getTypeMap(),
      getTypeList(),
    ]);

    const generations = (
      await Promise.all(generationList.results.map((g: any) => apiFetch(`generation/${g.name}`)))
    )
      .filter(Boolean)
      .sort((a: any, b: any) => a.id - b.id);

    const speciesGeneration = new Map<string, string>();
    const generationOptions: TypeRef[] = [];
    for (const g of generations) {
      generationOptions.push({ name: g.name, label: enName(g.names) ?? humanize(g.name) });
      for (const s of g.pokemon_species) speciesGeneration.set(s.name, g.name);
    }

    const cards = await Promise.all(
      speciesList.results.map(async (s: any): Promise<CardData | null> => {
        const id = idFromUrl(s.url);
        if (!Number.isFinite(id)) return null;
        // A species' default Pokémon has the same id as the species.
        const pokemon = await apiFetch(`pokemon/${id}`);
        if (!pokemon) return null;
        const cardTypes: TypeRef[] = [...(pokemon.types ?? [])]
          .sort((a: any, b: any) => a.slot - b.slot)
          .map((t: any) => ({ name: t.type.name, label: typeLabel(typeMap, t.type.name) }));
        return {
          id,
          species: s.name,
          name: humanize(s.name),
          sprite: pokemon.sprites?.front_default ?? null,
          types: cardTypes,
          generation: speciesGeneration.get(s.name) ?? "",
        };
      }),
    );

    return { cards: cards.filter((c): c is CardData => c !== null), types, generations: generationOptions };
  });
}

// -------------------------------------------------------------- pokémon ----

export interface MoveRow {
  name: string; // API name
  label: string; // English name
  level: number | null;
  type: TypeRef;
  category: string; // humanized damage class
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  method: string; // API name
  label: string; // humanized
  levelUp: boolean;
  rows: MoveRow[];
}

export interface EvolutionNode {
  name: string; // species API name
  children: EvolutionNode[];
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];
const MISSING_CLASS = "—";

function buildEvolutionTree(node: any): EvolutionNode {
  return {
    name: node.species.name,
    children: (node.evolves_to ?? []).map(buildEvolutionTree),
  };
}

export async function getPokemonPage(name: string, gameParam: string | null) {
  const species = await apiFetch(`pokemon-species/${encodeURIComponent(name)}`);
  if (!species) return null;
  // A species' default Pokémon has the same id as the species.
  const pokemon = await apiFetch(`pokemon/${species.id}`);
  if (!pokemon) return null;

  const typeMap = await getTypeMap();
  const chainId = idFromUrl(species.evolution_chain?.url ?? "");
  const chain = Number.isFinite(chainId) ? await apiFetch(`evolution-chain/${chainId}`) : null;

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const versionGroupNames = new Set<string>();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) versionGroupNames.add(d.version_group.name);
  }
  const versionGroups = (
    await Promise.all([...versionGroupNames].map((n) => apiFetch(`version-group/${n}`)))
  )
    .filter(Boolean)
    .sort((a: any, b: any) => a.order - b.order);

  const selected =
    (gameParam && versionGroups.find((v: any) => v.name === gameParam)) ||
    versionGroups[versionGroups.length - 1] ||
    null;

  // Moves for the selected version group, grouped by learn method.
  let tables: MoveTableData[] = [];
  if (selected) {
    interface RawRow {
      move: string;
      level: number;
      method: string;
    }
    const raw: RawRow[] = [];
    const seen = new Set<string>();
    for (const m of pokemon.moves ?? []) {
      for (const d of m.version_group_details ?? []) {
        if (d.version_group.name !== selected.name) continue;
        const key = `${m.move.name}|${d.move_learn_method.name}|${d.level_learned_at}`;
        if (seen.has(key)) continue;
        seen.add(key);
        raw.push({
          move: m.move.name,
          level: d.level_learned_at,
          method: d.move_learn_method.name,
        });
      }
    }
    const moveRecords = await Promise.all(raw.map((r) => apiFetch(`move/${r.move}`)));
    const byMethod = new Map<string, MoveRow[]>();
    raw.forEach((r, i) => {
      const record = moveRecords[i];
      const row: MoveRow = {
        name: r.move,
        label: (record && enName(record.names)) || humanize(r.move),
        level: r.level,
        type: {
          name: record?.type?.name ?? "unknown",
          label: record?.type?.name ? typeLabel(typeMap, record.type.name) : humanize("unknown"),
        },
        category: record?.damage_class?.name ? humanize(record.damage_class.name) : MISSING_CLASS,
        power: record?.power ?? null,
        accuracy: record?.accuracy ?? null,
        pp: record?.pp ?? null,
      };
      const rows = byMethod.get(r.method) ?? [];
      rows.push(row);
      byMethod.set(r.method, rows);
    });
    const methods = [...byMethod.keys()].sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a);
      const ib = METHOD_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
      return humanize(a).localeCompare(humanize(b));
    });
    tables = methods.map((method) => {
      const rows = byMethod.get(method)!;
      const levelUp = method === "level-up";
      rows.sort((a, b) => {
        if (levelUp && (a.level ?? 0) !== (b.level ?? 0)) return (a.level ?? 0) - (b.level ?? 0);
        return a.label.localeCompare(b.label);
      });
      return { method, label: humanize(method), levelUp, rows };
    });
  }

  const displayName = enName(species.names) ?? humanize(species.name);
  const types: TypeRef[] = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => ({ name: t.type.name, label: typeLabel(typeMap, t.type.name) }));

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    displayName,
    dexId: species.id,
    genus: enGenus(species.genera) ?? "",
    types,
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon.sprites?.front_default ??
      null,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    flavorText: latestEnFlavorText(species.flavor_text_entries) ?? "",
    stats,
    total: stats.reduce((sum: number, s: any) => sum + s.value, 0),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({
        name: a.ability.name,
        label: humanize(a.ability.name),
        hidden: Boolean(a.is_hidden),
      })),
    evolution: chain ? buildEvolutionTree(chain.chain) : null,
    games: versionGroups.map((v: any) => ({ name: v.name, label: humanize(v.name) })),
    selectedGame: selected?.name ?? null,
    moveTables: tables,
  };
}

// ----------------------------------------------------------------- move ----

export async function getMovePage(name: string) {
  const move = await apiFetch(`move/${encodeURIComponent(name)}`);
  if (!move) return null;
  const typeMap = await getTypeMap();
  const learnedBy = await cardsForPokemonRefs(move.learned_by_pokemon ?? []);
  return {
    displayName: enName(move.names) ?? humanize(move.name),
    type: {
      name: move.type?.name ?? "unknown",
      label: move.type?.name ? typeLabel(typeMap, move.type.name) : MISSING_CLASS,
    },
    category: move.damage_class?.name ? humanize(move.damage_class.name) : MISSING_CLASS,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: enShortEffect(move.effect_entries) ?? latestEnFlavorText(move.flavor_text_entries) ?? "—",
    learnedBy,
  };
}

// -------------------------------------------------------------- ability ----

export async function getAbilityPage(name: string) {
  const ability = await apiFetch(`ability/${encodeURIComponent(name)}`);
  if (!ability) return null;
  const bySpecies = new Map<number, CardData>();
  await Promise.all(
    (ability.pokemon ?? []).map(async (entry: any) => {
      const id = idFromUrl(entry.pokemon.url);
      if (!Number.isFinite(id) || isFormId(id)) return;
      const pokemon = await apiFetch(`pokemon/${id}`);
      const card = cardFromPokemonRecord(pokemon);
      if (!card) return;
      const existing = bySpecies.get(card.id);
      if (existing) {
        existing.hidden = existing.hidden || Boolean(entry.is_hidden);
      } else {
        card.hidden = Boolean(entry.is_hidden);
        bySpecies.set(card.id, card);
      }
    }),
  );
  const cards = [...bySpecies.values()].sort((a, b) => a.id - b.id);
  return {
    displayName: enName(ability.names) ?? humanize(ability.name),
    effect: enShortEffect(ability.effect_entries) ?? "—",
    cards,
  };
}

// ----------------------------------------------------------------- type ----

const DAMAGE_RELATIONS: Array<{ term: string; key: string }> = [
  { term: "Super effective against", key: "double_damage_to" },
  { term: "Not very effective against", key: "half_damage_to" },
  { term: "No effect against", key: "no_damage_to" },
  { term: "Weak to", key: "double_damage_from" },
  { term: "Resists", key: "half_damage_from" },
  { term: "Immune to", key: "no_damage_from" },
];

export async function getTypePage(name: string) {
  const type = await apiFetch(`type/${encodeURIComponent(name)}`);
  if (!type) return null;
  const typeMap = await getTypeMap();
  const cards = await cardsForPokemonRefs(
    (type.pokemon ?? []).map((p: any) => p.pokemon),
  );
  const relations = DAMAGE_RELATIONS.map(({ term, key }) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map((t: any) => ({
      name: t.name,
      label: typeLabel(typeMap, t.name),
    })),
  }));
  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label));
  return {
    displayName: enName(type.names) ?? humanize(type.name),
    relations,
    cards,
    moves,
  };
}
