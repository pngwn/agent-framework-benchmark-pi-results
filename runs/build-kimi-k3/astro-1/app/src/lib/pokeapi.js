// Data layer: everything is fetched from the live PokeAPI server over HTTP at
// request time. Responses are cached in memory for the lifetime of the process
// (the spec explicitly allows runtime caching).

const BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
const API_ROOT = `${BASE}/api/v2`;

const cache = new Map();

// Simple concurrency limiter so big fan-outs (hundreds of Pokémon records for a
// "learned by" list) don't open hundreds of sockets at once.
const MAX_CONCURRENT = 24;
let inFlight = 0;
const waiters = [];

async function acquire() {
  while (inFlight >= MAX_CONCURRENT) await new Promise((resolve) => waiters.push(resolve));
  inFlight++;
}

function release() {
  inFlight--;
  waiters.shift()?.();
}

export async function apiFetch(path) {
  const url = `${API_ROOT}${path}`;
  const cached = cache.get(url);
  if (cached) return cached;
  const promise = (async () => {
    await acquire();
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = new Error(`API request failed: ${res.status} ${url}`);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } finally {
      release();
    }
  })();
  cache.set(url, promise);
  // Don't cache failures forever.
  promise.catch(() => {
    if (cache.get(url) === promise) cache.delete(url);
  });
  return promise;
}

// Fetch a resource given an API reference ({ name, url }) where url may be
// absolute (http://host/api/v2/...) or root-relative (/api/v2/...).
export function apiFetchRef(ref) {
  const pathname = new URL(ref.url, API_ROOT).pathname;
  return apiFetch(pathname.replace(/^\/api\/v2/, ''));
}

export function idFromRef(ref) {
  const url = typeof ref === 'string' ? ref : ref.url;
  return Number(String(url).replace(/\/+$/, '').split('/').pop());
}

export function humanize(name) {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function enName(record) {
  return record.names?.find((n) => n.language?.name === 'en')?.name ?? humanize(record.name);
}

export function enGenus(record) {
  return record.genera?.find((g) => g.language?.name === 'en')?.genus ?? null;
}

// The last English flavor text entry, with all whitespace runs collapsed.
export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export async function listAll(resource) {
  return (await apiFetch(`/${resource}/?limit=100000`)).results;
}

let speciesListPromise;
export function getSpeciesList() {
  speciesListPromise ??= listAll('pokemon-species');
  return speciesListPromise;
}

let speciesIdsPromise;
export function getSpeciesIds() {
  speciesIdsPromise ??= getSpeciesList().then((list) => new Set(list.map((s) => idFromRef(s))));
  return speciesIdsPromise;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let typesPromise;
export function getTypes() {
  typesPromise ??= (async () => {
    const list = (await listAll('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
    return Promise.all(list.map((t) => apiFetch(`/type/${t.name}/`)));
  })();
  return typesPromise;
}

let typeNamesPromise;
export function getTypeNameMap() {
  typeNamesPromise ??= getTypes().then((types) => new Map(types.map((t) => [t.name, enName(t)])));
  return typeNamesPromise;
}

let generationsPromise;
export function getGenerations() {
  generationsPromise ??= (async () => {
    const list = await listAll('generation');
    return Promise.all(list.map((g) => apiFetch(`/generation/${g.name}/`)));
  })();
  return generationsPromise;
}

// Build Pokémon cards (one per species, ordered by dex number) from a list of
// Pokémon references. Alternate forms (Pokémon IDs without a matching species)
// are excluded; each Pokémon maps to its species for the card's link and name.
export async function cardsFromPokemonRefs(refs) {
  const speciesIds = await getSpeciesIds();
  const kept = refs
    .filter((ref) => speciesIds.has(idFromRef(ref)))
    .sort((a, b) => idFromRef(a) - idFromRef(b));
  const records = await Promise.all(kept.map((ref) => apiFetch(`/pokemon/${idFromRef(ref)}/`)));
  const bySpecies = new Map();
  for (const pokemon of records) {
    const speciesId = idFromRef(pokemon.species);
    if (bySpecies.has(speciesId)) continue;
    bySpecies.set(speciesId, {
      id: speciesId,
      name: pokemon.species.name,
      sprite: pokemon.sprites?.front_default ?? null,
    });
  }
  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}
