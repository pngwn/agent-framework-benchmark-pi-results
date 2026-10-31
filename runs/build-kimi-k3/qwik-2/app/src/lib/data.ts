// Higher-level data assembled from the API. All of these are cached in memory.

import { api, spriteUrl } from './api';
import { englishName, humanize, idFromUrl } from './format';

/** Pokémon IDs above this are alternate forms, which the app leaves out. */
export const MAX_MAIN_ID = 10000;

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

function memoize<R>(fn: () => Promise<R>): () => Promise<R> {
  let p: Promise<R> | undefined;
  return () => (p ??= fn());
}

export interface SpeciesRef {
  id: number;
  name: string;
}

export const getSpeciesList = memoize(async (): Promise<SpeciesRef[]> => {
  const data = await api('/pokemon-species/?limit=100000');
  return (data.results as any[]).map((r) => ({ name: r.name as string, id: idFromUrl(r.url) }));
});

/** Map of species id -> species API name. */
export const getSpeciesMap = memoize(async (): Promise<Map<number, string>> => {
  const list = await getSpeciesList();
  return new Map(list.map((s) => [s.id, s.name]));
});

/** Full type records for the 18 types, in API order. */
export const getTypeRecords = memoize(async (): Promise<any[]> => {
  const list = await api('/type/?limit=100');
  const names = (list.results as any[])
    .map((r) => r.name as string)
    .filter((n) => !EXCLUDED_TYPES.has(n));
  return Promise.all(names.map((n) => api(`/type/${n}/`)));
});

export interface TypeInfo {
  name: string;
  english: string;
}

/** The 18 types in API order, with English names. */
export const getTypeList = memoize(async (): Promise<TypeInfo[]> => {
  const records = await getTypeRecords();
  return records.map((t) => ({ name: t.name as string, english: englishName(t.names, t.name) }));
});

export const getGenerations = memoize(async (): Promise<any[]> => {
  const list = await api('/generation/?limit=100');
  return Promise.all((list.results as any[]).map((r) => api(`/generation/${r.name}/`)));
});

export interface VersionGroupInfo {
  name: string;
  order: number;
}

export const getVersionGroups = memoize(async (): Promise<VersionGroupInfo[]> => {
  const list = await api('/version-group/?limit=100');
  const vgs = await Promise.all((list.results as any[]).map((r) => api(`/version-group/${r.name}/`)));
  return vgs.map((v) => ({ name: v.name as string, order: v.order as number }));
});

/** Map of Pokémon id -> type API names in slot order (from the type records). */
export const getPokemonTypesMap = memoize(async (): Promise<Map<number, string[]>> => {
  const records = await getTypeRecords();
  const byId = new Map<number, { slot: number; name: string }[]>();
  for (const t of records) {
    for (const p of t.pokemon as any[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!Number.isFinite(id) || id > MAX_MAIN_ID) continue;
      let arr = byId.get(id);
      if (!arr) byId.set(id, (arr = []));
      if (!arr.some((x) => x.name === t.name)) arr.push({ slot: p.slot, name: t.name });
    }
  }
  return new Map(
    [...byId].map(([id, arr]) => [id, arr.sort((a, b) => a.slot - b.slot).map((x) => x.name)]),
  );
});

export interface DexEntry {
  id: number;
  name: string;
  human: string;
  sprite: string;
  types: string[];
  generation: string;
}

/** Every species with the data needed to render and filter the home page. */
export const getDexEntries = memoize(async (): Promise<DexEntry[]> => {
  const [species, gens, typesById] = await Promise.all([
    getSpeciesList(),
    getGenerations(),
    getPokemonTypesMap(),
  ]);
  const generationOf = new Map<string, string>();
  for (const g of gens) {
    for (const s of g.pokemon_species as any[]) generationOf.set(s.name, g.name);
  }
  return species.map((s) => ({
    id: s.id,
    name: s.name,
    human: humanize(s.name),
    sprite: spriteUrl(s.id),
    types: typesById.get(s.id) ?? [],
    generation: generationOf.get(s.name) ?? '',
  }));
});

export interface PokemonCardData {
  id: number;
  name: string;
  human: string;
  sprite: string;
  hiddenAbility?: boolean;
}

/**
 * Turn a list of Pokémon references (from move/ability/type data) into card
 * data for their species: alternate forms dropped, deduplicated, in dex order.
 */
type PokemonRefEntry =
  | { name: string; url: string }
  | { pokemon: { name: string; url: string }; is_hidden?: boolean };

export async function cardsForPokemonRefs(refs: PokemonRefEntry[]): Promise<PokemonCardData[]> {
  const speciesMap = await getSpeciesMap();
  const byId = new Map<number, PokemonCardData>();
  for (const entry of refs) {
    const ref = 'pokemon' in entry ? entry.pokemon : entry;
    const isHidden = 'is_hidden' in entry && entry.is_hidden === true;
    const id = idFromUrl(ref.url);
    if (!Number.isFinite(id) || id > MAX_MAIN_ID) continue;
    if (byId.has(id)) {
      if (isHidden) byId.get(id)!.hiddenAbility = true;
      continue;
    }
    const speciesName = speciesMap.get(id) ?? ref.name;
    byId.set(id, {
      id,
      name: speciesName,
      human: humanize(speciesName),
      sprite: spriteUrl(id),
      hiddenAbility: isHidden,
    });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
