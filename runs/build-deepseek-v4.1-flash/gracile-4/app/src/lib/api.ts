const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message = `API request failed (${status})`) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const responseCache = new Map<string, Promise<any>>();

function apiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
}

export function fetchApi<T = any>(pathOrUrl: string): Promise<T> {
  const url = apiUrl(pathOrUrl);
  const cached = responseCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new ApiError(response.status);
      return (await response.json()) as T;
    })
    .catch((error) => {
      responseCache.delete(url);
      throw error;
    });

  responseCache.set(url, promise);
  return promise;
}

export function mediaSprite(id: number): string {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

export function humanize(value: string): string {
  return String(value ?? '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishName(resource: any, fallback = resource?.name): string {
  const entry = resource?.names?.find((item: any) => item.language?.name === 'en');
  return entry?.name ?? humanize(fallback ?? '');
}

export function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function latestEnglishFlavor(entries: any[] | undefined): string {
  const english = (entries ?? []).filter((entry) => entry.language?.name === 'en');
  return normalizeText(english.at(-1)?.flavor_text ?? '');
}

export function idFromUrl(url: string | undefined): number | null {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export type SpeciesRef = { id: number; name: string };

let allSpeciesPromise: Promise<SpeciesRef[]> | undefined;

export function getAllSpecies(): Promise<SpeciesRef[]> {
  if (!allSpeciesPromise) {
    allSpeciesPromise = fetchApi('pokemon-species?limit=10000')
      .then((data: any) =>
        (data.results ?? [])
          .map((entry: any) => ({ id: idFromUrl(entry.url), name: entry.name }))
          .filter((entry: SpeciesRef | { id: null }) => entry.id !== null && entry.id <= 10000)
          .sort((a: SpeciesRef, b: SpeciesRef) => a.id - b.id),
      )
      .catch((error) => {
        allSpeciesPromise = undefined;
        throw error;
      });
  }
  return allSpeciesPromise;
}

let speciesMapPromise: Promise<Map<number, string>> | undefined;
export function getSpeciesNameMap(): Promise<Map<number, string>> {
  if (!speciesMapPromise) {
    speciesMapPromise = getAllSpecies()
      .then((species) => new Map(species.map((entry) => [entry.id, entry.name])))
      .catch((error) => {
        speciesMapPromise = undefined;
        throw error;
      });
  }
  return speciesMapPromise;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let typeRefsPromise: Promise<SpeciesRef[]> | undefined;
export function getTypeRefs(): Promise<SpeciesRef[]> {
  if (!typeRefsPromise) {
    typeRefsPromise = fetchApi('type?limit=100')
      .then((data: any) =>
        (data.results ?? [])
          .map((entry: any) => ({ id: idFromUrl(entry.url), name: entry.name }))
          .filter(
            (entry: SpeciesRef | { id: null }) =>
              entry.id !== null && !EXCLUDED_TYPES.has(entry.name),
          )
          .sort((a: SpeciesRef, b: SpeciesRef) => a.id - b.id),
      )
      .catch((error) => {
        typeRefsPromise = undefined;
        throw error;
      });
  }
  return typeRefsPromise;
}

export function getType(name: string): Promise<any> {
  return fetchApi(`type/${encodeURIComponent(name)}`);
}

export async function getTypeDetails(): Promise<any[]> {
  const refs = await getTypeRefs();
  return Promise.all(refs.map((ref) => getType(ref.name)));
}

let typeNameMapPromise: Promise<Map<string, string>> | undefined;
export function getTypeNameMap(): Promise<Map<string, string>> {
  if (!typeNameMapPromise) {
    typeNameMapPromise = getTypeDetails()
      .then((types) => new Map(types.map((type) => [type.name, englishName(type, type.name)])))
      .catch((error) => {
        typeNameMapPromise = undefined;
        throw error;
      });
  }
  return typeNameMapPromise;
}

const typePokemonCache = new Map<string, Promise<Set<number>>>();

export function getTypePokemonIds(name: string): Promise<Set<number>> {
  const cached = typePokemonCache.get(name);
  if (cached) return cached;
  const promise = getType(name)
    .then((type) => {
      const ids = new Set<number>();
      for (const entry of type.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon?.url);
        if (id !== null && id <= 10000) ids.add(id);
      }
      return ids;
    })
    .catch((error) => {
      typePokemonCache.delete(name);
      throw error;
    });
  typePokemonCache.set(name, promise);
  return promise;
}

const generationCache = new Map<string, Promise<any>>();
export function getGeneration(name: string): Promise<any> {
  const cached = generationCache.get(name);
  if (cached) return cached;
  const promise = fetchApi(`generation/${encodeURIComponent(name)}`).catch((error) => {
    generationCache.delete(name);
    throw error;
  });
  generationCache.set(name, promise);
  return promise;
}

let generationsPromise: Promise<any[]> | undefined;

export function getGenerations(): Promise<any[]> {
  if (!generationsPromise) {
    generationsPromise = fetchApi('generation?limit=100')
      .then(async (data: any) => {
        const refs = (data.results ?? [])
          .map((entry: any) => ({ id: idFromUrl(entry.url), name: entry.name }))
          .filter((entry: any) => entry.id !== null)
          .sort((a: any, b: any) => a.id - b.id);
        return Promise.all(refs.map((ref: SpeciesRef) => getGeneration(ref.name)));
      })
      .catch((error) => {
        generationsPromise = undefined;
        throw error;
      });
  }
  return generationsPromise;
}


let generationFilterPromise: Promise<Map<number, string>> | undefined;
export function getGenerationSpeciesMap(): Promise<Map<number, string>> {
  if (!generationFilterPromise) {
    generationFilterPromise = getGenerations()
      .then((generations) => {
        const map = new Map<number, string>();
        for (const generation of generations) {
          for (const ref of generation.pokemon_species ?? []) {
            const id = idFromUrl(ref.url);
            if (id !== null) map.set(id, generation.name);
          }
        }
        return map;
      })
      .catch((error) => {
        generationFilterPromise = undefined;
        throw error;
      });
  }
  return generationFilterPromise;
}

export function getSpecies(name: string): Promise<any> {
  return fetchApi(`pokemon-species/${encodeURIComponent(name)}`);
}

export function getPokemon(nameOrId: string | number): Promise<any> {
  return fetchApi(`pokemon/${encodeURIComponent(String(nameOrId))}`);
}

export async function getPokemonForSpecies(species: any): Promise<any> {
  const variety =
    species.varieties?.find((entry: any) => entry.is_default)?.pokemon ??
    species.varieties?.[0]?.pokemon;
  if (!variety) throw new ApiError(404);
  return getPokemon(variety.name);
}

export function getMove(name: string): Promise<any> {
  return fetchApi(`move/${encodeURIComponent(name)}`);
}

export function getAbility(name: string): Promise<any> {
  return fetchApi(`ability/${encodeURIComponent(name)}`);
}

const versionGroupCache = new Map<string, Promise<any>>();
export function getVersionGroup(name: string): Promise<any> {
  const cached = versionGroupCache.get(name);
  if (cached) return cached;
  const promise = fetchApi(`version-group/${encodeURIComponent(name)}`).catch((error) => {
    versionGroupCache.delete(name);
    throw error;
  });
  versionGroupCache.set(name, promise);
  return promise;
}

export function getEvolutionChain(url: string): Promise<any> {
  return fetchApi(url);
}

export function isApiNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
