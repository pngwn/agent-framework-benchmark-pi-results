import {
  englishName,
  englishShortEffect,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
  type NamedApiResource,
} from './format';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const responseCache = new Map<string, Promise<unknown>>();

function apiOrigin(): string {
  return (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');
}

function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/api/v2/') || pathOrUrl.startsWith('/media/')) {
    return `${apiOrigin()}${pathOrUrl}`;
  }
  return `${apiOrigin()}/api/v2${pathOrUrl}`;
}

export function apiGet<T>(pathOrUrl: string): Promise<T> {
  const url = toAbsoluteUrl(pathOrUrl);
  const cached = responseCache.get(url);
  if (cached) return cached as Promise<T>;

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new ApiError(response.status, `API request failed: ${url}`);
    }
    return response.json() as Promise<T>;
  });
  responseCache.set(url, request);
  request.catch(() => responseCache.delete(url));
  return request;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export function spriteUrl(pokemonId: number): string {
  return `${apiOrigin()}/media/sprites/pokemon/${pokemonId}.png`;
}

/* -------------------------------------------------------------------------- */
/* Shared API indexes                                                         */
/* -------------------------------------------------------------------------- */

export interface SpeciesRef {
  id: number;
  name: string;
  url: string;
}

let speciesRefsPromise: Promise<SpeciesRef[]> | undefined;

export function getSpeciesRefs(): Promise<SpeciesRef[]> {
  if (!speciesRefsPromise) {
    speciesRefsPromise = apiGet<{ results: NamedApiResource[] }>(
      '/pokemon-species?limit=100000',
    ).then((data) =>
      data.results
        .map((species) => ({
          id: idFromUrl(species.url),
          name: species.name,
          url: species.url,
        }))
        .filter((species) => species.id > 0 && species.id <= 10000)
        .sort((a, b) => a.id - b.id),
    );
    speciesRefsPromise.catch(() => {
      speciesRefsPromise = undefined;
    });
  }
  return speciesRefsPromise;
}

export interface TypeRef {
  id: number;
  name: string;
  label: string;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
let typeRefsPromise: Promise<TypeRef[]> | undefined;

export function getTypeRefs(): Promise<TypeRef[]> {
  if (!typeRefsPromise) {
    typeRefsPromise = apiGet<{ results: NamedApiResource[] }>('/type?limit=100000').then((data) =>
      data.results
        .filter((type) => !EXCLUDED_TYPES.has(type.name))
        .map((type) => ({
          id: idFromUrl(type.url),
          name: type.name,
          label: humanize(type.name),
        })),
    );
    typeRefsPromise.catch(() => {
      typeRefsPromise = undefined;
    });
  }
  return typeRefsPromise;
}

export interface GenerationRef {
  id: number;
  name: string;
  label: string;
}

let generationRefsPromise: Promise<GenerationRef[]> | undefined;

export function getGenerationRefs(): Promise<GenerationRef[]> {
  if (!generationRefsPromise) {
    generationRefsPromise = apiGet<{ results: NamedApiResource[] }>(
      '/generation?limit=100000',
    ).then((data) =>
      data.results
        .map((generation) => ({
          id: idFromUrl(generation.url),
          name: generation.name,
          label: humanize(generation.name).replace(
            /^Generation ([ivxlcdm]+)$/i,
            (_, numeral: string) => `Generation ${numeral.toUpperCase()}`,
          ),
        }))
        .sort((a, b) => a.id - b.id),
    );
    generationRefsPromise.catch(() => {
      generationRefsPromise = undefined;
    });
  }
  return generationRefsPromise;
}

/* -------------------------------------------------------------------------- */
/* Common API resource shapes                                                 */
/* -------------------------------------------------------------------------- */

export interface PokemonApiResource extends NamedApiResource {
  id: number;
}

export interface PokemonResource {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: Array<{ is_hidden: boolean; slot: number; ability: NamedApiResource }>;
  moves: Array<{
    move: NamedApiResource;
    version_group_details: Array<{
      level_learned_at: number;
      version_group: NamedApiResource;
      move_learn_method: NamedApiResource;
    }>;
  }>;
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null };
    };
  };
  stats: Array<{ base_stat: number; effort: number; stat: NamedApiResource }>;
  types: Array<{ slot: number; type: NamedApiResource }>;
  species: NamedApiResource;
}

export interface SpeciesResource {
  id: number;
  name: string;
  names: Array<{ name: string; language: NamedApiResource }>;
  genera: Array<{ genus: string; language: NamedApiResource }>;
  flavor_text_entries: Array<{ flavor_text: string; language: NamedApiResource }>;
  evolution_chain: { url: string };
  varieties: Array<{ is_default: boolean; pokemon: NamedApiResource }>;
  generation: NamedApiResource;
}

export interface EvolutionChainResource {
  id: number;
  chain: EvolutionNode;
}

export interface EvolutionNode {
  species: NamedApiResource;
  evolves_to: EvolutionNode[];
}

export interface VersionGroupResource {
  id: number;
  name: string;
  order: number;
}

let versionGroupsPromise: Promise<VersionGroupResource[]> | undefined;

export function getAllVersionGroups(): Promise<VersionGroupResource[]> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = apiGet<{ results: NamedApiResource[] }>(
      '/version-group?limit=100000',
    ).then(async (data) => {
      const groups = await mapLimit(data.results, 16, (group) =>
        apiGet<VersionGroupResource>(group.url),
      );
      return groups.sort((a, b) => a.order - b.order);
    });
    versionGroupsPromise.catch(() => {
      versionGroupsPromise = undefined;
    });
  }
  return versionGroupsPromise;
}

export interface MoveResource {
  id: number;
  name: string;
  accuracy: number | null;
  pp: number | null;
  power: number | null;
  effect_entries: Array<{
    effect: string;
    short_effect: string;
    language: NamedApiResource;
  }>;
  flavor_text_entries: Array<{ flavor_text: string; language: NamedApiResource }>;
  names: Array<{ name: string; language: NamedApiResource }>;
  damage_class: NamedApiResource;
  type: NamedApiResource;
  learned_by_pokemon: NamedApiResource[];
}

/* -------------------------------------------------------------------------- */
/* Page-specific data helpers                                                 */
/* -------------------------------------------------------------------------- */

export interface PokemonCardData {
  id: number;
  name: string;
  displayName: string;
  sprite: string | null;
  types?: Array<{ name: string; label: string }>;
  hiddenAbility?: boolean;
}

export interface PokemonListData {
  q: string;
  type: string;
  generation: string;
  page: number;
  totalPages: number;
  count: number;
  cards: PokemonCardData[];
  typeRefs: TypeRef[];
  generationRefs: GenerationRef[];
}

export interface TypePokemonEntry {
  slot: number;
  pokemon: NamedApiResource;
}

export async function getPokemonListData(url: URL): Promise<PokemonListData> {
  const q = url.searchParams.get('q') ?? '';
  const type = url.searchParams.get('type') ?? '';
  const generation = url.searchParams.get('generation') ?? '';

  const [species, typeRefs, generationRefs] = await Promise.all([
    getSpeciesRefs(),
    getTypeRefs(),
    getGenerationRefs(),
  ]);

  let filtered = species;

  if (type) {
    try {
      const typeData = await apiGet<{ pokemon: TypePokemonEntry[] }>(
        `/type/${encodeURIComponent(type)}`,
      );
      const ids = new Set(
        typeData.pokemon
          .map((entry) => idFromUrl(entry.pokemon.url))
          .filter((id) => id > 0 && id <= 10000),
      );
      filtered = filtered.filter((entry) => ids.has(entry.id));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) filtered = [];
      else throw error;
    }
  }

  if (generation) {
    try {
      const generationData = await apiGet<{ pokemon_species: NamedApiResource[] }>(
        `/generation/${encodeURIComponent(generation)}`,
      );
      const ids = new Set(
        generationData.pokemon_species
          .map((entry) => idFromUrl(entry.url))
          .filter((id) => id > 0 && id <= 10000),
      );
      filtered = filtered.filter((entry) => ids.has(entry.id));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) filtered = [];
      else throw error;
    }
  }

  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((entry) => humanize(entry.name).toLowerCase().includes(needle));
  }

  const count = filtered.length;
  const totalPages = Math.max(1, Math.ceil(count / 48));
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Math.min(
    Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
    totalPages,
  );
  const current = filtered.slice((page - 1) * 48, page * 48);

  const cards = await mapLimit(current, 24, async (entry): Promise<PokemonCardData> => {
    const pokemon = await apiGet<PokemonResource>(`/pokemon/${entry.id}`);
    return {
      id: entry.id,
      name: entry.name,
      displayName: humanize(entry.name),
      sprite: pokemon.sprites?.front_default ?? spriteUrl(entry.id),
      types: [...pokemon.types]
        .sort((a, b) => a.slot - b.slot)
        .map((entryType) => ({
          name: entryType.type.name,
          label: humanize(entryType.type.name),
        })),
    };
  });

  return { q, type, generation, page, totalPages, count, cards, typeRefs, generationRefs };
}

export async function getSpeciesByName(name: string): Promise<SpeciesResource> {
  return apiGet<SpeciesResource>(`/pokemon-species/${encodeURIComponent(name)}`);
}

export async function getPokemonByNameOrId(nameOrId: string | number): Promise<PokemonResource> {
  return apiGet<PokemonResource>(`/pokemon/${encodeURIComponent(String(nameOrId))}`);
}

export async function getEvolutionChain(url: string): Promise<EvolutionChainResource> {
  return apiGet<EvolutionChainResource>(url);
}

export async function getMoveByName(name: string): Promise<MoveResource> {
  return apiGet<MoveResource>(`/move/${encodeURIComponent(name)}`);
}

export async function getAbilityByName(name: string): Promise<{
  id: number;
  name: string;
  names: Array<{ name: string; language: NamedApiResource }>;
  effect_entries: Array<{ short_effect: string; language: NamedApiResource }>;
  pokemon: Array<{ is_hidden: boolean; slot: number; pokemon: NamedApiResource }>;
}> {
  return apiGet(`/ability/${encodeURIComponent(name)}`);
}

export interface TypeResource {
  id: number;
  name: string;
  names: Array<{ name: string; language: NamedApiResource }>;
  damage_relations: {
    no_damage_to: NamedApiResource[];
    half_damage_to: NamedApiResource[];
    double_damage_to: NamedApiResource[];
    no_damage_from: NamedApiResource[];
    half_damage_from: NamedApiResource[];
    double_damage_from: NamedApiResource[];
  };
  pokemon: TypePokemonEntry[];
  moves: NamedApiResource[];
}

export async function getTypeByName(name: string): Promise<TypeResource> {
  return apiGet<TypeResource>(`/type/${encodeURIComponent(name)}`);
}

export function cardForSpecies(
  species: SpeciesRef,
  extra: Partial<PokemonCardData> = {},
): PokemonCardData {
  return {
    id: species.id,
    name: species.name,
    displayName: humanize(species.name),
    sprite: spriteUrl(species.id),
    ...extra,
  };
}

export function moveSummary(move: MoveResource) {
  return {
    englishName: englishName(move),
    typeName: move.type.name,
    typeLabel: humanize(move.type.name),
    category: humanize(move.damage_class.name),
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect:
      englishShortEffect(move) ?? latestEnglishFlavorText(move),
  };
}
