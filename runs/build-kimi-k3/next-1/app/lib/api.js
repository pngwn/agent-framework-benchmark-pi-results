// Data layer: all app data comes from the local PokeAPI server over HTTP at
// request time. Responses are cached in memory for the lifetime of the
// process (the API is read-only for us, and runtime caching is allowed).

import { enName } from 'lib/format';

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
export const MEDIA_BASE_URL = `${API_BASE_URL}/media`;

// Alternate forms (Mega Evolutions etc.) have Pokémon IDs above this number
// and are out of scope for every list.
export const MAX_FORM_ID = 10000;

const store = (globalThis.__pokedexStore ??= new Map());

// Simple concurrency limiter so we don't fire hundreds of simultaneous
// requests at the API server.
const MAX_CONCURRENT = 32;
let inFlight = 0;
const waiters = [];

async function limitedFetch(url) {
  if (inFlight >= MAX_CONCURRENT) {
    await new Promise((resolve) => waiters.push(resolve));
  }
  inFlight++;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API responded ${res.status} for ${url}`);
    return await res.json();
  } finally {
    inFlight--;
    const next = waiters.shift();
    if (next) next();
  }
}

function cached(key, load) {
  let entry = store.get(key);
  if (!entry) {
    entry = load();
    store.set(key, entry);
    // Failed loads are evicted so a later request can retry.
    entry.catch(() => {
      if (store.get(key) === entry) store.delete(key);
    });
  }
  return entry;
}

// Fetch a JSON resource. Accepts an API path (`/api/v2/...`) or an absolute
// URL as returned by the API in reference fields. Returns null on 404.
export function fetchJson(pathOrUrl) {
  const url = /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  return cached(url, () => limitedFetch(url));
}

export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url ?? '');
  return match ? Number(match[1]) : NaN;
}

const resource = (name) => (key) => fetchJson(`/api/v2/${name}/${encodeURIComponent(key)}/`);

export const getSpecies = resource('pokemon-species');
export const getPokemon = resource('pokemon');
export const getMove = resource('move');
export const getAbility = resource('ability');
export const getType = resource('type');
export const getGeneration = resource('generation');
export const getVersionGroup = resource('version-group');

// Every species the API lists, as { id, name } sorted by dex number.
export const getSpeciesIndex = () =>
  cached('derived:species-index', async () => {
    const data = await fetchJson('/api/v2/pokemon-species/?limit=100000');
    return (data?.results ?? [])
      .map((r) => ({ name: r.name, id: idFromUrl(r.url) }))
      .sort((a, b) => a.id - b.id);
  });

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// Records for the 18 types, in API order.
export const getTypeRecords = () =>
  cached('derived:type-records', async () => {
    const data = await fetchJson('/api/v2/type/?limit=100');
    const entries = (data?.results ?? []).filter((r) => !EXCLUDED_TYPES.has(r.name));
    return Promise.all(entries.map((r) => fetchJson(`/api/v2/type/${r.name}/`)));
  });

// Map of type API name -> English name.
export const getTypeLabels = () =>
  cached('derived:type-labels', async () => {
    const records = await getTypeRecords();
    const map = new Map();
    for (const rec of records) map.set(rec.name, enName(rec.names, rec.name));
    return map;
  });

// Map of species/Pokémon id -> its types ([{ slot, name }], in slot order),
// derived from the type records so a single set of cached records covers
// every Pokémon.
export const getPokemonTypesMap = () =>
  cached('derived:pokemon-types', async () => {
    const records = await getTypeRecords();
    const map = new Map();
    for (const rec of records) {
      for (const entry of rec.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon.url);
        if (!(id < MAX_FORM_ID)) continue;
        let list = map.get(id);
        if (!list) map.set(id, (list = []));
        list.push({ slot: entry.slot, name: rec.name });
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.slot - b.slot);
    return map;
  });

// Records for all generations, in API order.
export const getGenerationRecords = () =>
  cached('derived:generations', async () => {
    const data = await fetchJson('/api/v2/generation/?limit=100');
    return Promise.all((data?.results ?? []).map((r) => fetchJson(`/api/v2/generation/${r.name}/`)));
  });

// Map a list of Pokémon references ({ url, ...extra }) to their species,
// excluding alternate forms and species the API doesn't list, deduplicated
// and ordered by dex number. `extra` fields are merged into the result.
export async function mapToSpecies(refs) {
  const index = await getSpeciesIndex();
  const nameById = new Map(index.map((s) => [s.id, s.name]));
  const seen = new Map();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!(id < MAX_FORM_ID)) continue;
    const name = nameById.get(id);
    if (!name) continue;
    if (!seen.has(id)) seen.set(id, { id, name, ...ref.extra });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}
