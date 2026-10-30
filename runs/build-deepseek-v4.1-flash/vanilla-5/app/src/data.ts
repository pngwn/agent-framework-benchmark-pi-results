import { fetchRecord, idFromUrl, mapLimit, type ApiRecord, type ApiRef } from './api';
import { englishName, EXCLUDED_TYPE_NAMES } from './format';

export interface SpeciesRef {
  id: number;
  name: string;
  url: string;
}

export interface TypeInfo {
  id: number;
  name: string;
  englishName: string;
  data: ApiRecord;
}

export interface GenerationInfo {
  id: number;
  name: string;
  englishName: string;
  data: ApiRecord;
}

interface ListResponse extends ApiRecord {
  results: ApiRef[];
}

let speciesListPromise: Promise<SpeciesRef[]> | null = null;
let allTypesPromise: Promise<TypeInfo[]> | null = null;
let generationsPromise: Promise<GenerationInfo[]> | null = null;
const pokemonTypePromises = new Map<number, Promise<string[]>>();

export function loadSpeciesList(): Promise<SpeciesRef[]> {
  if (!speciesListPromise) {
    speciesListPromise = (async () => {
      const response = await fetchRecord<ListResponse>('pokemon-species/?limit=10000');
      const seen = new Set<number>();
      const species: SpeciesRef[] = [];
      for (const item of response.results) {
        const id = parseIdFromRef(item);
        if (id === null || id > 10000 || seen.has(id)) continue;
        seen.add(id);
        species.push({ id, name: item.name, url: item.url });
      }
      return species.sort((a, b) => a.id - b.id);
    })();
  }
  return speciesListPromise;
}

export function parseIdFromRef(ref: { name?: string; url?: string } | null | undefined): number | null {
  if (!ref) return null;
  return idFromUrl(ref.url) ?? (ref.name && /^\d+$/.test(ref.name) ? Number(ref.name) : null);
}

export async function loadAllTypes(): Promise<TypeInfo[]> {
  if (!allTypesPromise) {
    allTypesPromise = (async () => {
      const response = await fetchRecord<ListResponse>('type/?limit=100');
      const refs = response.results.filter((ref) => !EXCLUDED_TYPE_NAMES.has(ref.name));
      const records = await mapLimit(refs, 8, (ref) => fetchRecord(`type/${encodeURIComponent(ref.name)}`));
      return records.map((data, index) => ({
        id: idFromUrl(refs[index].url) ?? Number(data.id),
        name: refs[index].name,
        englishName: englishName(data, refs[index].name),
        data,
      }));
    })();
  }
  return allTypesPromise;
}

export async function loadGenerations(): Promise<GenerationInfo[]> {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const response = await fetchRecord<ListResponse>('generation/?limit=100');
      const records = await mapLimit(response.results, 6, (ref) =>
        fetchRecord(`generation/${encodeURIComponent(ref.name)}`),
      );
      return records
        .map((data, index) => ({
          id: idFromUrl(response.results[index].url) ?? Number(data.id),
          name: response.results[index].name,
          englishName: englishName(data, response.results[index].name),
          data,
        }))
        .sort((a, b) => a.id - b.id);
    })();
  }
  return generationsPromise;
}

export function loadPokemonTypeNames(pokemonId: number): Promise<string[]> {
  const existing = pokemonTypePromises.get(pokemonId);
  if (existing) return existing;
  const promise = (async () => {
    const pokemon = await fetchRecord(`pokemon/${pokemonId}`);
    const types = Array.isArray(pokemon.types)
      ? [...pokemon.types]
          .sort((a: ApiRecord, b: ApiRecord) => Number(a.slot) - Number(b.slot))
          .map((entry: ApiRecord) => String(entry.type.name))
      : [];
    return types;
  })().catch(() => [] as string[]);
  pokemonTypePromises.set(pokemonId, promise);
  return promise;
}

export async function loadSpeciesByIdMap(): Promise<Map<number, SpeciesRef>> {
  const list = await loadSpeciesList();
  return new Map(list.map((species) => [species.id, species]));
}

export async function loadVersionGroup(name: string): Promise<ApiRecord> {
  return fetchRecord(`version-group/${encodeURIComponent(name)}`);
}
