/**
 * Server-side PokeAPI client. All data is fetched over HTTP at request time and
 * cached in memory for the lifetime of the process.
 */
import { englishName, humanize } from './format';

const BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
const API = `${BASE}/api/v2`;

const cache = new Map<string, Promise<any>>();

/** Fetch a resource by path (relative to /api/v2/). Returns null on 404. */
export function apiGet(path: string): Promise<any> {
  let p = cache.get(path);
  if (!p) {
    p = (async () => {
      const res = await fetch(`${API}/${path}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PokeAPI error ${res.status} for ${path}`);
      return await res.json();
    })();
    cache.set(path, p);
    // Don't cache misses or failures forever: the API is a live service.
    p.then(
      (v) => {
        if (v === null) cache.delete(path);
      },
      () => cache.delete(path),
    );
  }
  return p;
}

/** Extract the numeric id from a PokeAPI resource URL. */
export function idFromUrl(url: string): number {
  const m = /\/(\d+)\/?$/.exec(url);
  return m ? Number(m[1]) : NaN;
}

/** Front sprite URL for a Pokémon id. */
export function spriteUrl(id: number): string {
  return `${BASE}/media/sprites/pokemon/${id}.png`;
}

/** Alternate forms have Pokémon ids of 10000 and above; they are out of scope. */
export const isDefaultPokemonId = (id: number) => Number.isFinite(id) && id < 10000;

export interface SpeciesRef {
  id: number;
  name: string;
}

let speciesListP: Promise<SpeciesRef[]> | null = null;

/** Every species, ordered by dex number. */
export function getSpeciesList(): Promise<SpeciesRef[]> {
  return (speciesListP ??= (async () => {
    const data = await apiGet('pokemon-species/?limit=100000');
    const list: SpeciesRef[] = (data?.results ?? [])
      .map((r: any) => ({ id: idFromUrl(r.url), name: r.name as string }))
      .filter((s: SpeciesRef) => Number.isFinite(s.id));
    list.sort((a, b) => a.id - b.id);
    return list;
  })());
}

export async function getSpeciesNameById(): Promise<Map<number, string>> {
  const list = await getSpeciesList();
  return new Map(list.map((s) => [s.id, s.name]));
}

export interface TypeInfo {
  id: number;
  name: string;
  label: string;
}

export interface TypeIndex {
  /** The 18 types, in API order. */
  list: TypeInfo[];
  byName: Map<string, TypeInfo>;
  /** Default-Pokémon id -> its types with slot info. */
  pokemonTypes: Map<number, { name: string; label: string; slot: number }[]>;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let typeIndexP: Promise<TypeIndex> | null = null;

export function getTypeIndex(): Promise<TypeIndex> {
  return (typeIndexP ??= (async () => {
    const listing = await apiGet('type/?limit=100');
    const refs = (listing?.results ?? []).filter((r: any) => !EXCLUDED_TYPES.has(r.name));
    const records: any[] = await Promise.all(refs.map((r: any) => apiGet(`type/${r.name}/`)));
    const list: TypeInfo[] = [];
    const byName = new Map<string, TypeInfo>();
    const pokemonTypes = new Map<number, { name: string; label: string; slot: number }[]>();
    for (const rec of records) {
      if (!rec) continue;
      const info: TypeInfo = {
        id: rec.id,
        name: rec.name,
        label: englishName(rec.names) ?? humanize(rec.name),
      };
      list.push(info);
      byName.set(info.name, info);
      for (const entry of rec.pokemon ?? []) {
        const pid = idFromUrl(entry.pokemon?.url ?? '');
        if (!isDefaultPokemonId(pid)) continue;
        let arr = pokemonTypes.get(pid);
        if (!arr) pokemonTypes.set(pid, (arr = []));
        arr.push({ name: info.name, label: info.label, slot: entry.slot });
      }
    }
    list.sort((a, b) => a.id - b.id);
    for (const arr of pokemonTypes.values()) arr.sort((a, b) => a.slot - b.slot);
    return { list, byName, pokemonTypes };
  })());
}

export interface GenerationInfo {
  id: number;
  name: string;
  label: string;
}

export interface GenerationIndex {
  list: GenerationInfo[];
  /** Species API name -> generation API name. */
  bySpecies: Map<string, string>;
}

let generationIndexP: Promise<GenerationIndex> | null = null;

export function getGenerationIndex(): Promise<GenerationIndex> {
  return (generationIndexP ??= (async () => {
    const listing = await apiGet('generation/?limit=100');
    const refs = listing?.results ?? [];
    const records: any[] = await Promise.all(refs.map((r: any) => apiGet(`generation/${r.name}/`)));
    const list: GenerationInfo[] = [];
    const bySpecies = new Map<string, string>();
    for (const rec of records) {
      if (!rec) continue;
      list.push({ id: rec.id, name: rec.name, label: englishName(rec.names) ?? humanize(rec.name) });
      for (const sp of rec.pokemon_species ?? []) bySpecies.set(sp.name, rec.name);
    }
    list.sort((a, b) => a.id - b.id);
    return { list, bySpecies };
  })());
}

export interface VersionGroupInfo {
  id: number;
  name: string;
  order: number;
}

let versionGroupIndexP: Promise<Map<string, VersionGroupInfo>> | null = null;

export function getVersionGroupIndex(): Promise<Map<string, VersionGroupInfo>> {
  return (versionGroupIndexP ??= (async () => {
    const listing = await apiGet('version-group/?limit=100');
    const refs = listing?.results ?? [];
    const records: any[] = await Promise.all(refs.map((r: any) => apiGet(`version-group/${r.name}/`)));
    const map = new Map<string, VersionGroupInfo>();
    for (const rec of records) {
      if (!rec) continue;
      map.set(rec.name, { id: rec.id, name: rec.name, order: rec.order });
    }
    return map;
  })());
}
