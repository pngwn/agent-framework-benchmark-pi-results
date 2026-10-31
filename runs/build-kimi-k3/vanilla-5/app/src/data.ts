import { apiJson } from './api';
import { enName, idFromUrl, isDefaultPokemonId } from './util';

export interface SpeciesRef {
  id: number;
  name: string;
}

export interface TypeInfo {
  name: string; // API name, e.g. `fire`
  en: string; // English name, e.g. `Fire`
  slot?: number;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

function memo<T>(load: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => (p ??= load().catch((e) => ((p = null), Promise.reject(e))));
}

/** Every species the API lists, ordered by dex number. */
export const getSpeciesList = memo(async (): Promise<SpeciesRef[]> => {
  const d = await apiJson('/pokemon-species/?limit=5000');
  return (d.results as any[])
    .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
    .filter((s) => Number.isFinite(s.id))
    .sort((a, b) => a.id - b.id);
});

/** species id → species API name */
export const getSpeciesNames = memo(async (): Promise<Map<number, string>> => {
  return new Map((await getSpeciesList()).map((s) => [s.id, s.name]));
});

/** API names of the 18 types, in API order. */
export const getTypeNames = memo(async (): Promise<string[]> => {
  const d = await apiJson('/type/?limit=100');
  return (d.results as any[]).map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
});

export const getTypeRecord = (name: string): Promise<any> => apiJson(`/type/${name}`);

/** Records of the 18 types, in API order. */
export const getTypeRecords = memo(async (): Promise<any[]> => {
  const names = await getTypeNames();
  return Promise.all(names.map((n) => getTypeRecord(n)));
});

/** type API name → English name */
export const getTypeNameMap = memo(async (): Promise<Map<string, string>> => {
  return new Map((await getTypeRecords()).map((t) => [t.name, enName(t)]));
});

/** Generation records (1..9), in order. */
export const getGenerations = memo(async (): Promise<any[]> => {
  const d = await apiJson('/generation/?limit=100');
  return Promise.all((d.results as any[]).map((r) => apiJson(`/generation/${r.name}`)));
});

/** species id → types of its default Pokémon, in slot order */
export const getSpeciesTypes = memo(async (): Promise<Map<number, TypeInfo[]>> => {
  const map = new Map<number, TypeInfo[]>();
  for (const t of await getTypeRecords()) {
    for (const p of t.pokemon ?? []) {
      const pid = idFromUrl(p.pokemon?.url ?? '');
      if (!isDefaultPokemonId(pid)) continue;
      const arr = map.get(pid) ?? [];
      arr.push({ name: t.name, en: enName(t), slot: p.slot });
      map.set(pid, arr);
    }
  }
  for (const arr of map.values()) arr.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  return map;
});

/** species id → generation API name it was introduced in */
export const getSpeciesGenerations = memo(async (): Promise<Map<number, string>> => {
  const map = new Map<number, string>();
  for (const g of await getGenerations()) {
    for (const s of g.pokemon_species ?? []) {
      const id = idFromUrl(s.url ?? '');
      if (Number.isFinite(id)) map.set(id, g.name);
    }
  }
  return map;
});

/** Version-group records for the given API names. */
export const getVersionGroups = (names: string[]): Promise<any[]> =>
  Promise.all(names.map((n) => apiJson(`/version-group/${n}`)));

/**
 * Map a list of Pokémon references (as used by `learned_by_pokemon`, ability
 * `pokemon` and type `pokemon`) to their species: alternate forms are dropped
 * and each species appears once, ordered by dex number.
 */
export async function speciesFromPokemonRefs(refs: any[]): Promise<SpeciesRef[]> {
  const names = await getSpeciesNames();
  const seen = new Map<number, string>();
  for (const ref of refs) {
    const url = ref.pokemon?.url ?? ref.url ?? '';
    const pid = idFromUrl(url);
    if (!isDefaultPokemonId(pid) || seen.has(pid)) continue;
    seen.set(pid, names.get(pid) ?? ref.pokemon?.name ?? ref.name);
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.id - b.id);
}
