/* Runtime access to the PokeAPI server. Nothing here is fetched at build time. */

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  url: string;

  constructor(status: number, url: string) {
    super(`PokeAPI request failed (${status}): ${url}`);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }
}

const cache = new Map<string, Promise<any>>();

/** Resolve an API-relative path or one of the absolute URLs returned by the API. */
export function resolveApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/api/v2/')) return `${API_BASE_URL}${pathOrUrl}`;
  return `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function api<T = any>(pathOrUrl: string): Promise<T> {
  const url = resolveApiUrl(pathOrUrl);
  let promise = cache.get(url);
  if (!promise) {
    promise = fetch(url, { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status, url);
        return response.json();
      })
      .catch((error) => {
        cache.delete(url);
        throw error;
      });
    cache.set(url, promise);
  }
  return promise;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function idFromUrl(url: string | undefined | null): number {
  if (!url) return NaN;
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch`. */
export function humanize(name: string): string {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function englishName(names: Array<any> | undefined, fallback: string): string {
  const entry = names?.find((item) => item?.language?.name === 'en');
  return entry?.name ?? fallback;
}

export function englishGenus(genera: Array<any> | undefined): string {
  const entry = genera?.find((item) => item?.language?.name === 'en');
  return entry?.genus ?? '';
}

export function collapseWhitespace(text: string): string {
  return String(text).replace(/\s+/g, ' ').trim();
}

export function latestEnglishFlavorText(entries: Array<any> | undefined): string | null {
  if (!entries?.length) return null;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]?.language?.name === 'en' && entries[i]?.flavor_text) {
      return collapseWhitespace(entries[i].flavor_text);
    }
  }
  return null;
}

export function dash(value: unknown): string | number {
  return value === null || value === undefined || value === '' ? '—' : (value as string | number);
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export interface TypeInfo {
  name: string;
  englishName: string;
  resource: any;
}

export interface GenerationInfo {
  name: string;
  englishName: string;
  resource: any;
}

export interface SpeciesEntry {
  id: number;
  name: string;
  types: string[];
  generation: string | null;
}

let speciesIndexPromise: Promise<SpeciesEntry[]> | undefined;
let speciesMapPromise: Promise<Map<number, string>> | undefined;
let typeInfoPromise: Promise<TypeInfo[]> | undefined;
let generationInfoPromise: Promise<GenerationInfo[]> | undefined;
let pokedexDataPromise: Promise<{ species: SpeciesEntry[]; types: TypeInfo[]; generations: GenerationInfo[] }> | undefined;

export function getSpeciesIndex(): Promise<SpeciesEntry[]> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = api<any>('pokemon-species/?limit=100000').then((data) => {
      return (data.results ?? [])
        .map((entry: any) => ({ id: idFromUrl(entry.url), name: entry.name }))
        .filter((entry: any) => Number.isFinite(entry.id) && entry.id <= 10000)
        .sort((a: any, b: any) => a.id - b.id)
        .map((entry: any) => ({ ...entry, types: [], generation: null }));
    });
  }
  return speciesIndexPromise;
}

export function getSpeciesNameMap(): Promise<Map<number, string>> {
  if (!speciesMapPromise) {
    speciesMapPromise = getSpeciesIndex().then((species) => new Map(species.map((entry) => [entry.id, entry.name])));
  }
  return speciesMapPromise;
}

export function getTypes(): Promise<TypeInfo[]> {
  if (!typeInfoPromise) {
    typeInfoPromise = api<any>('type/?limit=100000').then(async (data) => {
      const results = (data.results ?? []).filter((entry: any) => !EXCLUDED_TYPES.has(entry.name));
      const resources = await Promise.all(results.map((entry: any) => api<any>(entry.url)));
      return resources.map((resource) => ({
        name: resource.name,
        englishName: englishName(resource.names, humanize(resource.name)),
        resource,
      }));
    });
  }
  return typeInfoPromise;
}

export function getGenerations(): Promise<GenerationInfo[]> {
  if (!generationInfoPromise) {
    generationInfoPromise = api<any>('generation/?limit=100000').then(async (data) => {
      const results = data.results ?? [];
      const resources = await Promise.all(results.map((entry: any) => api<any>(entry.url)));
      return resources.map((resource) => ({
        name: resource.name,
        englishName: englishName(resource.names, humanize(resource.name)),
        resource,
      }));
    });
  }
  return generationInfoPromise;
}

/** Build the species list, including each species' default Pokémon's types and generation. */
export function getPokedexData(): Promise<{ species: SpeciesEntry[]; types: TypeInfo[]; generations: GenerationInfo[] }> {
  if (!pokedexDataPromise) {
    pokedexDataPromise = Promise.all([getSpeciesIndex(), getTypes(), getGenerations()]).then(
      ([species, types, generations]) => {
        const byId = new Map(species.map((entry) => [entry.id, entry]));
        const slots = new Map<number, Array<{ slot: number; name: string }>>();
        for (const type of types) {
          for (const entry of type.resource.pokemon ?? []) {
            const id = idFromUrl(entry?.pokemon?.url);
            if (!Number.isFinite(id) || id > 10000 || !byId.has(id)) continue;
            const list = slots.get(id) ?? [];
            list.push({ slot: Number(entry.slot) || list.length + 1, name: type.name });
            slots.set(id, list);
          }
        }

        const generationById = new Map<number, string>();
        for (const generation of generations) {
          for (const entry of generation.resource.pokemon_species ?? []) {
            const id = idFromUrl(entry?.url);
            if (Number.isFinite(id)) generationById.set(id, generation.name);
          }
        }

        const result = species.map((entry) => {
          const own = (slots.get(entry.id) ?? []).slice().sort((a, b) => a.slot - b.slot);
          return {
            ...entry,
            types: own.map((slot) => slot.name),
            generation: generationById.get(entry.id) ?? null,
          };
        });

        return { species: result, types, generations };
      },
    );
  }
  return pokedexDataPromise;
}

export interface PokemonPageData {
  species: any;
  pokemon: any;
  englishName: string;
  genus: string;
  types: Array<{ name: string; label: string }>;
  flavorText: string | null;
}

export async function getPokemonPageData(name: string): Promise<PokemonPageData> {
  const species = await api<any>(`pokemon-species/${encodeURIComponent(name)}`);
  const variety = species.varieties?.find((entry: any) => entry.is_default)?.pokemon?.name;
  const pokemon = await api<any>(`pokemon/${encodeURIComponent(variety ?? species.name)}`);
  return {
    species,
    pokemon,
    englishName: englishName(species.names, humanize(species.name)),
    genus: englishGenus(species.genera),
    types: (pokemon.types ?? []).map((entry: any) => ({
      name: entry.type.name,
      label: humanize(entry.type.name),
    })),
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
  };
}

export interface MoveListEntry {
  speciesName: string;
  id: number;
}

/** Map Pokémon references (which may be alternate forms) to their species, excluding alternate forms. */
export async function mapPokemonToSpecies(entries: Array<any>): Promise<MoveListEntry[]> {
  const speciesById = await getSpeciesNameMap();
  const seen = new Set<number>();
  const result: MoveListEntry[] = [];
  for (const entry of entries ?? []) {
    const id = idFromUrl(entry?.url);
    if (!Number.isFinite(id) || id > 10000 || !speciesById.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, speciesName: speciesById.get(id)! });
  }
  return result.sort((a, b) => a.id - b.id);
}

export interface MoveDetailRow {
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveMethodGroup {
  methodName: string;
  label: string;
  rows: MoveDetailRow[];
}

export interface VersionGroupOption {
  name: string;
  label: string;
  order: number;
}

export interface PokemonMovesData {
  versionGroups: VersionGroupOption[];
  selectedGame: string;
  methodGroups: MoveMethodGroup[];
}

export async function getPokemonMovesData(pokemon: any, requestedGame: string | null): Promise<PokemonMovesData> {
  const usedGroups = new Map<string, any>();
  const details: any[] = [];
  for (const entry of pokemon.moves ?? []) {
    for (const detail of entry.version_group_details ?? []) {
      if (!detail?.version_group?.name) continue;
      usedGroups.set(detail.version_group.name, detail.version_group);
      details.push({ ...detail, move: entry.move });
    }
  }

  const groupResources = await Promise.all(
    [...usedGroups.values()].map((group) => api<any>(group.url ?? `version-group/${group.name}`)),
  );

  // Build the version-group options directly from the fetched resources.
  const options: VersionGroupOption[] = groupResources.map((resource: any) => ({
    name: resource.name,
    label: humanize(resource.name),
    order: Number(resource.order ?? 0),
  }));
  options.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const defaultGame = options.length ? options[options.length - 1].name : '';
  const selectedGame = requestedGame && options.some((option) => option.name === requestedGame) ? requestedGame : defaultGame;

  const selectedDetails = details.filter((detail) => detail.version_group.name === selectedGame);
  const moveNames = [...new Set(selectedDetails.map((detail) => detail.move.name))];
  const moveResources = await Promise.all(moveNames.map((name) => api<any>(`move/${encodeURIComponent(name)}`)));
  const resourceByName = new Map(moveResources.map((resource) => [resource.name, resource]));

  const groups = new Map<string, MoveMethodGroup>();
  for (const detail of selectedDetails) {
    const methodName = detail.move_learn_method?.name ?? 'other';
    const move = resourceByName.get(detail.move.name);
    if (!move) continue;
    const row: MoveDetailRow = {
      level: Number.isFinite(Number(detail.level_learned_at)) ? Number(detail.level_learned_at) : null,
      moveName: move.name,
      moveLabel: englishName(move.names, humanize(move.name)),
      typeName: move.type?.name ?? '',
      typeLabel: humanize(move.type?.name ?? ''),
      category: humanize(move.damage_class?.name ?? ''),
      power: move.power === null || move.power === undefined ? null : Number(move.power),
      accuracy: move.accuracy === null || move.accuracy === undefined ? null : Number(move.accuracy),
      pp: move.pp === null || move.pp === undefined ? null : Number(move.pp),
    };
    const group = groups.get(methodName) ?? { methodName, label: humanize(methodName), rows: [] };
    group.rows.push(row);
    groups.set(methodName, group);
  }

  const methodGroups = [...groups.values()];
  for (const group of methodGroups) {
    group.rows.sort((a, b) => {
      if (group.methodName === 'level-up') {
        const levelA = a.level ?? Number.MAX_SAFE_INTEGER;
        const levelB = b.level ?? Number.MAX_SAFE_INTEGER;
        if (levelA !== levelB) return levelA - levelB;
      }
      return a.moveLabel.localeCompare(b.moveLabel);
    });
  }

  const methodOrder = ['level-up', 'machine', 'egg', 'tutor'];
  methodGroups.sort((a, b) => {
    const aIndex = methodOrder.indexOf(a.methodName);
    const bIndex = methodOrder.indexOf(b.methodName);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.methodName.localeCompare(b.methodName);
  });

  return { versionGroups: options, selectedGame, methodGroups };
}
