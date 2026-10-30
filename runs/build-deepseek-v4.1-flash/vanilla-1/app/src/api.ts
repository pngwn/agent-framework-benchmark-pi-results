export const API_ORIGIN = String(
  (window as unknown as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:9000',
).replace(/\/+$/, '');

const API_ROOT = `${API_ORIGIN}/api/v2`;

export class NotFoundError extends Error {
  constructor() {
    super('Not found');
    this.name = 'NotFoundError';
  }
}

export interface NamedResource {
  name: string;
  url: string;
}

export interface LocalizedName {
  name: string;
  language: NamedAPIResource;
}

export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface FlavorText {
  flavor_text: string;
  language: NamedAPIResource;
}

export interface EffectEntry {
  effect: string;
  short_effect: string;
  language: NamedAPIResource;
}

export interface ApiList<T = NamedResource> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SpeciesRef {
  id: number;
  name: string;
}

export interface SpeciesRecord {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: NamedAPIResource }[];
  flavor_text_entries: FlavorText[];
  generation: NamedAPIResource;
  evolution_chain: { url: string } | null;
  varieties: {
    is_default: boolean;
    pokemon: NamedAPIResource;
  }[];
}

export interface PokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: NamedAPIResource;
  types: { slot: number; type: NamedAPIResource }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedAPIResource }[];
  stats: { base_stat: number; effort: number; stat: NamedAPIResource }[];
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null; front_shiny: string | null };
      home?: { front_default: string | null };
    };
  };
  moves: {
    move: NamedAPIResource;
    version_group_details: {
      level_learned_at: number;
      move_learn_method: NamedAPIResource;
      version_group: NamedAPIResource;
    }[];
  }[];
}

export interface MoveRecord {
  id: number;
  name: string;
  names: LocalizedName[];
  type: NamedAPIResource;
  damage_class: NamedAPIResource | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: NamedAPIResource[];
}

export interface AbilityRecord {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: EffectEntry[];
  pokemon: {
    is_hidden: boolean;
    slot: number;
    pokemon: NamedAPIResource;
  }[];
}

export interface TypeRecord {
  id: number;
  name: string;
  names: LocalizedName[];
  damage_relations: Record<string, NamedAPIResource[]>;
  pokemon: { slot: number; pokemon: NamedAPIResource }[];
  moves: NamedAPIResource[];
}

export interface GenerationRecord {
  id: number;
  name: string;
  names: LocalizedName[];
  pokemon_species: NamedAPIResource[];
}

export interface VersionGroupRecord {
  id: number;
  name: string;
  order: number;
}

export interface EvolutionChainRecord {
  id: number;
  chain: EvolutionNode;
}

export interface EvolutionNode {
  species: NamedAPIResource;
  evolves_to: EvolutionNode[];
}

const cache = new Map<string, Promise<unknown>>();

export function apiFetch<T = unknown>(pathOrUrl: string): Promise<T> {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${API_ROOT}/${pathOrUrl.replace(/^\/+/, '')}`;
  let request = cache.get(url) as Promise<T> | undefined;
  if (!request) {
    request = fetch(url, { headers: { Accept: 'application/json' } }).then(async (response) => {
      if (response.status === 404) throw new NotFoundError();
      if (!response.ok) throw new Error(`API request failed (${response.status}): ${url}`);
      return (await response.json()) as T;
    });
    cache.set(url, request);
    request.catch(() => cache.delete(url));
  }
  return request;
}

export function apiList<T = NamedResource>(resource: string): Promise<ApiList<T>> {
  return apiFetch<ApiList<T>>(`${resource}?limit=100000`);
}

export function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
  return names?.find((entry) => entry.language?.name === 'en')?.name ?? humanize(fallback);
}

export function latestEnglishFlavor(entries: FlavorText[] | undefined): string | null {
  const english = (entries ?? []).filter((entry) => entry.language?.name === 'en');
  if (!english.length) return null;
  return english[english.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

export function englishShortEffect(entries: EffectEntry[] | undefined): string | null {
  const entry = entries?.find((item) => item.language?.name === 'en');
  return entry?.short_effect ?? null;
}

export function formatDex(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function displayNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

export function spriteUrl(id: number): string {
  return `${API_ORIGIN}/media/sprites/pokemon/${id}.png`;
}

let speciesIndexPromise: Promise<Map<number, SpeciesRef>> | null = null;

export function getSpeciesIndex(): Promise<Map<number, SpeciesRef>> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = apiList('pokemon-species').then((list) => {
      const byId = new Map<number, SpeciesRef>();
      for (const entry of list.results) {
        const id = idFromUrl(entry.url);
        if (id !== null) byId.set(id, { id, name: entry.name });
      }
      return byId;
    });
    speciesIndexPromise.catch(() => {
      speciesIndexPromise = null;
    });
  }
  return speciesIndexPromise;
}

function speciesRefsFromPokemon(list: NamedAPIResource[], species: Map<number, SpeciesRef>): SpeciesRef[] {
  const byId = new Map<number, SpeciesRef>();
  for (const entry of list) {
    const id = idFromUrl(entry.url);
    if (id === null || id > 10000) continue;
    const ref = species.get(id);
    if (ref) byId.set(id, ref);
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function speciesFromPokemonList(
  list: NamedAPIResource[],
  species: Map<number, SpeciesRef>,
): SpeciesRef[] {
  return speciesRefsFromPokemon(list, species);
}

export function speciesFromEntries(
  entries: { pokemon?: NamedAPIResource; is_hidden?: boolean }[],
  species: Map<number, SpeciesRef>,
): (SpeciesRef & { hidden: boolean })[] {
  const byId = new Map<number, SpeciesRef & { hidden: boolean }>();
  for (const entry of entries) {
    if (!entry.pokemon) continue;
    const id = idFromUrl(entry.pokemon.url);
    if (id === null || id > 10000) continue;
    const ref = species.get(id);
    if (!ref) continue;
    const existing = byId.get(id);
    if (existing) existing.hidden = existing.hidden || Boolean(entry.is_hidden);
    else byId.set(id, { ...ref, hidden: Boolean(entry.is_hidden) });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export interface GenerationInfo {
  name: string;
  englishName: string;
  order: number;
  species: NamedAPIResource[];
}

export interface GenerationsData {
  list: GenerationInfo[];
  bySpecies: Map<number, string>;
}

let generationsPromise: Promise<GenerationsData> | null = null;

export function getGenerations(): Promise<GenerationsData> {
  if (!generationsPromise) {
    generationsPromise = apiList('generation')
      .then((list) => Promise.all(list.results.map((entry) => apiFetch<GenerationRecord>(entry.url))))
      .then((records) => {
        records.sort((a, b) => a.id - b.id);
        const bySpecies = new Map<number, string>();
        const list = records.map((record) => {
          for (const ref of record.pokemon_species) {
            const id = idFromUrl(ref.url);
            if (id !== null) bySpecies.set(id, record.name);
          }
          return {
            name: record.name,
            englishName: englishName(record.names, record.name),
            order: record.id,
            species: record.pokemon_species,
          };
        });
        return { list, bySpecies };
      });
    generationsPromise.catch(() => {
      generationsPromise = null;
    });
  }
  return generationsPromise;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export interface TypeInfo {
  name: string;
  englishName: string;
  record: TypeRecord;
}

let typeCatalogPromise: Promise<TypeInfo[]> | null = null;

export function getTypeCatalog(): Promise<TypeInfo[]> {
  if (!typeCatalogPromise) {
    typeCatalogPromise = apiList('type')
      .then((list) => list.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name)))
      .then((entries) => Promise.all(entries.map((entry) => apiFetch<TypeRecord>(entry.url))))
      .then((records) =>
        records.map((record) => ({
          name: record.name,
          englishName: englishName(record.names, record.name),
          record,
        })),
      );
    typeCatalogPromise.catch(() => {
      typeCatalogPromise = null;
    });
  }
  return typeCatalogPromise;
}

export interface HomeSpecies extends SpeciesRef {
  types: { name: string; slot: number }[];
}

export interface HomeData {
  species: HomeSpecies[];
  generations: GenerationInfo[];
  types: { name: string; englishName: string }[];
  generationBySpecies: Map<number, string>;
}

let homeDataPromise: Promise<HomeData> | null = null;

export function getHomeData(): Promise<HomeData> {
  if (!homeDataPromise) {
    homeDataPromise = Promise.all([getSpeciesIndex(), getGenerations(), getTypeCatalog()]).then(
      ([speciesById, generations, types]) => {
        const typesBySpecies = new Map<number, { name: string; slot: number }[]>();
        for (const type of types) {
          for (const entry of type.record.pokemon) {
            const id = idFromUrl(entry.pokemon.url);
            if (id === null || !speciesById.has(id)) continue;
            const list = typesBySpecies.get(id) ?? [];
            if (!list.some((item) => item.name === type.name)) {
              list.push({ name: type.name, slot: entry.slot ?? 1 });
              typesBySpecies.set(id, list);
            }
          }
        }
        for (const list of typesBySpecies.values()) list.sort((a, b) => a.slot - b.slot);

        const species = [...speciesById.values()]
          .sort((a, b) => a.id - b.id)
          .map((ref) => ({ ...ref, types: typesBySpecies.get(ref.id) ?? [] }));

        return {
          species,
          generations: generations.list,
          types: types.map((type) => ({ name: type.name, englishName: type.englishName })),
          generationBySpecies: generations.bySpecies,
        };
      },
    );
    homeDataPromise.catch(() => {
      homeDataPromise = null;
    });
  }
  return homeDataPromise;
}
