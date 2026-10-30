// Server-only access to the PokeAPI server. Every response is fetched at request time
// and kept in a short-lived in-memory cache (with in-flight de-duplication).
import { humanize } from "../format";
import type {
  AbilityDetail,
  Card,
  EvolutionNode,
  HomeFilters,
  HomeResult,
  MoveDetail,
  MoveRow,
  MoveTableData,
  Named,
  PokemonDetail,
  TeamDetails,
  TypeDetail,
} from "../types";

const TTL_MS = 60_000;
const MAX_FORM_ID = 10000;
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
export const PAGE_SIZE = 48;

const apiBase = () => (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");

type Entry = { expires: number; value: Promise<any> };
const cache = new Map<string, Entry>();
let writes = 0;

function sweep(now: number) {
  for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
}

/** GET /api/v2/<path>. Resolves to null on 404. */
async function api<T = any>(path: string): Promise<T | null> {
  const url = `${apiBase()}/api/v2/${path.replace(/^\/+/, "")}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;
  const value = (async () => {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) throw new Error(`PokeAPI ${res.status} for ${url}`);
    return res.json();
  })();
  cache.set(url, { expires: now + TTL_MS, value });
  value.catch(() => cache.delete(url));
  if (++writes % 500 === 0) sweep(now);
  return value;
}

const seg = (name: string) => encodeURIComponent(name.toLowerCase());

/** Numeric ID at the end of a resource URL (absolute or relative). */
const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

type LangEntry = { language: { name: string } };
const english = <T extends LangEntry>(entries: T[] | undefined): T | undefined =>
  entries?.find((e) => e.language.name === "en");
const latestEnglish = <T extends LangEntry>(entries: T[] | undefined): T | undefined =>
  entries?.filter((e) => e.language.name === "en").at(-1);
const englishName = (record: { name: string; names?: ({ name: string } & LangEntry)[] }) =>
  english(record.names)?.name ?? humanize(record.name);
const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Shared lookups

async function listAll(resource: string): Promise<{ name: string; url: string }[]> {
  const page = await api<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000&offset=0`);
  return page?.results ?? [];
}

/** species ID -> species name */
async function speciesNames(): Promise<Map<number, string>> {
  const list = await listAll("pokemon-species");
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

async function allTypes() {
  const list = (await listAll("type")).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await mapLimit(list, 18, (t) => api(`type/${idFromUrl(t.url)}/`));
  return records.filter(Boolean) as any[];
}

async function typeLabels(): Promise<Map<string, string>> {
  const records = await allTypes();
  return new Map(records.map((t) => [t.name, englishName(t)]));
}

const typeNamed = (labels: Map<string, string>, name: string): Named => ({
  name,
  label: labels.get(name) ?? humanize(name),
});

function card(id: number, species: Map<number, string>, fallbackName: string): Card {
  const name = species.get(id) ?? fallbackName;
  return { id, name, label: humanize(name), sprite: `${apiBase()}/media/sprites/pokemon/${id}.png` };
}

/** Cards for Pokémon references, mapped to species, without alternate forms, ordered by dex number. */
async function cardsFor<T extends { pokemon: { name: string; url: string } }>(
  refs: T[],
  extra?: (ref: T) => Partial<Card>,
): Promise<Card[]> {
  const species = await speciesNames();
  const seen = new Map<number, Card>();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (!(id > 0 && id < MAX_FORM_ID) || seen.has(id)) continue;
    seen.set(id, { ...card(id, species, ref.pokemon.name), ...extra?.(ref) });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Home

async function generations() {
  const list = await listAll("generation");
  const records = (await mapLimit(list, 10, (g) => api(`generation/${idFromUrl(g.url)}/`))).filter(Boolean) as any[];
  return records.sort((a, b) => a.id - b.id);
}

export async function homeFilters(): Promise<HomeFilters> {
  const [types, gens] = await Promise.all([allTypes(), generations()]);
  return {
    types: types.map((t) => ({ name: t.name, label: englishName(t) })),
    generations: gens.map((g) => ({ name: g.name, label: englishName(g) })),
  };
}

export async function homeList(q: string, type: string, generation: string, page: number): Promise<HomeResult> {
  const [species, types, gens] = await Promise.all([listAll("pokemon-species"), allTypes(), generations()]);

  const typesById = new Map<number, { slot: number; type: Named }[]>();
  for (const t of types) {
    const named = { name: t.name, label: englishName(t) };
    for (const p of t.pokemon as { slot: number; pokemon: { url: string } }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!(id < MAX_FORM_ID)) continue;
      const slots = typesById.get(id) ?? [];
      slots.push({ slot: p.slot, type: named });
      typesById.set(id, slots);
    }
  }

  let genIds: Set<number> | null = null;
  if (generation) {
    const gen = gens.find((g) => g.name === generation);
    genIds = new Set((gen?.pokemon_species ?? []).map((s: { url: string }) => idFromUrl(s.url)));
  }

  const needle = q.trim().toLowerCase();
  const matches = species
    .map((s) => ({ id: idFromUrl(s.url), name: s.name, label: humanize(s.name) }))
    .filter((s) => s.id > 0 && s.id < MAX_FORM_ID)
    .filter((s) => !needle || s.label.toLowerCase().includes(needle))
    .filter((s) => !genIds || genIds.has(s.id))
    .filter((s) => !type || (typesById.get(s.id) ?? []).some((t) => t.type.name === type))
    .sort((a, b) => a.id - b.id);

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const items = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((s) => ({
    id: s.id,
    name: s.name,
    label: s.label,
    sprite: `${apiBase()}/media/sprites/pokemon/${s.id}.png`,
    types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
  }));
  return { count: matches.length, page: current, pages, items };
}

// ---------------------------------------------------------------------------
// Pokémon

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

async function speciesAndPokemon(name: string) {
  const species = await api(`pokemon-species/${seg(name)}/`);
  if (!species) return null;
  const pokemon = await api(`pokemon/${species.id}/`);
  if (!pokemon) return null;
  return { species, pokemon };
}

function evolutionTree(node: any): EvolutionNode {
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(evolutionTree),
  };
}

async function versionGroupOrder(names: string[]): Promise<Map<string, number>> {
  const records = await mapLimit(names, 16, (n) => api(`version-group/${seg(n)}/`));
  return new Map(names.map((n, i) => [n, records[i]?.order ?? Number.MAX_SAFE_INTEGER]));
}

export async function pokemonDetail(name: string): Promise<PokemonDetail | null> {
  const found = await speciesAndPokemon(name);
  if (!found) return null;
  const { species, pokemon } = found;

  const chainId = species.evolution_chain?.url ? idFromUrl(species.evolution_chain.url) : null;
  const [labels, chain] = await Promise.all([typeLabels(), chainId ? api(`evolution-chain/${chainId}/`) : null]);

  const gameNames = [
    ...new Set<string>(
      (pokemon.moves ?? []).flatMap((m: any) => m.version_group_details.map((d: any) => d.version_group.name)),
    ),
  ];
  const order = await versionGroupOrder(gameNames);
  gameNames.sort((a, b) => order.get(a)! - order.get(b)! || a.localeCompare(b));

  const flavor = latestEnglish<{ flavor_text: string } & LangEntry>(species.flavor_text_entries);

  return {
    id: species.id,
    name: species.name,
    label: englishName(species),
    genus: english<{ genus: string } & LangEntry>(species.genera)?.genus ?? "",
    types: [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => typeNamed(labels, t.type.name)),
    artwork: pokemon.sprites?.other?.["official-artwork"]?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: pokemon.height,
    weight: pokemon.weight,
    flavor: flavor ? collapse(flavor.flavor_text) : "",
    stats: pokemon.stats.map((s: any) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat })),
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain?.chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    games: gameNames.map((n) => ({ name: n, label: humanize(n) })),
  };
}

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export async function pokemonMoves(name: string, game: string): Promise<MoveTableData[] | null> {
  const found = await speciesAndPokemon(name);
  if (!found) return null;
  const entries: { move: string; method: string; level: number }[] = [];
  for (const m of found.pokemon.moves ?? []) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      entries.push({ move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }

  const moveNames = [...new Set(entries.map((e) => e.move))];
  const [labels, records] = await Promise.all([typeLabels(), mapLimit(moveNames, 24, (n) => api(`move/${seg(n)}/`))]);
  const moves = new Map(moveNames.map((n, i) => [n, records[i]]));

  const byMethod = new Map<string, MoveRow[]>();
  const seen = new Set<string>();
  for (const e of entries) {
    const key = `${e.method}|${e.move}|${e.method === "level-up" ? e.level : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const move = moves.get(e.move);
    const row: MoveRow = {
      level: e.method === "level-up" ? e.level : null,
      name: e.move,
      label: move ? englishName(move) : humanize(e.move),
      type: typeNamed(labels, move?.type?.name ?? "unknown"),
      category: move?.damage_class?.name ? humanize(move.damage_class.name) : "",
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
    const rows = byMethod.get(e.method) ?? [];
    rows.push(row);
    byMethod.set(e.method, rows);
  }

  const rank = (m: string) => {
    const i = METHOD_ORDER.indexOf(m);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  return [...byMethod.entries()]
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Team

export async function teamDetails(names: string[]): Promise<TeamDetails> {
  const requested = [...new Set(names.map((name) => name.toLowerCase()))].slice(0, 6);
  const [species, types] = await Promise.all([speciesNames(), allTypes()]);
  const idByName = new Map([...species].map(([id, name]) => [name, id]));

  const typesById = new Map<number, { slot: number; type: Named }[]>();
  for (const t of types) {
    const named = { name: t.name, label: englishName(t) };
    for (const p of t.pokemon as { slot: number; pokemon: { url: string } }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!(id > 0 && id < MAX_FORM_ID)) continue;
      const slots = typesById.get(id) ?? [];
      slots.push({ slot: p.slot, type: named });
      typesById.set(id, slots);
    }
  }

  const cards: Card[] = [];
  for (const name of requested) {
    const id = idByName.get(name);
    if (!id) continue;
    cards.push({
      id,
      name,
      label: humanize(name),
      sprite: `${apiBase()}/media/sprites/pokemon/${id}.png`,
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((entry) => entry.type),
    });
  }

  const coverage = types.map((attacking) => {
    const relations = attacking.damage_relations ?? {};
    const double = new Set<string>((relations.double_damage_to ?? []).map((t: { name: string }) => t.name));
    const half = new Set<string>((relations.half_damage_to ?? []).map((t: { name: string }) => t.name));
    const none = new Set<string>((relations.no_damage_to ?? []).map((t: { name: string }) => t.name));

    let weak = 0;
    let resistant = 0;
    for (const card of cards) {
      const multiplier = (card.types ?? []).reduce((value, memberType) => {
        if (double.has(memberType.name)) return value * 2;
        if (half.has(memberType.name)) return value * 0.5;
        if (none.has(memberType.name)) return value * 0;
        return value;
      }, 1);
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }

    return { name: attacking.name, label: englishName(attacking), weak, resistant };
  });

  return { cards, coverage };
}

// ---------------------------------------------------------------------------
// Moves, abilities, types

export async function moveDetail(name: string): Promise<MoveDetail | null> {
  const move = await api(`move/${seg(name)}/`);
  if (!move) return null;
  const labels = await typeLabels();
  const short = english<{ short_effect: string } & LangEntry>(move.effect_entries)?.short_effect;
  const flavor = latestEnglish<{ flavor_text: string } & LangEntry>(move.flavor_text_entries)?.flavor_text;
  const effect = short
    ? collapse(short.replaceAll("$effect_chance", String(move.effect_chance ?? "")))
    : flavor
      ? collapse(flavor)
      : "";
  return {
    name: move.name,
    label: englishName(move),
    type: typeNamed(labels, move.type.name),
    category: move.damage_class?.name ? humanize(move.damage_class.name) : "",
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learnedBy: await cardsFor((move.learned_by_pokemon ?? []).map((p: any) => ({ pokemon: p }))),
  };
}

export async function abilityDetail(name: string): Promise<AbilityDetail | null> {
  const ability = await api(`ability/${seg(name)}/`);
  if (!ability) return null;
  const short = english<{ short_effect: string } & LangEntry>(ability.effect_entries)?.short_effect;
  const flavor = latestEnglish<{ flavor_text: string } & LangEntry>(ability.flavor_text_entries)?.flavor_text;
  return {
    name: ability.name,
    label: englishName(ability),
    effect: collapse(short ?? flavor ?? ""),
    pokemon: await cardsFor(ability.pokemon ?? [], (p: any) => ({ hidden: !!p.is_hidden })),
  };
}

export async function typeList(): Promise<Named[]> {
  return (await allTypes()).map((t) => ({ name: t.name, label: englishName(t) }));
}

const RELATIONS: [string, string][] = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
];

export async function typeDetail(name: string): Promise<TypeDetail | null> {
  const type = await api(`type/${seg(name)}/`);
  if (!type) return null;
  const labels = await typeLabels();
  const rel = type.damage_relations ?? {};
  return {
    name: type.name,
    label: englishName(type),
    relations: RELATIONS.map(([term, key]) => ({
      term,
      types: (rel[key] ?? []).map((t: { name: string }) => typeNamed(labels, t.name)),
    })),
    pokemon: await cardsFor(type.pokemon ?? []),
    moves: (type.moves ?? [])
      .map((m: { name: string }) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a: Named, b: Named) => a.label.localeCompare(b.label)),
  };
}
