import { query } from "@solidjs/router";
import { apiFetch, fetchMany } from "./api";
import {
  enName,
  enShortEffect,
  humanize,
  idFromUrl,
  isDefaultPokemonId,
  latestEnFlavor,
} from "./format";

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export type TypeInfo = { name: string; en: string };
export type SpeciesEntry = {
  id: number;
  name: string;
  types: TypeInfo[];
  generation: string | null;
};
export type PokedexIndex = {
  species: SpeciesEntry[];
  types: TypeInfo[];
  generations: { name: string; en: string }[];
  /** species id -> species API name */
  nameById: Record<number, string>;
  /** type API name -> English name (covers all types the API returns) */
  typeEn: Record<string, string>;
};

let indexPromise: Promise<PokedexIndex> | null = null;

/**
 * The species index powering the list page and all Pokémon cards.
 * Built from the species list plus the generation and type records, which
 * together describe every species' generation and default Pokémon's types.
 */
export function loadIndex(): Promise<PokedexIndex> {
  if (!indexPromise) {
    indexPromise = (async (): Promise<PokedexIndex> => {
      const [speciesList, genList, typeList] = await Promise.all([
        apiFetch("/pokemon-species/?limit=100000"),
        apiFetch("/generation/?limit=100"),
        apiFetch("/type/?limit=100"),
      ]);
      const typeRefs = (typeList?.results ?? []).filter((t: any) => !EXCLUDED_TYPES.has(t.name));
      const [gens, types] = await Promise.all([
        fetchMany((genList?.results ?? []).map((g: any) => `/generation/${idFromUrl(g.url)}`)),
        fetchMany(typeRefs.map((t: any) => `/type/${idFromUrl(t.url)}`)),
      ]);

      const generations = gens.filter(Boolean).map((g: any) => ({ name: g.name, en: enName(g) }));
      const genBySpecies = new Map<string, string>();
      for (const g of gens) {
        if (!g) continue;
        for (const s of g.pokemon_species ?? []) genBySpecies.set(s.name, g.name);
      }

      const typesInfo: TypeInfo[] = types.filter(Boolean).map((t: any) => ({ name: t.name, en: enName(t) }));
      const typeEn: Record<string, string> = {};
      for (const t of typesInfo) typeEn[t.name] = t.en;

      const typesByPokemon = new Map<number, { slot: number; name: string }[]>();
      for (const t of types) {
        if (!t) continue;
        for (const p of t.pokemon ?? []) {
          const id = idFromUrl(p.pokemon?.url);
          if (!isDefaultPokemonId(id)) continue;
          const arr = typesByPokemon.get(id) ?? [];
          arr.push({ slot: p.slot, name: t.name });
          typesByPokemon.set(id, arr);
        }
      }

      const species: SpeciesEntry[] = (speciesList?.results ?? [])
        .map((s: any) => {
          const id = idFromUrl(s.url);
          const ts = (typesByPokemon.get(id) ?? [])
            .sort((a, b) => a.slot - b.slot)
            .map((t) => ({ name: t.name, en: typeEn[t.name] ?? humanize(t.name) }));
          return { id, name: s.name, types: ts, generation: genBySpecies.get(s.name) ?? null };
        })
        .sort((a, b) => a.id - b.id);

      const nameById: Record<number, string> = {};
      for (const s of species) nameById[s.id] = s.name;

      return { species, types: typesInfo, generations, nameById, typeEn };
    })();
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }
  return indexPromise;
}

export const getIndex = query(() => loadIndex(), "pokedex-index");

/** Map a list of Pokémon references to card data (species name, dex number). */
function refsToCards(refs: { url: string }[], index: PokedexIndex) {
  const seen = new Set<number>();
  const cards: { id: number; name: string }[] = [];
  for (const ref of refs ?? []) {
    const id = idFromUrl(ref?.url);
    if (!isDefaultPokemonId(id) || seen.has(id)) continue;
    seen.add(id);
    const name = index.nameById[id];
    if (!name) continue;
    cards.push({ id, name });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}

// ---------------------------------------------------------------------------
// Pokémon page

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

function evoTree(node: any): { name: string; children: any[] } {
  return {
    name: node?.species?.name ?? "",
    children: (node?.evolves_to ?? []).map(evoTree),
  };
}

export const getPokemonPage = query(async (name: string, game?: string) => {
  const species = await apiFetch(`/pokemon-species/${encodeURIComponent(name)}`);
  if (!species) return null;
  const defaultVariety =
    species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  if (!defaultVariety) return null;
  const pokemon = await apiFetch(`/pokemon/${defaultVariety.pokemon.name}`);
  if (!pokemon) return null;

  const [evo, index] = await Promise.all([
    apiFetch(`/evolution-chain/${idFromUrl(species.evolution_chain?.url)}`),
    loadIndex(),
  ]);

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const vgNames = new Set<string>();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) vgNames.add(d.version_group.name);
  }
  const vgs = await fetchMany([...vgNames].map((n) => `/version-group/${n}`));
  const vgOrder = new Map<string, number>(vgs.filter(Boolean).map((v: any) => [v.name, v.order]));
  const games = [...vgNames].sort((a, b) => (vgOrder.get(a) ?? 0) - (vgOrder.get(b) ?? 0));
  const selectedGame = game && vgNames.has(game) ? game : games[games.length - 1] ?? null;

  // Move rows for the selected version group, one row per (move, method, level).
  const rawRows: { method: string; level: number; move: string }[] = [];
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== selectedGame) continue;
      rawRows.push({
        method: d.move_learn_method.name,
        level: d.level_learned_at ?? 0,
        move: m.move.name,
      });
    }
  }
  const uniqueMoves = [...new Set(rawRows.map((r) => r.move))];
  const moveRecs = await fetchMany(uniqueMoves.map((n) => `/move/${n}`));
  const moveByName = new Map<string, any>(moveRecs.filter(Boolean).map((m: any) => [m.name, m]));

  const rowsByMethod = new Map<string, any[]>();
  for (const r of rawRows) {
    const rec = moveByName.get(r.move);
    if (!rec) continue;
    const row = {
      level: r.level,
      move: r.move,
      moveEn: enName(rec),
      type: rec.type?.name ?? "",
      typeEn: index.typeEn[rec.type?.name] ?? humanize(rec.type?.name ?? ""),
      category: rec.damage_class?.name ? humanize(rec.damage_class.name) : "—",
      power: rec.power ?? null,
      accuracy: rec.accuracy ?? null,
      pp: rec.pp ?? null,
    };
    const arr = rowsByMethod.get(r.method) ?? [];
    arr.push(row);
    rowsByMethod.set(r.method, arr);
  }

  const methods = [...rowsByMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    }
    return humanize(a).localeCompare(humanize(b));
  });

  const tables = methods.map((method) => {
    const rows = rowsByMethod.get(method)!;
    rows.sort((a, b) =>
      method === "level-up"
        ? a.level - b.level || a.moveEn.localeCompare(b.moveEn)
        : a.moveEn.localeCompare(b.moveEn),
    );
    return { method, methodEn: humanize(method), hasLevel: method === "level-up", rows };
  });

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat?.name] ?? humanize(s.stat?.name ?? ""),
    value: s.base_stat,
  }));
  const total = stats.reduce((sum: number, s: any) => sum + s.value, 0);

  const types = (pokemon.types ?? [])
    .slice()
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => ({
      name: t.type.name,
      en: index.typeEn[t.type.name] ?? humanize(t.type.name),
    }));

  const artwork =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  return {
    id: species.id,
    name: species.name,
    en: enName(species),
    genus: species.genera?.find((g: any) => g?.language?.name === "en")?.genus ?? "",
    types,
    artwork,
    height: pokemon.height,
    weight: pokemon.weight,
    flavor: latestEnFlavor(species.flavor_text_entries) ?? "—",
    stats,
    total,
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, hidden: !!a.is_hidden })),
    evolution: evo ? evoTree(evo.chain) : { name: species.name, children: [] },
    games: games.map((g) => ({ name: g, en: humanize(g) })),
    selectedGame,
    tables,
  };
}, "pokemon-page");

// ---------------------------------------------------------------------------
// Move page

export const getMovePage = query(async (name: string) => {
  const move = await apiFetch(`/move/${encodeURIComponent(name)}`);
  if (!move) return null;
  const index = await loadIndex();
  return {
    en: enName(move),
    type: {
      name: move.type?.name ?? "",
      en: index.typeEn[move.type?.name] ?? humanize(move.type?.name ?? ""),
    },
    category: move.damage_class?.name ? humanize(move.damage_class.name) : "—",
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: enShortEffect(move.effect_entries) ?? latestEnFlavor(move.flavor_text_entries) ?? "—",
    cards: refsToCards(move.learned_by_pokemon ?? [], index),
  };
}, "move-page");

// ---------------------------------------------------------------------------
// Ability page

export const getAbilityPage = query(async (name: string) => {
  const ability = await apiFetch(`/ability/${encodeURIComponent(name)}`);
  if (!ability) return null;
  const index = await loadIndex();
  const byId = new Map<number, { id: number; name: string; hiddenEntries: boolean[] }>();
  for (const p of ability.pokemon ?? []) {
    const id = idFromUrl(p.pokemon?.url);
    if (!isDefaultPokemonId(id)) continue;
    const speciesName = index.nameById[id];
    if (!speciesName) continue;
    const entry = byId.get(id) ?? { id, name: speciesName, hiddenEntries: [] };
    entry.hiddenEntries.push(!!p.is_hidden);
    byId.set(id, entry);
  }
  const cards = [...byId.values()]
    .map((e) => ({ id: e.id, name: e.name, hidden: e.hiddenEntries.every(Boolean) }))
    .sort((a, b) => a.id - b.id);
  return {
    en: enName(ability),
    effect: enShortEffect(ability.effect_entries) ?? "—",
    cards,
  };
}, "ability-page");

// ---------------------------------------------------------------------------
// Type page

const RELATION_TERMS: { term: string; key: string }[] = [
  { term: "Super effective against", key: "double_damage_to" },
  { term: "Not very effective against", key: "half_damage_to" },
  { term: "No effect against", key: "no_damage_to" },
  { term: "Weak to", key: "double_damage_from" },
  { term: "Resists", key: "half_damage_from" },
  { term: "Immune to", key: "no_damage_from" },
];

export const getTypePage = query(async (name: string) => {
  const type = await apiFetch(`/type/${encodeURIComponent(name)}`);
  if (!type) return null;
  const index = await loadIndex();
  const typeName = (t: any) => index.typeEn[t?.name] ?? humanize(t?.name ?? "");
  const relations = RELATION_TERMS.map(({ term, key }) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map((t: any) => ({ name: t.name, en: typeName(t) })),
  }));
  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name, en: humanize(m.name) }))
    .sort((a: any, b: any) => a.en.localeCompare(b.en));
  return {
    en: enName(type),
    relations,
    cards: refsToCards((type.pokemon ?? []).map((p: any) => p.pokemon), index),
    moves,
  };
}, "type-page");
