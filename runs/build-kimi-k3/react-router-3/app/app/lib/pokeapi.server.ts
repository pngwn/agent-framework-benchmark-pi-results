// Server-side data layer. Fetches everything from the PokeAPI-compatible HTTP API at
// request time and caches responses in memory for the lifetime of the process.
import { englishName, humanize, idFromUrl, type NamedResource } from "./format";

const API = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, url: string) {
    super(`API request failed: ${status} ${url}`);
    this.status = status;
  }
}

const cache = new Map<string, Promise<any>>();

/** Fetch a JSON document from the API. Accepts an API path or a full URL from the API. */
export function apiGet<T = any>(pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${API}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  let promise = cache.get(url);
  if (!promise) {
    promise = fetch(url).then((res) => {
      if (!res.ok) throw new ApiError(res.status, url);
      return res.json();
    });
    cache.set(url, promise);
    // Retry transient failures on the next request; keep successful responses cached.
    promise.catch(() => cache.delete(url));
  }
  return promise as Promise<T>;
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

/** Resolve a (possibly relative) media path to an absolute URL on the API origin. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API}${path}`;
}

/** Front sprite for a Pokémon/species id (the API ships this pattern for every id). */
export function spriteUrl(id: number): string {
  return `${API}/media/sprites/pokemon/${id}.png`;
}

/** Any sprite-set URL following the API's `/media/sprites/pokemon/<set>/<id>.png` pattern. */
export function spritePatternUrl(id: number, set: string): string {
  return `${API}/media/sprites/pokemon/${set}/${id}.png`;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

interface ListResponse {
  count: number;
  results: NamedResource[];
}

// ---- Species ----

let speciesByIdPromise: Promise<Map<number, string>> | null = null;

/** Map of species id -> species API name, covering every species the API lists. */
export function getSpeciesById(): Promise<Map<number, string>> {
  speciesByIdPromise ??= apiGet<ListResponse>("/api/v2/pokemon-species/?limit=100000").then(
    (list) => new Map(list.results.map((r) => [idFromUrl(r.url), r.name])),
  );
  return speciesByIdPromise;
}

// ---- Types ----

export const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export interface TypeSummary {
  name: string;
  english: string;
}

let typesPromise: Promise<TypeSummary[]> | null = null;

/** The 18 types in API order, with English names. */
export function getTypes(): Promise<TypeSummary[]> {
  typesPromise ??= apiGet<ListResponse>("/api/v2/type/?limit=100").then(async (list) => {
    const names = list.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
    const types = await mapLimit(names, 8, (n) => apiGet<any>(`/api/v2/type/${n}/`));
    return types.map((t) => ({ name: t.name as string, english: englishName(t) }));
  });
  return typesPromise;
}

// ---- Pokédex index (home page) ----

export interface SpeciesEntry {
  id: number;
  name: string;
  types: { name: string; english: string }[];
  generation: string;
}

export interface GenerationInfo {
  name: string;
  english: string;
}

export interface PokedexIndex {
  species: SpeciesEntry[];
  types: TypeSummary[];
  generations: GenerationInfo[];
}

let indexPromise: Promise<PokedexIndex> | null = null;

export function getIndex(): Promise<PokedexIndex> {
  indexPromise ??= buildIndex();
  return indexPromise;
}

async function buildIndex(): Promise<PokedexIndex> {
  const [speciesList, generationList, types] = await Promise.all([
    apiGet<ListResponse>("/api/v2/pokemon-species/?limit=100000"),
    apiGet<ListResponse>("/api/v2/generation/?limit=100"),
    getTypes(),
  ]);
  const generations = await mapLimit(generationList.results, 8, (r) =>
    apiGet<any>(`/api/v2/generation/${idFromUrl(r.url)}/`),
  );
  generations.sort((a, b) => a.id - b.id);

  const generationBySpecies = new Map<string, string>();
  for (const g of generations) {
    for (const s of g.pokemon_species as NamedResource[]) {
      generationBySpecies.set(s.name, g.name);
    }
  }

  // Current types per species id, from the type records (slot order).
  const typesBySpeciesId = new Map<number, { slot: number; name: string; english: string }[]>();
  const englishByName = new Map(types.map((t) => [t.name, t.english]));
  await mapLimit(types, 8, async (t) => {
    const full = await apiGet<any>(`/api/v2/type/${t.name}/`);
    for (const entry of full.pokemon as { slot: number; pokemon: NamedResource }[]) {
      const id = idFromUrl(entry.pokemon.url);
      if (id >= 10000) continue; // alternate forms are out of scope
      let arr = typesBySpeciesId.get(id);
      if (!arr) typesBySpeciesId.set(id, (arr = []));
      arr.push({ slot: entry.slot, name: t.name, english: englishByName.get(t.name) ?? humanize(t.name) });
    }
  });

  const species: SpeciesEntry[] = speciesList.results
    .map((r) => {
      const id = idFromUrl(r.url);
      const typesOfSpecies = (typesBySpeciesId.get(id) ?? [])
        .sort((a, b) => a.slot - b.slot)
        .map(({ name, english }) => ({ name, english }));
      return {
        id,
        name: r.name,
        types: typesOfSpecies,
        generation: generationBySpecies.get(r.name) ?? "",
      };
    })
    .sort((a, b) => a.id - b.id);

  return {
    species,
    types,
    generations: generations.map((g) => ({ name: g.name as string, english: englishName(g) })),
  };
}

// ---- Pokémon reference cards ----

export interface PokemonCardData {
  id: number;
  speciesName: string;
  hidden?: boolean;
}

/**
 * Maps references to Pokémon (as found in move/ability/type data) to their species.
 * Alternate forms (ids above 10000) are dropped; duplicates collapse to one species.
 */
export async function pokemonRefsToCards(
  refs: { pokemon?: NamedResource; url?: string; is_hidden?: boolean }[],
): Promise<PokemonCardData[]> {
  const speciesById = await getSpeciesById();
  const byId = new Map<number, PokemonCardData>();
  for (const ref of refs) {
    const resource = ref.pokemon ?? (ref as NamedResource);
    if (!resource?.url) continue;
    const id = idFromUrl(resource.url);
    if (id >= 10000) continue;
    const speciesName = speciesById.get(id);
    if (!speciesName) continue;
    const existing = byId.get(id);
    const hidden = ref.is_hidden === true;
    if (existing) existing.hidden = existing.hidden || hidden;
    else byId.set(id, { id, speciesName, hidden });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
