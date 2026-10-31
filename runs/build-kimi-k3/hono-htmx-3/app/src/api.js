// Data layer: all data comes from the PokeAPI server over HTTP at request time.
// Responses are cached in memory for the lifetime of the process.
const API = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
export const apiOrigin = API;

const cache = new Map();

export function fetchJson(path) {
  let entry = cache.get(path);
  if (!entry) {
    entry = fetch(`${API}/api/v2${path}`)
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        cache.delete(path);
        throw err;
      });
    cache.set(path, entry);
  }
  return entry;
}

export const idFromUrl = (url) => Number(String(url).replace(/\/+$/, '').split('/').pop());

// Run async fn over items with bounded concurrency.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let indexPromise = null;

// A warm index of everything list pages need: all species, their generation,
// and the types of every default Pokémon (species id === default Pokémon id).
export function getIndex() {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      indexPromise = null; // allow a later request to retry
      throw err;
    });
  }
  return indexPromise;
}

async function buildIndex() {
  const speciesList = await fetchJson('/pokemon-species/?limit=5000');
  const species = speciesList.results
    .map((r) => ({ name: r.name, id: idFromUrl(r.url) }))
    .filter((s) => s.id < 10000)
    .sort((a, b) => a.id - b.id);
  const speciesById = new Map(species.map((s) => [s.id, s.name]));

  const genList = await fetchJson('/generation/?limit=100');
  const genNames = genList.results.map((r) => r.name);
  const genDisplay = new Map();
  const speciesGen = new Map();
  await mapLimit(genNames, 6, async (g) => {
    const data = await fetchJson(`/generation/${g}/`);
    const en = (data.names ?? []).find((n) => n.language.name === 'en');
    genDisplay.set(g, en ? en.name : g);
    for (const s of data.pokemon_species ?? []) speciesGen.set(s.name, g);
  });

  const typeList = await fetchJson('/type/?limit=100');
  const typeNames = typeList.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
  const typeDisplay = new Map();
  const pokemonTypes = new Map(); // pokemon id -> [{ slot, type }]
  await mapLimit(typeNames, 6, async (t) => {
    const data = await fetchJson(`/type/${t}/`);
    const en = (data.names ?? []).find((n) => n.language.name === 'en');
    typeDisplay.set(t, en ? en.name : t);
    for (const p of data.pokemon ?? []) {
      const pid = idFromUrl(p.pokemon.url);
      if (!pokemonTypes.has(pid)) pokemonTypes.set(pid, []);
      pokemonTypes.get(pid).push({ slot: p.slot, type: t });
    }
  });
  for (const arr of pokemonTypes.values()) arr.sort((a, b) => a.slot - b.slot);

  return { species, speciesById, speciesGen, genNames, genDisplay, typeNames, typeDisplay, pokemonTypes };
}
