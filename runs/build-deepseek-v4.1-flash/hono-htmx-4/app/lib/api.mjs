// Thin client for the local PokéAPI instance. Everything is fetched at request
// time and cached in memory for the lifetime of the process.

export const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

const cache = new Map();

function cached(key, loader) {
  if (cache.has(key)) return cache.get(key);
  const promise = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
}

function absoluteUrl(pathOrUrl) {
  const value = String(pathOrUrl);
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith('/') ? '' : '/'}${value}`;
}

export async function fetchJson(pathOrUrl) {
  const url = absoluteUrl(pathOrUrl);
  return cached(`GET ${url}`, async () => {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (response.status === 404) throw new NotFoundError();
    if (!response.ok) throw new Error(`API ${response.status} for ${url}`);
    return response.json();
  });
}

export function refPath(url) {
  try {
    const parsed = new URL(url, API_BASE);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

export function idFromUrl(url) {
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function nameFromUrl(url) {
  try {
    const path = new URL(url, API_BASE).pathname.replace(/\/+$/, '');
    return path.split('/').pop() || null;
  } catch {
    return null;
  }
}

export function mediaUrl(path) {
  return `${API_BASE}/media/${String(path).replace(/^\/+/, '')}`;
}

export function spriteUrl(id) {
  return mediaUrl(`sprites/pokemon/${id}.png`);
}

export function englishName(resource) {
  const entry = resource?.names?.find((item) => item.language?.name === 'en');
  return entry?.name ?? null;
}

export async function getSpeciesCatalog() {
  return cached('species-catalog', async () => {
    const data = await fetchJson('/api/v2/pokemon-species/?limit=100000');
    const list = (data.results ?? [])
      .map((entry) => ({
        id: idFromUrl(entry.url),
        name: entry.name || nameFromUrl(entry.url),
      }))
      .filter((entry) => entry.id !== null)
      .sort((a, b) => a.id - b.id);
    const byId = new Map(list.map((entry) => [entry.id, entry]));
    const byName = new Map(list.map((entry) => [entry.name.toLowerCase(), entry]));
    return { list, byId, byName };
  });
}

export async function getSpeciesByName(name) {
  return fetchJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
}

export async function getPokemon(nameOrId) {
  return fetchJson(`/api/v2/pokemon/${encodeURIComponent(String(nameOrId))}/`);
}

export async function getMove(name) {
  return fetchJson(`/api/v2/move/${encodeURIComponent(name)}/`);
}

export async function getAbility(name) {
  return fetchJson(`/api/v2/ability/${encodeURIComponent(name)}/`);
}

export async function getType(name) {
  return fetchJson(`/api/v2/type/${encodeURIComponent(name)}/`);
}

export async function getTypeList() {
  return cached('type-list', async () => {
    const data = await fetchJson('/api/v2/type/?limit=100000');
    const hidden = new Set(['stellar', 'unknown', 'shadow']);
    return (data.results ?? [])
      .map((entry) => ({
        id: idFromUrl(entry.url),
        name: entry.name || nameFromUrl(entry.url),
      }))
      .filter((entry) => entry.id !== null && !hidden.has(entry.name))
      .sort((a, b) => a.id - b.id);
  });
}

export async function getGenerationList() {
  return cached('generation-list', async () => {
    const data = await fetchJson('/api/v2/generation/?limit=100000');
    const refs = (data.results ?? [])
      .map((entry) => ({
        id: idFromUrl(entry.url),
        name: entry.name || nameFromUrl(entry.url),
      }))
      .filter((entry) => entry.id !== null)
      .sort((a, b) => a.id - b.id);
    const details = await Promise.all(refs.map((entry) => getGeneration(entry.name)));
    return refs.map((entry, index) => ({
      ...entry,
      label: englishName(details[index]) || `Generation ${romanNumeral(entry.id)}`,
    }));
  });
}

export async function getGeneration(name) {
  return fetchJson(`/api/v2/generation/${encodeURIComponent(name)}/`);
}

export async function getVersionGroup(name) {
  return fetchJson(`/api/v2/version-group/${encodeURIComponent(name)}/`);
}

export async function getEvolutionChain(urlOrId) {
  const key = String(urlOrId).includes('/') ? refPath(urlOrId) : `/api/v2/evolution-chain/${urlOrId}/`;
  return fetchJson(key);
}

function romanNumeral(value) {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return numerals[value - 1] ?? String(value);
}
