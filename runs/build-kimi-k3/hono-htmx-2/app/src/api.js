// API client for the local PokeAPI server, with in-memory runtime caching.

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
const API_ROOT = `${API_BASE}/api/v2`;

const cache = new Map();

// Fetch a resource by path ('pokemon/25') or absolute URL (as found in API responses).
// Returns null for 404s. Responses are cached in memory for the process lifetime.
export function apiFetch(path) {
  const url = path.startsWith('http')
    ? path
    : `${API_ROOT}/${String(path).replace(/^\/+|\/+$/g, '')}/`;
  let entry = cache.get(url);
  if (!entry) {
    entry = fetch(url).then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
      return res.json();
    });
    entry.catch(() => cache.delete(url));
    cache.set(url, entry);
  }
  return entry;
}

export const idFromUrl = (url) => {
  const m = /\/(\d+)\/?$/.exec(url ?? '');
  return m ? Number(m[1]) : null;
};

// 'mr-mime' -> 'Mr Mime'
export const humanize = (name) =>
  String(name)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

export const englishName = (record) =>
  record?.names?.find((n) => n.language?.name === 'en')?.name ?? humanize(record?.name ?? '');

export const englishGenus = (species) =>
  species?.genera?.find((g) => g.language?.name === 'en')?.genus ?? '';

// Latest English flavor text with all whitespace runs collapsed to a single space.
export const latestEnglishFlavor = (entries) => {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
};

export const englishShortEffect = (entries) =>
  (entries ?? []).find((e) => e.language?.name === 'en')?.short_effect ?? null;

export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;
export const spriteUrl = (id) => `${API_BASE}/media/sprites/pokemon/${id}.png`;
export const artworkUrl = (id) =>
  `${API_BASE}/media/sprites/pokemon/other/official-artwork/${id}.png`;

// Run fn over items with a concurrency limit.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

// ---- Global index: species, types, generations -----------------------------
// Built once per process from the API and reused by every page.

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let indexPromise = null;
export function getIndex() {
  indexPromise ??= buildIndex();
  return indexPromise;
}

async function buildIndex() {
  const speciesList = await apiFetch('pokemon-species/?limit=100000');
  const species = speciesList.results
    .map((r) => ({ name: r.name, id: idFromUrl(r.url), types: [], generation: null }))
    .sort((a, b) => a.id - b.id);
  const byId = new Map(species.map((s) => [s.id, s]));

  const [typeList, generationList] = await Promise.all([
    apiFetch('type/?limit=1000'),
    apiFetch('generation/?limit=1000'),
  ]);

  const typeNames = typeList.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
  const [typeRecords, generationRecords] = await Promise.all([
    Promise.all(typeNames.map((n) => apiFetch(`type/${n}`))),
    Promise.all(generationList.results.map((r) => apiFetch(`generation/${r.name}`))),
  ]);

  // Types of each species' default Pokémon (default Pokémon id === species id).
  for (const t of typeRecords) {
    for (const entry of t.pokemon ?? []) {
      const pid = idFromUrl(entry.pokemon?.url);
      const s = pid != null ? byId.get(pid) : undefined;
      if (s) s.types.push({ slot: entry.slot, name: t.name });
    }
  }
  for (const s of species) s.types.sort((a, b) => a.slot - b.slot);

  for (const g of generationRecords) {
    for (const sp of g.pokemon_species ?? []) {
      const s = byId.get(idFromUrl(sp.url));
      if (s) s.generation = g.name;
    }
  }

  const types = typeRecords.map((t) => ({ name: t.name, en: englishName(t) }));
  const typeEn = new Map(types.map((t) => [t.name, t.en]));
  const generations = generationRecords.map((g) => ({ name: g.name, en: englishName(g) }));

  return { species, byId, types, typeEn, generations };
}

// Map a list of Pokémon references (as found in move/ability/type data) to
// species, dropping alternate forms (Pokémon ids above the species range) and
// anything unknown, deduplicated and ordered by dex number.
export function toSpeciesList(refs, index) {
  const map = new Map();
  for (const ref of refs ?? []) {
    const url = ref.url ?? ref.pokemon?.url;
    const id = idFromUrl(url);
    const s = id != null ? index.byId.get(id) : undefined;
    if (s && !map.has(s.id)) map.set(s.id, s);
  }
  return [...map.values()].sort((a, b) => a.id - b.id);
}
