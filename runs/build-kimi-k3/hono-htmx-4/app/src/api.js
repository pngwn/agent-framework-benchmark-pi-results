// Data layer: fetches everything from the live PokeAPI server over HTTP and
// caches responses in memory for the lifetime of the process.

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');

const cache = new Map(); // path -> Promise<data|null> (null = 404)

async function fetchJson(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2${path}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
      return await res.json();
    } catch (err) {
      cache.delete(path); // allow retry on transient failures
      throw err;
    }
  })();
  cache.set(path, promise);
  return promise;
}

// Fetch a list endpoint fully (the snapshot is small enough for one request).
async function fetchList(resource) {
  const data = await fetchJson(`/${resource}/?limit=100000`);
  return data?.results ?? [];
}

export const idFromUrl = (url) => {
  const m = /\/(\d+)\/?$/.exec(url ?? '');
  return m ? Number(m[1]) : null;
};

export const species = (nameOrId) => fetchJson(`/pokemon-species/${nameOrId}/`);
export const pokemon = (nameOrId) => fetchJson(`/pokemon/${nameOrId}/`);
export const move = (nameOrId) => fetchJson(`/move/${nameOrId}/`);
export const ability = (nameOrId) => fetchJson(`/ability/${nameOrId}/`);
export const type = (nameOrId) => fetchJson(`/type/${nameOrId}/`);
export const generation = (nameOrId) => fetchJson(`/generation/${nameOrId}/`);
export const versionGroup = (nameOrId) => fetchJson(`/version-group/${nameOrId}/`);

export const evolutionChain = (url) => {
  const id = idFromUrl(url);
  return id ? fetchJson(`/evolution-chain/${id}/`) : null;
};

export async function speciesList() {
  const results = await fetchList('pokemon-species');
  return results.map((r) => ({ name: r.name, id: idFromUrl(r.url) }));
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// The 18 types in API order, with their English names.
export async function typeList() {
  const results = await fetchList('type');
  const entries = [];
  for (const r of results) {
    if (EXCLUDED_TYPES.has(r.name)) continue;
    const record = await type(r.name);
    if (!record) continue;
    entries.push({ name: r.name, englishName: englishName(record) ?? humanize(r.name) });
  }
  return entries;
}

export async function generationList() {
  const results = await fetchList('generation');
  const entries = [];
  for (const r of results) {
    const record = await generation(r.name);
    if (!record) continue;
    entries.push({ name: r.name, englishName: englishName(record) ?? humanize(r.name) });
  }
  return entries;
}

export function englishName(record) {
  return record?.names?.find((n) => n.language?.name === 'en')?.name ?? null;
}

export function humanize(name) {
  return String(name)
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function latestEnglishFlavorText(record) {
  const entries = record?.flavor_text_entries ?? [];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language?.name === 'en') {
      return entries[i].flavor_text.replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}

export function englishShortEffect(record) {
  const entry = record?.effect_entries?.find((e) => e.language?.name === 'en');
  return entry ? entry.short_effect.replace(/\s+/g, ' ').trim() : null;
}

export function englishGenus(speciesRecord) {
  return speciesRecord?.genera?.find((g) => g.language?.name === 'en')?.genus ?? null;
}

export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

// Fetch many records with bounded concurrency.
export async function fetchAll(items, fn, concurrency = 16) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}
