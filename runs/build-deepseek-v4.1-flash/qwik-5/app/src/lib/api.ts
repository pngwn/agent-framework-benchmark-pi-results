import {
  englishName,
  humanize,
  idFromUrl,
  type FlavorTextEntry,
  type LocalizedName,
  type NamedRef,
} from "./format";

const API_BASE = (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/$/, "");
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
const ALTERNATE_FORM_MIN_ID = 10000;

interface ListResponse {
  count: number;
  results: NamedRef[];
}

interface TypeRecord {
  id: number;
  name: string;
  names: NameEntry[];
  pokemon: { slot: number; pokemon: RefWithUrl }[];
  moves: RefWithUrl[];
  damage_relations: Record<string, RefWithUrl[]>;
}

interface GenerationRecord {
  id: number;
  name: string;
  names: NameEntry[];
  pokemon_species: RefWithUrl[];
}

interface VersionGroupRecord {
  id: number;
  name: string;
  order: number;
}

interface SpeciesRecord {
  id: number;
  name: string;
  names: NameEntry[];
  genera: { genus: string; language: Language }[];
  flavor_text_entries: FlavorEntry[];
  generation: RefWithUrl;
  evolution_chain: { url: string };
}

interface PokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: RefWithUrl;
  sprites: any;
  types: { slot: number; type: RefWithUrl }[];
  stats: { base_stat: number; effort: number; stat: RefWithUrl }[];
  abilities: { is_hidden: boolean; slot: number; ability: RefWithUrl }[];
  moves: {
    move: RefWithUrl;
    version_group_details: {
      level_learned_at: number;
      version_group: RefWithUrl;
      move_learn_method: RefWithUrl;
      order: number | null;
    }[];
  }[];
}

interface MoveRecord {
  id: number;
  name: string;
  names: NameEntry[];
  type: RefWithUrl | null;
  damage_class: RefWithUrl | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: { effect: string; short_effect: string; language: Language }[];
  flavor_text_entries: FlavorEntry[];
  learned_by_pokemon: RefWithUrl[];
}

interface AbilityRecord {
  id: number;
  name: string;
  names: NameEntry[];
  effect_entries: { effect: string; short_effect: string; language: Language }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: RefWithUrl }[];
}

interface RefWithUrl {
  name: string;
  url: string;
}
type NameEntry = LocalizedName;
type Language = NamedRef;
type FlavorEntry = FlavorTextEntry;

export interface CatalogType {
  name: string;
  english: string;
}

export interface CatalogGeneration {
  name: string;
  english: string;
  order: number;
}

export interface SpeciesSummary {
  id: number;
  name: string;
  display: string;
}

export interface CardData {
  id: number;
  name: string;
  display: string;
  sprite: string;
  types?: { name: string; english: string; slot: number }[];
  hidden?: boolean;
}

const requestCache = new Map<string, Promise<unknown>>();

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  if (path.startsWith("/api/v2/")) return `${API_BASE}${path}`;
  return `${API_BASE}/api/v2${path}`;
}

async function fetchJson<T>(pathOrUrl: string): Promise<T> {
  const url = absoluteUrl(pathOrUrl);
  let pending = requestCache.get(url) as Promise<T> | undefined;
  if (!pending) {
    pending = fetch(url, { headers: { accept: "application/json" } }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`API request failed ${response.status}: ${url}`);
      }
      return (await response.json()) as T;
    });
    pending = pending.catch((error) => {
      requestCache.delete(url);
      throw error;
    });
    requestCache.set(url, pending);
  }
  return pending;
}

async function fetchOptional<T>(pathOrUrl: string): Promise<T | null> {
  try {
    return await fetchJson<T>(pathOrUrl);
  } catch (error) {
    if (error instanceof Error && /API request failed 404/.test(error.message)) {
      return null;
    }
    throw error;
  }
}

function cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = cache.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const value = factory().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, value);
  return value;
}

const cache = new Map<string, Promise<unknown>>();

export function spriteUrl(id: number): string {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

export function getSpeciesList(): Promise<SpeciesSummary[]> {
  return cached("species-list", async () => {
    const response = await fetchJson<ListResponse>("/pokemon-species/?limit=100000");
    return response.results
      .map((entry) => {
        const id = idFromUrl(entry.url);
        if (!id) return null;
        return { id, name: entry.name, display: humanize(entry.name) };
      })
      .filter((entry): entry is SpeciesSummary => entry !== null)
      .sort((a, b) => a.id - b.id);
  });
}

export function getSpeciesIndex(): Promise<Map<number, SpeciesSummary>> {
  return cached("species-index", async () => {
    const species = await getSpeciesList();
    return new Map(species.map((item) => [item.id, item]));
  });
}

export function getTypeCatalog(): Promise<{
  types: CatalogType[];
  pokemonBySpecies: Map<number, { name: string; english: string; slot: number }[]>;
}> {
  return cached("type-catalog", async () => {
    const list = await fetchJson<ListResponse>("/type/?limit=100000");
    const refs = list.results.filter((item) => !EXCLUDED_TYPES.has(item.name));
    const records = await Promise.all(refs.map((item) => fetchJson<TypeRecord>(item.url)));
    const pokemonBySpecies = new Map<
      number,
      { name: string; english: string; slot: number }[]
    >();
    const types = records.map((record) => {
      const english = englishName(record.names, record.name);
      for (const entry of record.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        if (!id || id > ALTERNATE_FORM_MIN_ID) continue;
        const entries = pokemonBySpecies.get(id) ?? [];
        entries.push({ name: record.name, english, slot: entry.slot });
        pokemonBySpecies.set(id, entries);
      }
      return { name: record.name, english };
    });
    for (const entries of pokemonBySpecies.values()) {
      entries.sort((a, b) => a.slot - b.slot);
    }
    return { types, pokemonBySpecies };
  });
}

export function getGenerationCatalog(): Promise<{
  generations: CatalogGeneration[];
  generationBySpecies: Map<number, string>;
}> {
  return cached("generation-catalog", async () => {
    const list = await fetchJson<ListResponse>("/generation/?limit=100000");
    const records = await Promise.all(
      list.results.map((item) => fetchJson<GenerationRecord>(item.url)),
    );
    const generationBySpecies = new Map<number, string>();
    const generations = records.map((record, index) => {
      for (const species of record.pokemon_species) {
        const id = idFromUrl(species.url);
        if (id) generationBySpecies.set(id, record.name);
      }
      return {
        name: record.name,
        english: englishName(record.names, record.name),
        order: index + 1,
      };
    });
    return { generations, generationBySpecies };
  });
}

export function getTypeRecord(name: string): Promise<TypeRecord | null> {
  return fetchOptional<TypeRecord>(`/type/${encodeURIComponent(name)}`);
}

export function getSpecies(name: string): Promise<SpeciesRecord | null> {
  return fetchOptional<SpeciesRecord>(`/pokemon-species/${encodeURIComponent(name)}`);
}

export function getPokemonById(id: number): Promise<PokemonRecord | null> {
  return fetchOptional<PokemonRecord>(`/pokemon/${id}`);
}

export function getMove(name: string): Promise<MoveRecord | null> {
  return fetchOptional<MoveRecord>(`/move/${encodeURIComponent(name)}`);
}

export function getAbility(name: string): Promise<AbilityRecord | null> {
  return fetchOptional<AbilityRecord>(`/ability/${encodeURIComponent(name)}`);
}

export function getVersionGroup(urlOrName: string): Promise<VersionGroupRecord | null> {
  const key = urlOrName.startsWith("http") ? urlOrName : `/version-group/${encodeURIComponent(urlOrName)}`;
  return cached(`version-group:${key}`, () => fetchOptional<VersionGroupRecord>(key));
}

export async function getVersionGroups(refs: RefWithUrl[]): Promise<VersionGroupRecord[]> {
  const unique = new Map<string, RefWithUrl>();
  for (const ref of refs) unique.set(ref.name, ref);
  const records = await Promise.all(
    [...unique.values()].map((ref) => getVersionGroup(ref.url)),
  );
  return records
    .filter((record): record is VersionGroupRecord => record !== null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getEvolutionChain(url: string): Promise<any | null> {
  return fetchOptional<any>(url);
}

export function getMoveRecord(urlOrName: string): Promise<MoveRecord | null> {
  return fetchOptional<MoveRecord>(urlOrName);
}

export function cardsFromRefs(
  refs: RefWithUrl[],
  speciesIndex: Map<number, SpeciesSummary>,
  options?: { includeHidden?: boolean; hiddenIds?: Set<string> },
): CardData[] {
  const cards: CardData[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!id || id > ALTERNATE_FORM_MIN_ID) continue;
    const species = speciesIndex.get(id);
    if (!species) continue;
    cards.push({
      id: species.id,
      name: species.name,
      display: species.display,
      sprite: spriteUrl(species.id),
      hidden: options?.includeHidden ? options.hiddenIds?.has(ref.name) : undefined,
    });
  }
  return cards;
}

export function cardsForSpecies(
  speciesList: SpeciesSummary[],
  typeBySpecies?: Map<number, { name: string; english: string; slot: number }[]>,
): CardData[] {
  return speciesList.map((species) => ({
    id: species.id,
    name: species.name,
    display: species.display,
    sprite: spriteUrl(species.id),
    types: typeBySpecies?.get(species.id) ?? [],
  }));
}

export type { TypeRecord, MoveRecord, AbilityRecord, SpeciesRecord, PokemonRecord };
