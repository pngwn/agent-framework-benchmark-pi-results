// Data layer: fetches from the live PokeAPI server at request time and caches
// responses in memory for the lifetime of the process.
import { idFromUrl, englishName, humanize } from '../shared/format.js';

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

export class NotFoundError extends Error {
  constructor(what) {
    super(`Not found: ${what}`);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

const cache = new Map();

// Fetch a JSON document from the API. `path` is everything after the API origin,
// e.g. "/api/v2/pokemon/25/" or "/api/v2/pokemon-species/?limit=100000".
export function getJson(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = fetch(`${API_BASE}${path}`).then(async (res) => {
    if (res.status === 404) throw new NotFoundError(path);
    if (!res.ok) throw new Error(`API responded ${res.status} for ${path}`);
    return res.json();
  });
  cache.set(path, promise);
  promise.catch(() => cache.delete(path)); // allow a later retry after failures
  return promise;
}

// Fetch a resource record by API name or id: record('pokemon', 'pikachu').
export function record(resource, key) {
  return getJson(`/api/v2/${resource}/${encodeURIComponent(String(key))}/`);
}

const listCache = new Map();

// Full (unpaginated) results list for a resource.
export function getList(resource) {
  if (!listCache.has(resource)) {
    listCache.set(
      resource,
      getJson(`/api/v2/${resource}/?limit=100000`).then((page) => page.results),
    );
    listCache.get(resource).catch(() => listCache.delete(resource));
  }
  return listCache.get(resource);
}

// Run async `fn` over `items` with a bounded amount of parallelism.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

export function spriteUrl(pokemonId) {
  return `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;
}

// ---- Species summaries (powers the home page list and its filters) ----

let summariesPromise = null;

export function getSpeciesSummaries() {
  if (!summariesPromise) {
    summariesPromise = buildSummaries();
    summariesPromise.catch(() => (summariesPromise = null));
  }
  return summariesPromise;
}

async function buildSummaries() {
  const [speciesList, generationList] = await Promise.all([
    getList('pokemon-species'),
    getList('generation'),
  ]);
  const generationRecords = await mapLimit(generationList, 8, (g) =>
    record('generation', idFromUrl(g.url)),
  );
  const generations = generationRecords.map((g) => ({
    name: g.name,
    label: englishName(g.names) ?? humanize(g.name),
  }));
  const generationBySpecies = new Map();
  for (const g of generationRecords) {
    for (const s of g.pokemon_species ?? []) generationBySpecies.set(s.name, g.name);
  }
  const summaries = await mapLimit(speciesList, 32, async (entry) => {
    const id = idFromUrl(entry.url);
    const pokemon = await record('pokemon', id);
    let generation = generationBySpecies.get(entry.name);
    if (!generation) {
      const species = await record('pokemon-species', id);
      generation = species.generation?.name ?? '';
    }
    const types = [...(pokemon.types ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name);
    return {
      id,
      name: entry.name,
      generation,
      types,
      sprite: pokemon.sprites?.front_default ?? spriteUrl(id),
    };
  });
  summaries.sort((a, b) => a.id - b.id);
  return { summaries, generations };
}

// ---- Mapping Pokémon references to their species ----

let speciesMapPromise = null;

function getSpeciesMap() {
  if (!speciesMapPromise) {
    speciesMapPromise = getList('pokemon-species').then((list) => {
      const map = new Map();
      for (const entry of list) map.set(idFromUrl(entry.url), entry.name);
      return map;
    });
    speciesMapPromise.catch(() => (speciesMapPromise = null));
  }
  return speciesMapPromise;
}

// A species' default Pokémon has the same id as the species; Pokémon with ids above
// 10000 are alternate forms, which the app leaves out. Returns { id, name, sprite }
// for the species, or null for alternate forms.
export async function speciesForPokemonRef(pokemonUrl) {
  const id = idFromUrl(pokemonUrl);
  if (id == null || id >= 10000) return null;
  const map = await getSpeciesMap();
  const name = map.get(id);
  if (name) return { id, name, sprite: spriteUrl(id) };
  // Fallback for a Pokémon id with no matching species id: ask the record itself.
  const pokemon = await record('pokemon', id);
  const speciesId = idFromUrl(pokemon.species.url);
  return { id: speciesId, name: pokemon.species.name, sprite: spriteUrl(speciesId) };
}

export async function speciesCardsForPokemonRefs(refs, { extraFor } = {}) {
  const seen = new Map();
  for (const ref of refs) {
    const species = await speciesForPokemonRef(ref.url ?? ref.pokemon?.url ?? ref);
    if (!species || seen.has(species.id)) continue;
    seen.set(species.id, { ...species, extra: extraFor ? extraFor(ref, species) : '' });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}
