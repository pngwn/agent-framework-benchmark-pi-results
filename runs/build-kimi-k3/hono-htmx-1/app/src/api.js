// Data access layer. Everything comes from the live PokeAPI server over HTTP at
// request time; responses are cached in memory for the lifetime of the process.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const recordCache = new Map(); // "<resource>/<id>" -> Promise<record|null>
const listCache = new Map(); // "<resource>" -> Promise<results array>

async function fetchJson(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
  return res.json();
}

// Fetch a single API record by id or name. Returns null when the API has no
// such record.
export function getRecord(resource, idOrName) {
  const key = `${resource}/${String(idOrName).toLowerCase()}`;
  if (!recordCache.has(key)) {
    recordCache.set(
      key,
      fetchJson(`${API_BASE_URL}/api/v2/${resource}/${encodeURIComponent(idOrName)}/`),
    );
  }
  return recordCache.get(key);
}

// Fetch the full (unpaginated) list for a resource: [{ name, url }, ...].
export function getList(resource) {
  if (!listCache.has(resource)) {
    listCache.set(
      resource,
      fetchJson(`${API_BASE_URL}/api/v2/${resource}/?limit=100000`).then((data) => data?.results ?? []),
    );
  }
  return listCache.get(resource);
}

export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

// Run an async mapping over items with bounded concurrency.
export async function mapPool(items, fn, concurrency = 32) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// --- Domain-level helpers -----------------------------------------------------

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// The 18 types, in API order, as full records (cached individually).
export function getTypeRecords() {
  return getList('type').then((refs) =>
    Promise.all(refs.filter((r) => !EXCLUDED_TYPES.has(r.name)).map((r) => getRecord('type', r.name))),
  );
}

// Map: pokemon id -> [{ name, slot }] (types in slot order), built from the
// type records so it always reflects live data.
export function getPokemonTypeMap() {
  return getTypeRecords().then((records) => {
    const map = new Map();
    for (const record of records) {
      for (const entry of record.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon.url);
        if (id == null) continue;
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ name: record.name, slot: entry.slot });
      }
    }
    for (const types of map.values()) types.sort((a, b) => a.slot - b.slot);
    return map;
  });
}

// Generations in API order: { name, englishName, speciesIds:Set<number> }.
export function getGenerations() {
  return getList('generation').then((refs) =>
    Promise.all(
      refs.map(async (ref) => {
        const record = await getRecord('generation', ref.name);
        return {
          name: record.name,
          englishName: englishName(record) ?? humanize(record.name),
          speciesIds: new Set((record.pokemon_species ?? []).map((s) => idFromUrl(s.url))),
        };
      }),
    ),
  );
}

// Map: type api name -> English name.
export function getTypeEnglishNames() {
  return getTypeRecords().then((records) => {
    const map = new Map();
    for (const record of records) map.set(record.name, englishName(record) ?? humanize(record.name));
    return map;
  });
}

// --- Formatting helpers --------------------------------------------------------

export function humanize(name) {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function englishName(record) {
  return record?.names?.find((n) => n.language?.name === 'en')?.name ?? null;
}

export function latestEnglishFlavorText(record) {
  const entries = (record?.flavor_text_entries ?? []).filter((e) => e.language?.name === 'en');
  const last = entries.at(-1);
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export const MISSING = '—';

export function orMissing(value) {
  return value == null ? MISSING : String(value);
}
