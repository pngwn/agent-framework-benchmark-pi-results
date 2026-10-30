import { englishName, idFromUrl, type Named } from './format';

function resolveApiBase(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="api-base-url"]')?.content ?? '';
  const base = meta && !meta.startsWith('__') ? meta : (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9000');
  return base.replace(/\/$/, '');
}

export const API_BASE = resolveApiBase();

export const spriteUrl = (pokemonId: number) => `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;

export class NotFoundError extends Error {}

export interface Ref {
  name: string;
  url: string;
}

export interface ListResponse {
  count: number;
  results: Ref[];
}

export interface Species {
  id: number;
  name: string;
  names: Named[];
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  generation: Ref;
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: Ref }[];
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: Ref }[];
  abilities: { slot: number; is_hidden: boolean; ability: Ref }[];
  stats: { base_stat: number; stat: Ref }[];
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> };
  moves: {
    move: Ref;
    version_group_details: { level_learned_at: number; version_group: Ref; move_learn_method: Ref }[];
  }[];
}

export interface EvolutionNode {
  species: Ref;
  evolves_to: EvolutionNode[];
}

export interface EvolutionChain {
  chain: EvolutionNode;
}

export interface Move {
  id: number;
  name: string;
  names: Named[];
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: Ref;
  damage_class: Ref | null;
  effect_entries: { short_effect: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  learned_by_pokemon: Ref[];
}

export interface Ability {
  id: number;
  name: string;
  names: Named[];
  effect_entries: { short_effect: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: Ref }[];
}

export type RelationKey =
  | 'double_damage_to'
  | 'half_damage_to'
  | 'no_damage_to'
  | 'double_damage_from'
  | 'half_damage_from'
  | 'no_damage_from';

export interface Type {
  id: number;
  name: string;
  names: Named[];
  damage_relations: Record<RelationKey, Ref[]>;
  pokemon: { slot: number; pokemon: Ref }[];
  moves: Ref[];
}

export interface Generation {
  id: number;
  name: string;
  names: Named[];
  pokemon_species: Ref[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}

// In-memory cache of API responses for the lifetime of the page.
const cache = new Map<string, Promise<unknown>>();

function toUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.replace(/^\/+/, '').replace(/^api\/v2\//, '');
  const [p, query] = path.split('?');
  return `${API_BASE}/api/v2/${p.replace(/\/?$/, '/')}${query ? `?${query}` : ''}`;
}

export function get<T>(pathOrUrl: string): Promise<T> {
  const url = toUrl(pathOrUrl);
  let pending = cache.get(url) as Promise<T> | undefined;
  if (!pending) {
    pending = fetch(url).then(async (res) => {
      if (res.status === 404) throw new NotFoundError(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return (await res.json()) as T;
    });
    pending.catch((err) => {
      if (!(err instanceof NotFoundError)) cache.delete(url);
    });
    cache.set(url, pending);
  }
  return pending;
}

/** Fetches a resource by API name; names in URLs are user input, so encode them. */
export const getByName = <T>(resource: string, name: string) => get<T>(`${resource}/${encodeURIComponent(name.toLowerCase())}`);

const listAll = (resource: string) => get<ListResponse>(`${resource}/?limit=100000`);

export interface SpeciesEntry {
  id: number;
  name: string;
}

/** Every species, ordered by dex number. */
export async function allSpecies(): Promise<SpeciesEntry[]> {
  const list = await listAll('pokemon-species');
  return list.results.map((r) => ({ id: idFromUrl(r.url), name: r.name })).sort((a, b) => a.id - b.id);
}

export async function speciesNames(): Promise<Map<number, string>> {
  return new Map((await allSpecies()).map((s) => [s.id, s.name]));
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types, in API order. */
export async function allTypes(): Promise<Type[]> {
  const list = await listAll('type');
  return Promise.all(list.results.filter((r) => !EXCLUDED_TYPES.has(r.name)).map((r) => get<Type>(r.url)));
}

export async function allGenerations(): Promise<Generation[]> {
  const list = await listAll('generation');
  const gens = await Promise.all(list.results.map((r) => get<Generation>(r.url)));
  return gens.sort((a, b) => a.id - b.id);
}

/** English names for the given type API names. */
export async function typeNames(names: Iterable<string>): Promise<Map<string, string>> {
  const unique = [...new Set(names)];
  const types = await Promise.all(unique.map((n) => getByName<Type>('type', n)));
  return new Map(types.map((t) => [t.name, englishName(t)]));
}
