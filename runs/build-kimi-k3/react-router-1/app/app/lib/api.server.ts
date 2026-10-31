// Server-only data access layer for the local PokeAPI.
// All data is fetched over HTTP at request time; responses are cached in memory.

const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");
const API_V2 = `${API_BASE}/api/v2`;

export class ApiError extends Error {
  status: number;
  constructor(url: string, status: number) {
    super(`API request failed: ${url} (${status})`);
    this.status = status;
  }
}

// Simple concurrency limiter so we don't flood the API server.
const MAX_CONCURRENCY = 32;
let active = 0;
const waiters: Array<() => void> = [];
async function acquire() {
  if (active >= MAX_CONCURRENCY) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}

const cache = new Map<string, Promise<any>>();

/** Fetch JSON from the API. Accepts an API path ("/pokemon/25/") or an absolute URL from the data. */
export function getJSON<T = any>(pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_V2}${pathOrUrl}`;
  let promise = cache.get(url);
  if (!promise) {
    promise = (async () => {
      await acquire();
      try {
        const res = await fetch(url);
        if (!res.ok) throw new ApiError(url, res.status);
        return await res.json();
      } finally {
        release();
      }
    })();
    // Avoid unhandled rejection warnings for the cached promise.
    promise.catch(() => {});
    cache.set(url, promise);
  }
  return promise as Promise<T>;
}

export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : NaN;
}

export function mediaBase(): string {
  return `${API_BASE}/media`;
}

export function spriteUrl(id: number): string {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

export interface SpeciesEntry {
  id: number;
  name: string;
}

export interface SpeciesIndex {
  entries: SpeciesEntry[];
  byId: Map<number, SpeciesEntry>;
  byName: Map<string, SpeciesEntry>;
}

let speciesIndexPromise: Promise<SpeciesIndex> | null = null;

/** Every species the API lists, ordered by dex number. */
export function getSpeciesIndex(): Promise<SpeciesIndex> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = (async () => {
      const list = await getJSON(`/pokemon-species/?limit=100000`);
      const entries: SpeciesEntry[] = list.results
        .map((r: any) => ({ name: r.name, id: idFromUrl(r.url) }))
        .filter((e: SpeciesEntry) => Number.isFinite(e.id))
        .sort((a: SpeciesEntry, b: SpeciesEntry) => a.id - b.id);
      return {
        entries,
        byId: new Map(entries.map((e) => [e.id, e])),
        byName: new Map(entries.map((e) => [e.name, e])),
      };
    })();
    speciesIndexPromise.catch(() => {});
  }
  return speciesIndexPromise;
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

let typesPromise: Promise<any[]> | null = null;

/** The 18 types, in API order. */
export function getTypes(): Promise<any[]> {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await getJSON(`/type/?limit=100`);
      const names = list.results.map((r: any) => r.name).filter((n: string) => !EXCLUDED_TYPES.has(n));
      const records = await Promise.all(names.map((n: string) => getJSON(`/type/${n}/`)));
      return records.sort((a, b) => a.id - b.id);
    })();
    typesPromise.catch(() => {});
  }
  return typesPromise;
}

let generationsPromise: Promise<any[]> | null = null;

/** All generations, in API order. */
export function getGenerations(): Promise<any[]> {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await getJSON(`/generation/?limit=100`);
      const records = await Promise.all(list.results.map((r: any) => getJSON(`/generation/${r.name}/`)));
      return records.sort((a, b) => a.id - b.id);
    })();
    generationsPromise.catch(() => {});
  }
  return generationsPromise;
}

let speciesTypeMapPromise: Promise<Map<number, Array<{ slot: number; type: string }>>> | null = null;

/** Map of species id -> the types of its default Pokémon, in slot order. */
export function getSpeciesTypeMap(): Promise<Map<number, Array<{ slot: number; type: string }>>> {
  if (!speciesTypeMapPromise) {
    speciesTypeMapPromise = (async () => {
      const [species, types] = await Promise.all([getSpeciesIndex(), getTypes()]);
      const map = new Map<number, Array<{ slot: number; type: string }>>();
      for (const type of types) {
        for (const entry of type.pokemon ?? []) {
          const id = idFromUrl(entry.pokemon.url);
          // A species' default Pokémon has the same id as the species; anything
          // else (alternate forms) is excluded.
          if (!species.byId.has(id)) continue;
          const arr = map.get(id) ?? [];
          arr.push({ slot: entry.slot, type: type.name });
          map.set(id, arr);
        }
      }
      for (const arr of map.values()) arr.sort((a, b) => a.slot - b.slot);
      return map;
    })();
    speciesTypeMapPromise.catch(() => {});
  }
  return speciesTypeMapPromise;
}

/** Map a Pokémon reference (name/url) to its species, or null for alternate forms. */
export function pokemonRefToSpecies(ref: any, index: SpeciesIndex): SpeciesEntry | null {
  const id = idFromUrl(ref?.url ?? "");
  if (!Number.isFinite(id)) return null;
  return index.byId.get(id) ?? null;
}

/** Fetch a resource record by id or name, or return null when the API doesn't have it. */
export async function getRecordOrNull(resource: string, key: string | number): Promise<any | null> {
  try {
    return await getJSON(`/${resource}/${encodeURIComponent(String(key).toLowerCase())}/`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
