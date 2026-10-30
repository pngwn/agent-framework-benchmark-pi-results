import 'server-only';
import { englishName, humanize, idFromUrl, type Named } from './format';

/** Origin of the PokeAPI server, read at request time (never inlined at build time). */
export function apiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');
}

/** Pokémon IDs above this are alternate forms, which the app leaves out. */
const MAX_SPECIES_ID = 10000;

// ---------------------------------------------------------------------------
// Fetching with a small in-memory cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 1500;
const MAX_CONCURRENT_REQUESTS = 24;

type CacheEntry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, CacheEntry>();

let active = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT_REQUESTS) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    queue.shift()?.();
  }
}

/** Turns an API path or an absolute API URL into a URL on the configured API origin. */
function apiUrl(pathOrUrl: string): string {
  const pathname = /^https?:\/\//.test(pathOrUrl) ? new URL(pathOrUrl).pathname + new URL(pathOrUrl).search : pathOrUrl;
  const path = pathname.startsWith('/api/v2/') ? pathname : `/api/v2/${pathname.replace(/^\//, '')}`;
  return `${apiBaseUrl()}${path}`;
}

async function request<T>(url: string): Promise<T | null> {
  return withSlot(async () => {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 404) {
      // Drain rather than cancel: Next's fetch tees the body, and cancelling one branch
      // of a tee never settles while the other is still open.
      await res.arrayBuffer().catch(() => undefined);
      return null;
    }
    if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
    return (await res.json()) as T;
  });
}

/** GET a JSON resource from the API. Resolves to null when it doesn't exist. */
export function fetchApi<T>(pathOrUrl: string): Promise<T | null> {
  const url = apiUrl(pathOrUrl);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) {
    // Refresh the LRU position.
    cache.delete(url);
    cache.set(url, hit);
    return hit.value as Promise<T | null>;
  }
  const value = request<T>(url);
  cache.set(url, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return value;
}

async function fetchRequired<T>(pathOrUrl: string): Promise<T> {
  const data = await fetchApi<T>(pathOrUrl);
  if (!data) throw new Error(`API resource missing: ${pathOrUrl}`);
  return data;
}

/** A resource name taken from the URL, safe to put in an API path. */
function key(name: string): string {
  return encodeURIComponent(name.toLowerCase());
}

// ---------------------------------------------------------------------------
// API shapes (only the fields the app uses)
// ---------------------------------------------------------------------------

type Lang = { language: Named };
export type ApiList = { count: number; results: Named[] };
type ApiNames = ({ name: string } & Lang)[];

export type ApiType = {
  id: number;
  name: string;
  names: ApiNames;
  damage_relations: Record<
    'double_damage_to' | 'half_damage_to' | 'no_damage_to' | 'double_damage_from' | 'half_damage_from' | 'no_damage_from',
    Named[]
  >;
  pokemon: { slot: number; pokemon: Named }[];
  moves: Named[];
};

export type ApiGeneration = { id: number; name: string; names: ApiNames; pokemon_species: Named[] };

export type ApiSpecies = {
  id: number;
  name: string;
  names: ApiNames;
  genera: ({ genus: string } & Lang)[];
  flavor_text_entries: ({ flavor_text: string } & Lang)[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: Named }[];
};

export type ApiPokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: Named }[];
  stats: { base_stat: number; stat: Named }[];
  abilities: { is_hidden: boolean; slot: number; ability: Named }[];
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null } | undefined> };
  moves: {
    move: Named;
    version_group_details: { level_learned_at: number; move_learn_method: Named; version_group: Named }[];
  }[];
};

export type ApiMove = {
  id: number;
  name: string;
  names: ApiNames;
  type: Named;
  damage_class: Named | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: ({ short_effect: string } & Lang)[];
  flavor_text_entries: ({ flavor_text: string } & Lang)[];
  learned_by_pokemon: Named[];
};

export type ApiAbility = {
  id: number;
  name: string;
  names: ApiNames;
  effect_entries: ({ short_effect: string } & Lang)[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: Named }[];
};

export type ApiChainLink = { species: Named; evolves_to: ApiChainLink[] };
export type ApiEvolutionChain = { id: number; chain: ApiChainLink };
export type ApiVersionGroup = { id: number; name: string; order: number };

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const isListedType = (name: string) => !EXCLUDED_TYPES.has(name);

export const getSpecies = (name: string) => fetchApi<ApiSpecies>(`pokemon-species/${key(name)}/`);
export const getPokemon = (idOrName: number | string) => fetchApi<ApiPokemon>(`pokemon/${key(String(idOrName))}/`);
export const getMove = (name: string) => fetchApi<ApiMove>(`move/${key(name)}/`);
export const getAbility = (name: string) => fetchApi<ApiAbility>(`ability/${key(name)}/`);
export const getType = (name: string) => fetchApi<ApiType>(`type/${key(name)}/`);
export const getVersionGroup = (name: string) => fetchApi<ApiVersionGroup>(`version-group/${key(name)}/`);
export const getEvolutionChain = (url: string) => fetchApi<ApiEvolutionChain>(url);

const listAll = (resource: string) => fetchRequired<ApiList>(`${resource}/?limit=100000`);

export type TypeInfo = { name: string; label: string };

/** The 18 types, in API order, with their full records. */
export async function getAllTypes(): Promise<ApiType[]> {
  const list = await listAll('type');
  const names = list.results.map((t) => t.name).filter(isListedType);
  return Promise.all(names.map((name) => fetchRequired<ApiType>(`type/${name}/`)));
}

/** English names for every type the app shows. */
export async function getTypeLabels(): Promise<Map<string, string>> {
  const types = await getAllTypes();
  return new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));
}

export function typeInfo(labels: Map<string, string>, name: string): TypeInfo {
  return { name, label: labels.get(name) ?? humanize(name) };
}

export async function getGenerations(): Promise<ApiGeneration[]> {
  const list = await listAll('generation');
  return Promise.all(list.results.map((g) => fetchRequired<ApiGeneration>(g.url)));
}

export type SpeciesRef = { id: number; name: string };

/** Every species the API lists, ordered by dex number. */
export async function getSpeciesList(): Promise<SpeciesRef[]> {
  const list = await listAll('pokemon-species');
  return list.results
    .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
    .filter((s) => s.id > 0 && s.id <= MAX_SPECIES_ID)
    .sort((a, b) => a.id - b.id);
}

export type CardData = {
  id: number;
  /** Species name, used for the link and the label. */
  name: string;
  types?: TypeInfo[];
  hiddenAbility?: boolean;
};

export type IndexEntry = CardData & { label: string; types: TypeInfo[]; generation: string | undefined };

/** Everything the Pokémon list needs: species with their default Pokémon's types and generation. */
export async function getSpeciesIndex(): Promise<IndexEntry[]> {
  const [species, types, generations] = await Promise.all([getSpeciesList(), getAllTypes(), getGenerations()]);

  const typesById = new Map<number, { slot: number; type: TypeInfo }[]>();
  for (const type of types) {
    const info = { name: type.name, label: englishName(type.names, type.name) };
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!(id <= MAX_SPECIES_ID)) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot, type: info });
      typesById.set(id, list);
    }
  }

  const generationById = new Map<number, string>();
  for (const generation of generations) {
    for (const s of generation.pokemon_species) generationById.set(idFromUrl(s.url), generation.name);
  }

  return species.map((s) => ({
    id: s.id,
    name: s.name,
    label: humanize(s.name),
    types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
    generation: generationById.get(s.id),
  }));
}

/**
 * Cards for a set of Pokémon references (from type, move or ability data): alternate forms
 * are dropped and each Pokémon is shown as its species. Ordered by dex number.
 */
export async function pokemonCards<T extends { pokemon: Named }>(
  refs: T[],
  extra?: (ref: T) => Partial<CardData>,
): Promise<CardData[]> {
  const species = await getSpeciesList();
  const speciesById = new Map(species.map((s) => [s.id, s.name]));
  const cards = new Map<number, CardData>();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    const name = speciesById.get(id);
    if (!name || cards.has(id)) continue;
    cards.set(id, { id, name, ...extra?.(ref) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

/** A team entry: a species with its default Pokémon's types, as shown on a card. */
export type TeamMember = CardData & { types: TypeInfo[] };

/** Team members in the order their species names are given, with live data for each. */
export async function getTeamMembers(names: string[], labels: Map<string, string>): Promise<TeamMember[]> {
  const members = await Promise.all(
    names.map(async (name) => {
      const species = await getSpecies(name);
      if (!species) return null;
      const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon;
      const pokemon = await getPokemon(defaultVariety ? idFromUrl(defaultVariety.url) : species.id);
      if (!pokemon) return null;
      return {
        id: species.id,
        name: species.name,
        types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeInfo(labels, t.type.name)),
      };
    }),
  );
  return members.filter((member): member is TeamMember => member !== null);
}

export function spriteUrl(id: number): string {
  return `${apiBaseUrl()}/media/sprites/pokemon/${id}.png`;
}

/** Media URLs in API data point at the API origin; make sure they use the configured one. */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/')) return `${apiBaseUrl()}${url}`;
  return url;
}
