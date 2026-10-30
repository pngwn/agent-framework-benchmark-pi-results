const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
const API_ROOT = `${API_BASE_URL}/api/v2`;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map();

export class HttpError extends Error {
  constructor(status, url) {
    super(`Request failed with status ${status}: ${url}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function isNotFound(error) {
  return error instanceof HttpError && error.status === 404;
}

export function humanize(name = '') {
  return String(name)
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function englishName(record, fallback) {
  const entry = record?.names?.find((item) => item.language?.name === 'en');
  return entry?.name ?? humanize(record?.name ?? fallback ?? '');
}

export function latestEnglishFlavor(entries = []) {
  const english = entries.filter((entry) => entry.language?.name === 'en');
  if (english.length === 0) return null;
  return collapseWhitespace(english[english.length - 1].flavor_text);
}

export function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function idFromUrl(url) {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function normalizeUrl(ref) {
  if (typeof ref !== 'string' || ref.length === 0) return ref;
  if (/^https?:\/\//i.test(ref)) {
    const url = new URL(ref);
    return `${API_BASE_URL}${url.pathname}${url.search}`;
  }
  if (ref.startsWith('/')) return `${API_BASE_URL}${ref}`;
  return `${API_ROOT}/${ref.replace(/^\/+/, '')}`;
}

async function requestJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new HttpError(response.status, url);
  return response.json();
}

export async function getJson(ref) {
  const url = normalizeUrl(ref);
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = requestJson(url);
  cache.set(url, { promise, expiresAt: now + CACHE_TTL_MS });
  promise.catch(() => {
    // Failed requests should not be cached.
    if (cache.get(url)?.promise === promise) cache.delete(url);
  });
  return promise;
}

export async function parallelMap(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

const HIDDEN_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export async function getSpeciesList() {
  const data = await getJson('pokemon-species/?limit=100000');
  return data.results
    .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url), url: normalizeUrl(entry.url) }))
    .filter((entry) => entry.id != null && entry.id <= 10000)
    .sort((a, b) => a.id - b.id);
}

export async function getSpeciesByName(name) {
  return getJson(`pokemon-species/${encodeURIComponent(name)}`);
}

export async function getPokemon(ref) {
  return getJson(`pokemon/${encodeURIComponent(ref)}`);
}

export async function getMove(name) {
  return getJson(`move/${encodeURIComponent(name)}`);
}

export async function getAbility(name) {
  return getJson(`ability/${encodeURIComponent(name)}`);
}

export async function getType(name) {
  return getJson(`type/${encodeURIComponent(name)}`);
}

export async function getEvolutionChain(ref) {
  return getJson(ref);
}

export async function getVersionGroup(name) {
  return getJson(`version-group/${encodeURIComponent(name)}`);
}

export async function getTypeList() {
  const data = await getJson('type/?limit=1000');
  return data.results
    .filter((entry) => !HIDDEN_TYPES.has(entry.name))
    .map((entry) => ({ name: entry.name, url: normalizeUrl(entry.url) }));
}

export async function getGenerationList() {
  const data = await getJson('generation/?limit=1000');
  const records = await Promise.all(data.results.map((entry) => getJson(entry.url)));
  return records
    .sort((a, b) => a.id - b.id)
    .map((record) => ({ name: record.name, label: englishName(record), record }));
}

export async function getGenerationSpecies(name) {
  const record = await getJson(`generation/${encodeURIComponent(name)}`);
  return new Set(record.pokemon_species.map((entry) => entry.name));
}

export async function getTypeSpeciesIds(name) {
  const record = await getJson(`type/${encodeURIComponent(name)}`);
  const ids = new Set();
  for (const entry of record.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (id != null && id <= 10000) ids.add(id);
  }
  return ids;
}

export async function getSpeciesIndex() {
  const list = await getSpeciesList();
  return new Map(list.map((entry) => [entry.id, entry]));
}

export function typeLabel(name) {
  return humanize(name);
}

export function spriteFor(pokemon, speciesId) {
  const sprite = pokemon?.sprites?.front_default;
  if (sprite) return normalizeUrl(sprite);
  return `${API_BASE_URL}/media/sprites/pokemon/${speciesId}.png`;
}

export function artworkFor(pokemon) {
  const artwork = pokemon?.sprites?.other?.['official-artwork']?.front_default;
  return artwork ? normalizeUrl(artwork) : null;
}
