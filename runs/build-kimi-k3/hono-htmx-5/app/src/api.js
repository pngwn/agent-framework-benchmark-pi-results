// Data access layer: every piece of data comes from the live API over HTTP at
// request time. Responses are cached in memory for the lifetime of the process.

export const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');

const cache = new Map();

export function apiJson(path) {
  // path is root-relative to /api/v2, e.g. '/pokemon/25/' or '/type/?limit=100'
  const url = `${API_BASE}/api/v2${path}`;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API ${url} responded ${res.status}`);
      return res.json();
    });
    p.catch(() => cache.delete(url)); // don't cache failures
    cache.set(url, p);
  }
  return p;
}

export async function apiList(resource) {
  const data = await apiJson(`/${resource}/?limit=100000`);
  return data?.results ?? [];
}

export const idFromUrl = (url) => Number(String(url).match(/\/(\d+)\/?$/)?.[1]);

// Run async fn over items with bounded concurrency.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

const memo = (fn) => {
  let p;
  return () => (p ??= fn());
};

// All species (id + api name), in API order.
export const speciesList = memo(async () => {
  const results = await apiList('pokemon-species');
  return results.map((r) => ({ id: idFromUrl(r.url), name: r.name }));
});

export const speciesNameById = memo(async () => {
  const map = new Map();
  for (const s of await speciesList()) map.set(s.id, s.name);
  return map;
});

// The 18 gameplay types, in API order, as full records.
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const allTypes = memo(async () => {
  const list = await apiList('type');
  const keep = list.filter((t) => !EXCLUDED_TYPES.has(t.name));
  return mapLimit(keep, 8, (t) => apiJson(`/type/${idFromUrl(t.url)}/`));
});

export const typeEnglishByName = memo(async () => {
  const map = new Map();
  for (const t of await allTypes()) {
    map.set(t.name, t.names?.find((n) => n.language.name === 'en')?.name ?? t.name);
  }
  return map;
});

// All generations, in API order, as full records.
export const allGenerations = memo(async () => {
  const list = await apiList('generation');
  return mapLimit(list, 8, (g) => apiJson(`/generation/${idFromUrl(g.url)}/`));
});

// All version groups as records (for their `order`), keyed by name.
export const versionGroupOrder = memo(async () => {
  const list = await apiList('version-group');
  const records = await mapLimit(list, 8, (v) => apiJson(`/version-group/${idFromUrl(v.url)}/`));
  const map = new Map();
  for (const v of records) map.set(v.name, v.order);
  return map;
});

// Home-page species index: id, name, types (slot order) and generation.
export const speciesIndex = memo(async () => {
  const [species, types, generations] = await Promise.all([speciesList(), allTypes(), allGenerations()]);

  const typesByPokemon = new Map(); // pokemon id -> [{slot, name}]
  for (const t of types) {
    for (const p of t.pokemon ?? []) {
      const id = idFromUrl(p.pokemon.url);
      if (id > 10000) continue; // alternate forms are out of scope
      let arr = typesByPokemon.get(id);
      if (!arr) typesByPokemon.set(id, (arr = []));
      arr.push({ slot: p.slot, name: t.name });
    }
  }
  for (const arr of typesByPokemon.values()) arr.sort((a, b) => a.slot - b.slot);

  const generationBySpecies = new Map();
  for (const g of generations) {
    for (const s of g.pokemon_species ?? []) generationBySpecies.set(s.name, g.name);
  }

  return species.map((s) => ({
    id: s.id,
    name: s.name,
    types: typesByPokemon.get(s.id) ?? [],
    generation: generationBySpecies.get(s.name) ?? null,
  }));
});
