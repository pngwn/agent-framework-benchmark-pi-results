import {
  EXCLUDED_TYPES,
  englishName,
  humanize,
  idFromUrl,
  type FlavorTextEntry,
  type LanguageEntry,
  type ListResponse,
  type NamedResource,
} from './format';

const API_ORIGIN = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing) return existing as Promise<T>;
  const promise = load();
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

async function apiFetch<T>(path: string): Promise<T | null> {
  const url = `${API_ORIGIN}/api/v2/${path.replace(/^\/+/, '')}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export interface SpeciesIndexEntry {
  id: number;
  name: string;
  displayName: string;
}

export interface SpeciesRecord {
  id: number;
  name: string;
  names: LanguageEntry[];
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: FlavorTextEntry[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedResource }[];
  generation: NamedResource;
}

export interface PokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: { is_hidden: boolean; slot: number; ability: NamedResource }[];
  moves: {
    move: NamedResource;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedResource;
      move_learn_method: NamedResource;
    }[];
  }[];
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null };
      home?: { front_default: string | null };
    };
  };
  stats: { base_stat: number; effort: number; stat: NamedResource }[];
  types: { slot: number; type: NamedResource }[];
  species: NamedResource;
}

export interface GenerationRecord {
  id: number;
  name: string;
  order: number;
  names: LanguageEntry[];
  pokemon_species: NamedResource[];
}

export interface GenerationInfo {
  id: number;
  name: string;
  label: string;
  speciesIds: number[];
}

export interface TypeRecord {
  id: number;
  name: string;
  names: LanguageEntry[];
  pokemon: { slot: number; pokemon: NamedResource }[];
  moves: NamedResource[];
  damage_relations: {
    double_damage_to: NamedResource[];
    half_damage_to: NamedResource[];
    no_damage_to: NamedResource[];
    double_damage_from: NamedResource[];
    half_damage_from: NamedResource[];
    no_damage_from: NamedResource[];
  };
}

export interface TypeInfo {
  id: number;
  name: string;
  label: string;
  pokemon: { id: number; name: string; slot: number }[];
  moves: NamedResource[];
  record: TypeRecord;
}

export interface EvolutionNode {
  species: NamedResource;
  evolves_to: EvolutionNode[];
}

export interface EvolutionChainRecord {
  id: number;
  chain: EvolutionNode;
}

export interface VersionGroupRecord {
  id: number;
  name: string;
  order: number;
}

export interface MoveRecord {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  names: LanguageEntry[];
  effect_entries: { short_effect: string; language: { name: string } }[];
  flavor_text_entries: FlavorTextEntry[];
  type: NamedResource | null;
  damage_class: NamedResource | null;
  learned_by_pokemon: NamedResource[];
}

export interface AbilityRecord {
  id: number;
  name: string;
  names: LanguageEntry[];
  effect_entries: { short_effect: string; language: { name: string } }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedResource }[];
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${API_ORIGIN}${path}`;
  return null;
}

export function frontSpriteUrl(pokemonId: number): string {
  return `${API_ORIGIN}/media/sprites/pokemon/${pokemonId}.png`;
}

export function officialArtworkUrl(pokemon: PokemonRecord): string | null {
  return (
    assetUrl(pokemon.sprites?.other?.['official-artwork']?.front_default) ??
    assetUrl(pokemon.sprites?.other?.home?.front_default) ??
    assetUrl(pokemon.sprites?.front_default)
  );
}

export function getAllSpecies(): Promise<SpeciesIndexEntry[]> {
  return cached('all-species', async () => {
    const list = await apiFetch<ListResponse<NamedResource>>('pokemon-species/?limit=100000');
    if (!list) return [];
    return list.results
      .map((entry) => {
        const id = idFromUrl(entry.url);
        return id === null ? null : { id, name: entry.name, displayName: humanize(entry.name) };
      })
      .filter((entry): entry is SpeciesIndexEntry => itemPresent(entry))
      .sort((a, b) => a.id - b.id);
  });
}

export function getAllGenerations(): Promise<GenerationInfo[]> {
  return cached('all-generations', async () => {
    const list = await apiFetch<ListResponse<NamedResource>>('generation/?limit=1000');
    if (!list) return [];
    const records = await mapLimit(list.results, 8, (item) => {
      const id = idFromUrl(item.url);
      return id === null ? Promise.resolve(null) : getGenerationRecord(String(id));
    });
    return records
      .filter((record): record is GenerationRecord => record !== null)
      .map((record) => ({
        id: record.id,
        name: record.name,
        label: englishName(record.names, record.name),
        speciesIds: record.pokemon_species
          .map((species) => idFromUrl(species.url))
          .filter((id): id is number => id !== null),
      }))
      .sort((a, b) => a.id - b.id);
  });
}

async function getGenerationRecord(idOrName: string): Promise<GenerationRecord | null> {
  return cached(`generation:${idOrName}`, () =>
    apiFetch<GenerationRecord>(`generation/${encodeURIComponent(idOrName)}`),
  );
}

async function getTypeRecord(name: string): Promise<TypeRecord | null> {
  return cached(`type:${name}`, () => apiFetch<TypeRecord>(`type/${encodeURIComponent(name)}`));
}

export function getAllTypes(): Promise<TypeInfo[]> {
  return cached('all-types', async () => {
    const list = await apiFetch<ListResponse<NamedResource>>('type/?limit=1000');
    if (!list) return [];
    const names = list.results.map((item) => item.name).filter((name) => !EXCLUDED_TYPES.has(name));
    const records = await mapLimit(names, 8, (name) => getTypeRecord(name));
    return records
      .filter((record): record is TypeRecord => record !== null)
      .map((record) => ({
        id: record.id,
        name: record.name,
        label: englishName(record.names, record.name),
        pokemon: record.pokemon
          .map((entry) => {
            const id = idFromUrl(entry.pokemon.url);
            return id === null ? null : { id, name: entry.pokemon.name, slot: entry.slot };
          })
          .filter((entry): entry is { id: number; name: string; slot: number } => itemPresent(entry)),
        moves: record.moves ?? [],
        record,
      }))
      .sort((a, b) => a.id - b.id);
  });
}

function itemPresent<T>(item: T | null): item is T {
  return item !== null;
}

export function getSpecies(name: string): Promise<SpeciesRecord | null> {
  return cached(`species:${name}`, () =>
    apiFetch<SpeciesRecord>(`pokemon-species/${encodeURIComponent(name)}`),
  );
}

export function getPokemon(idOrName: string | number): Promise<PokemonRecord | null> {
  return cached(`pokemon:${idOrName}`, () =>
    apiFetch<PokemonRecord>(`pokemon/${encodeURIComponent(String(idOrName))}`),
  );
}

export function getMove(name: string): Promise<MoveRecord | null> {
  return cached(`move:${name}`, () => apiFetch<MoveRecord>(`move/${encodeURIComponent(name)}`));
}

export function getAbility(name: string): Promise<AbilityRecord | null> {
  return cached(`ability:${name}`, () =>
    apiFetch<AbilityRecord>(`ability/${encodeURIComponent(name)}`),
  );
}

export function getVersionGroup(name: string): Promise<VersionGroupRecord | null> {
  return cached(`version-group:${name}`, () =>
    apiFetch<VersionGroupRecord>(`version-group/${encodeURIComponent(name)}`),
  );
}

export function getEvolutionChain(urlOrId: string | number): Promise<EvolutionChainRecord | null> {
  const id = idFromUrl(String(urlOrId));
  const key = id ?? String(urlOrId);
  return cached(`evolution-chain:${key}`, () =>
    apiFetch<EvolutionChainRecord>(`evolution-chain/${encodeURIComponent(String(key))}`),
  );
}

export function getEnglishMoveName(move: MoveRecord): string {
  return englishName(move.names, move.name);
}

export { mapLimit };
