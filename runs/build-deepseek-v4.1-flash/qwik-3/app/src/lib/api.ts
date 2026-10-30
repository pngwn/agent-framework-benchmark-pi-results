/* Server-side access to the local PokeAPI. Everything is fetched at request time
   and cached in memory for the lifetime of the server process. */

const g = globalThis as any;
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
const cache: Map<string, Promise<any>> = (g.__pokedexApiCache ??= new Map());

import { humanize } from './format';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export type Ref = { name: string; url: string };
export type HomeCard = {
  id: number;
  name: string;
  generation: string | null;
  types: string[];
  sprite: string;
};
export type PokemonCard = {
  id: number;
  name: string;
  sprite: string;
  hidden?: boolean;
};
export type MoveRow = {
  level: number | null;
  move: string;
  moveLabel: string;
  type: string | null;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};
export type MoveTable = {
  method: string;
  label: string;
  rows: MoveRow[];
};

export function idFromUrl(url: string): number {
  const match = String(url || '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

export function englishName(names: any[] | undefined, fallback: string): string {
  return names?.find((entry) => entry.language?.name === 'en')?.name || fallback;
}

export function latestFlavor(entries: any[] | undefined): string | null {
  if (!entries?.length) return null;
  const english = entries.filter((entry) => entry.language?.name === 'en');
  if (!english.length) return null;
  const text = english[english.length - 1].flavor_text;
  return text ? String(text).replace(/\s+/g, ' ').trim() : null;
}

export function spriteUrl(id: number): string {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

function apiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/api/v2/')) return API_BASE + pathOrUrl;
  return `${API_BASE}/api/v2/${pathOrUrl.replace(/^\//, '')}`;
}

async function fetchJson(pathOrUrl: string): Promise<any | null> {
  const url = apiUrl(pathOrUrl);
  if (!cache.has(url)) {
    const promise = (async () => {
      const response = await fetch(url, { headers: { accept: 'application/json' } });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`API request failed (${response.status}) for ${url}`);
      return response.json();
    })();
    cache.set(url, promise);
  }
  try {
    return await cache.get(url)!;
  } catch (error) {
    cache.delete(url);
    throw error;
  }
}

async function loadSpeciesIndex() {
  const data = await fetchJson('pokemon-species/?limit=100000');
  const entries: { id: number; name: string }[] = [];
  const byId = new Map<number, string>();
  for (const item of data?.results ?? []) {
    const id = idFromUrl(item.url);
    if (!id || !item.name) continue;
    entries.push({ id, name: item.name });
    byId.set(id, item.name);
  }
  entries.sort((a, b) => a.id - b.id);
  return { entries, byId };
}

export async function getSpeciesIndex() {
  return loadSpeciesIndex();
}

type TypeInfo = { id: number; name: string; label: string; detail: any };

async function loadTypeIndex(): Promise<TypeInfo[]> {
  const list = await fetchJson('type/?limit=100');
  const refs: Ref[] = (list?.results ?? []).filter((item: Ref) => !EXCLUDED_TYPES.has(item.name));
  const details = await Promise.all(refs.map((item) => fetchJson(item.url)));
  const result: TypeInfo[] = [];
  refs.forEach((item, index) => {
    const detail = details[index];
    if (!detail) return;
    result.push({
      id: idFromUrl(item.url),
      name: item.name,
      label: englishName(detail.names, humanize(item.name)),
      detail,
    });
  });
  return result;
}

export async function getTypeIndex(): Promise<TypeInfo[]> {
  return loadTypeIndex();
}

async function loadGenerations() {
  const list = await fetchJson('generation/?limit=100');
  const refs: Ref[] = list?.results ?? [];
  const details = await Promise.all(refs.map((item) => fetchJson(item.url)));
  const generations = refs
    .map((item, index) => {
      const detail = details[index];
      if (!detail) return null;
      return {
        id: idFromUrl(item.url),
        name: item.name,
        label: englishName(detail.names, humanize(item.name)),
        species: (detail.pokemon_species ?? []) as Ref[],
      };
    })
    .filter(Boolean) as { id: number; name: string; label: string; species: Ref[] }[];
  generations.sort((a, b) => a.id - b.id);
  return generations;
}

async function loadHomeIndex() {
  const [species, types, generations] = await Promise.all([
    loadSpeciesIndex(),
    loadTypeIndex(),
    loadGenerations(),
  ]);

  const generationBySpecies = new Map<number, string>();
  for (const generation of generations) {
    for (const entry of generation.species) {
      const id = idFromUrl(entry.url);
      if (id > 10000 || !species.byId.has(id)) continue;
      generationBySpecies.set(id, generation.name);
    }
  }

  const typesByPokemon = new Map<number, { slot: number; name: string }[]>();
  for (const type of types) {
    for (const entry of type.detail.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon?.url);
      if (!id || id > 10000 || !species.byId.has(id)) continue;
      const current = typesByPokemon.get(id) ?? [];
      if (!current.some((item) => item.name === type.name)) {
        current.push({ slot: entry.slot ?? current.length + 1, name: type.name });
      }
      typesByPokemon.set(id, current);
    }
  }

  const cards: HomeCard[] = species.entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    generation: generationBySpecies.get(entry.id) ?? null,
    types: (typesByPokemon.get(entry.id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((item) => item.name),
    sprite: spriteUrl(entry.id),
  }));

  return {
    cards,
    types: types.map((type) => ({ name: type.name, label: type.label })),
    generations: generations.map((generation) => ({ name: generation.name, label: generation.label })),
  };
}

export async function getHomeIndex() {
  return loadHomeIndex();
}

async function cardsFromPokemonRefs(
  refs: any[] | undefined,
  hiddenFor?: (entry: any) => boolean,
): Promise<PokemonCard[]> {
  const species = await loadSpeciesIndex();
  const cards = new Map<number, PokemonCard>();
  for (const entry of refs ?? []) {
    const id = idFromUrl(entry.pokemon?.url ?? entry.url);
    if (!id || id > 10000 || !species.byId.has(id)) continue;
    let card = cards.get(id);
    if (!card) {
      card = { id, name: species.byId.get(id)!, sprite: spriteUrl(id) };
      cards.set(id, card);
    }
    if (hiddenFor?.(entry)) card.hidden = true;
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

export async function getMovePage(name: string) {
  const move = await fetchJson(`move/${encodeURIComponent(name)}/`);
  if (!move) return null;

  const types = await loadTypeIndex();
  const typeName = move.type?.name ?? null;
  const typeLabel = types.find((item) => item.name === typeName)?.label ?? (typeName ? humanize(typeName) : '—');
  const shortEffect = move.effect_entries?.find((entry: any) => entry.language?.name === 'en')?.short_effect;
  const effect = shortEffect || latestFlavor(move.flavor_text_entries) || '—';
  const learned = await cardsFromPokemonRefs(move.learned_by_pokemon);

  return {
    notFound: false as const,
    id: move.id as number,
    name: move.name as string,
    englishName: englishName(move.names, humanize(move.name)),
    type: typeName,
    typeLabel,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: (move.power ?? null) as number | null,
    accuracy: (move.accuracy ?? null) as number | null,
    pp: (move.pp ?? null) as number | null,
    effect: effect as string,
    learned,
  };
}

export async function getAbilityPage(name: string) {
  const ability = await fetchJson(`ability/${encodeURIComponent(name)}/`);
  if (!ability) return null;

  const shortEffect = ability.effect_entries?.find((entry: any) => entry.language?.name === 'en')?.short_effect;
  const pokemon = await cardsFromPokemonRefs(ability.pokemon, (entry) => !!entry.is_hidden);

  return {
    notFound: false as const,
    id: ability.id as number,
    name: ability.name as string,
    englishName: englishName(ability.names, humanize(ability.name)),
    effect: (shortEffect || '—') as string,
    pokemon,
  };
}

export async function getTypePage(name: string) {
  if (EXCLUDED_TYPES.has(name)) return null;
  const types = await loadTypeIndex();
  const type = types.find((item) => item.name === name);
  if (!type) return null;

  const labelFor = (relatedName: string) =>
    types.find((item) => item.name === relatedName)?.label ?? humanize(relatedName);
  const relation = (key: string) =>
    (type.detail.damage_relations?.[key] ?? []).map((entry: Ref) => ({
      name: entry.name,
      label: labelFor(entry.name),
    }));

  const relations = [
    { term: 'Super effective against', key: 'double_damage_to' },
    { term: 'Not very effective against', key: 'half_damage_to' },
    { term: 'No effect against', key: 'no_damage_to' },
    { term: 'Weak to', key: 'double_damage_from' },
    { term: 'Resists', key: 'half_damage_from' },
    { term: 'Immune to', key: 'no_damage_from' },
  ].map(({ term, key }) => ({ term, types: relation(key) }));

  const pokemon = await cardsFromPokemonRefs(type.detail.pokemon);
  const moves = (type.detail.moves ?? [])
    .map((entry: Ref) => ({ name: entry.name, label: humanize(entry.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

  return {
    notFound: false as const,
    id: type.id,
    name: type.name,
    englishName: type.label,
    relations,
    pokemon,
    moves,
  };
}

const VERSION_GROUP_CACHE_KEY = '__pokedexVersionGroups';

async function getVersionGroup(name: string) {
  const groups: Map<string, Promise<any>> = (g[VERSION_GROUP_CACHE_KEY] ??= new Map());
  if (!groups.has(name)) {
    groups.set(name, fetchJson(`version-group/${encodeURIComponent(name)}/`));
  }
  return groups.get(name)!;
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function evolutionTree(node: any): any {
  return {
    name: node.species?.name ?? '',
    children: (node.evolves_to ?? []).map(evolutionTree),
  };
}

export async function getPokemonPage(name: string, gameQuery?: string | null) {
  const species = await fetchJson(`pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return null;

  const defaultVariety =
    species.varieties?.find((variety: any) => variety.is_default)?.pokemon ||
    species.varieties?.[0]?.pokemon;
  const pokemon = await fetchJson(defaultVariety?.url ?? `pokemon/${species.id}/`);
  if (!pokemon) return null;

  const types = await loadTypeIndex();
  const labelForType = (typeName: string) =>
    types.find((item) => item.name === typeName)?.label ?? humanize(typeName);

  const evolutionChain = await fetchJson(species.evolution_chain?.url ?? 'evolution-chain/1/');

  const gameNames = [
    ...new Set<string>(
      (pokemon.moves ?? []).flatMap((move: any) =>
        (move.version_group_details ?? []).map((detail: any) => detail.version_group.name),
      ),
    ),
  ];
  const versionGroups = (await Promise.all(gameNames.map((gameName) => getVersionGroup(gameName))))
    .filter(Boolean)
    .map((detail: any) => ({
      name: detail.name as string,
      order: Number(detail.order ?? 0),
      label: humanize(detail.name),
    }))
    .sort((a: any, b: any) => a.order - b.order);

  const selectedGame =
    (gameQuery && versionGroups.some((group: any) => group.name === gameQuery) ? gameQuery : null) ||
    versionGroups[versionGroups.length - 1]?.name ||
    null;

  const entriesByMethod = new Map<string, Map<string, { move: string; level: number | null }>>();
  if (selectedGame) {
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group?.name !== selectedGame) continue;
        const method = detail.move_learn_method?.name || 'other';
        const level = detail.level_learned_at ?? null;
        const methodEntries = entriesByMethod.get(method) ?? new Map();
        const key = move.move.name;
        const existing = methodEntries.get(key);
        if (!existing || (level !== null && (existing.level === null || level < existing.level))) {
          methodEntries.set(key, { move: move.move.name, level });
        }
        entriesByMethod.set(method, methodEntries);
      }
    }
  }

  const moveNames = [
    ...new Set(
      [...entriesByMethod.values()].flatMap((entries) => [...entries.values()].map((entry) => entry.move)),
    ),
  ];
  const moveDetails = await Promise.all(moveNames.map((moveName) => fetchJson(`move/${encodeURIComponent(moveName)}/`)));
  const moveByName = new Map<string, any>();
  moveNames.forEach((moveName, index) => moveByName.set(moveName, moveDetails[index]));

  const tables: MoveTable[] = [...entriesByMethod.entries()]
    .map(([method, entries]) => {
      const rows: MoveRow[] = [...entries.values()].map((entry) => {
        const detail = moveByName.get(entry.move);
        const typeName = detail?.type?.name ?? null;
        return {
          level: entry.level,
          move: entry.move,
          moveLabel: detail ? englishName(detail.names, humanize(entry.move)) : humanize(entry.move),
          type: typeName,
          typeLabel: typeName ? labelForType(typeName) : '—',
          category: detail?.damage_class?.name ? humanize(detail.damage_class.name) : '—',
          power: (detail?.power ?? null) as number | null,
          accuracy: (detail?.accuracy ?? null) as number | null,
          pp: (detail?.pp ?? null) as number | null,
        };
      });
      return { method, label: humanize(method), rows };
    })
    .filter((table) => table.rows.length > 0)
    .sort((a, b) => {
      const ai = METHOD_ORDER.indexOf(a.method);
      const bi = METHOD_ORDER.indexOf(b.method);
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      return a.label.localeCompare(b.label);
    });

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat?.name ?? '',
    label: STAT_LABELS[entry.stat?.name] ?? humanize(entry.stat?.name ?? ''),
    value: Number(entry.base_stat ?? 0),
  }));

  return {
    notFound: false as const,
    id: species.id as number,
    name: species.name as string,
    englishName: englishName(species.names, humanize(species.name)),
    genus: species.genera?.find((entry: any) => entry.language?.name === 'en')?.genus ?? '',
    flavor: latestFlavor(species.flavor_text_entries) || '—',
    height: Number(pokemon.height ?? 0) / 10,
    weight: Number(pokemon.weight ?? 0) / 10,
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ||
      pokemon.sprites?.other?.home?.front_default ||
      spriteUrl(pokemon.id),
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((entry: any) => ({ name: entry.type.name, label: labelForType(entry.type.name) })),
    stats,
    total: stats.reduce((sum: number, stat: any) => sum + stat.value, 0),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => (a.slot ?? 0) - (b.slot ?? 0))
      .map((entry: any) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: !!entry.is_hidden,
      })),
    evolution: evolutionChain?.chain ? evolutionTree(evolutionChain.chain) : null,
    games: versionGroups.map((group: any) => ({ name: group.name, label: group.label })),
    selectedGame,
    tables,
  };
}
