// Server-only access to the local PokeAPI. Responses are cached in memory for
// the lifetime of the process; the data is always read over HTTP at request time.
import { englishName, humanize, idFromUrl } from './util.js';

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export const apiBase = API_BASE;

const cache = new Map();

function cached(key, load) {
  let p = cache.get(key);
  if (!p) {
    p = load();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PokeAPI responded ${res.status} for ${url}`);
  return res.json();
}

/** GET a single API resource by path (e.g. "/pokemon/25"). Null when missing. */
export function apiGet(path) {
  return cached(`${API_BASE}/api/v2${path}`, () => fetchJson(`${API_BASE}/api/v2${path}`));
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/**
 * The 18 types with English names, their records, and a map of
 * Pokémon id -> its types (in slot order).
 */
export function getTypeData() {
  return cached('type-data', async () => {
    const list = await apiGet('/type/?limit=100');
    const names = list.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
    const records = await Promise.all(names.map((n) => apiGet(`/type/${n}`)));
    const types = [];
    const byName = new Map();
    const pokemonTypes = new Map();
    for (const record of records) {
      const entry = { name: record.name, en: englishName(record.names, record.name), record };
      types.push(entry);
      byName.set(record.name, entry);
      for (const p of record.pokemon ?? []) {
        const id = idFromUrl(p.pokemon.url);
        if (!pokemonTypes.has(id)) pokemonTypes.set(id, []);
        pokemonTypes.get(id).push({ slot: p.slot, type: record.name, en: entry.en });
      }
    }
    for (const arr of pokemonTypes.values()) arr.sort((a, b) => a.slot - b.slot);
    return { types, byName, pokemonTypes };
  });
}

/** Full species index for the home page: id, name, types and generation. */
export function getPokedexIndex() {
  return cached('pokedex-index', async () => {
    const [speciesList, typeData, generationList] = await Promise.all([
      apiGet('/pokemon-species/?limit=2000'),
      getTypeData(),
      apiGet('/generation/?limit=100'),
    ]);
    const generationRecords = await Promise.all(
      generationList.results.map((g) => apiGet(`/generation/${g.name}`)),
    );
    const generations = [];
    const speciesGeneration = new Map();
    for (const record of generationRecords) {
      generations.push({ name: record.name, en: englishName(record.names, record.name) });
      for (const s of record.pokemon_species ?? []) speciesGeneration.set(s.name, record.name);
    }
    const species = speciesList.results
      .map((r) => {
        const id = idFromUrl(r.url);
        return {
          id,
          name: r.name,
          types: typeData.pokemonTypes.get(id) ?? [],
          generation: speciesGeneration.get(r.name) ?? null,
        };
      })
      .sort((a, b) => a.id - b.id);
    return { species, types: typeData.types, generations };
  });
}

/** Map of version-group name -> its `order`. */
export function getVersionGroupOrders() {
  return cached('version-groups', async () => {
    const list = await apiGet('/version-group/?limit=100');
    const records = await Promise.all(list.results.map((v) => apiGet(`/version-group/${v.name}`)));
    return new Map(records.filter(Boolean).map((r) => [r.name, r.order]));
  });
}

/**
 * Map a list of Pokémon references (which may include alternate forms and
 * duplicates) to their species, ordered by dex number.
 * `annotate` may return extra data to merge into each species entry.
 */
export async function speciesCards(refs, annotate) {
  const records = await Promise.all(
    refs.map((ref) => {
      const id = idFromUrl(ref.url ?? ref.pokemon.url);
      return id > 10000 ? null : apiGet(`/pokemon/${id}`);
    }),
  );
  const bySpecies = new Map();
  records.forEach((record, i) => {
    if (!record) return;
    const id = idFromUrl(record.species.url);
    const extra = annotate ? annotate(refs[i], i) : undefined;
    const existing = bySpecies.get(id);
    if (existing) Object.assign(existing, extra?.merge ? extra.merge(existing) : extra);
    else bySpecies.set(id, { id, name: record.species.name, ...extra });
  });
  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}

/** Cards for the Pokémon listed on an ability record, with hidden-ability flags. */
export async function abilityCards(entries) {
  const eligible = entries.map((e, i) => ({ ...e, index: i }));
  const records = await Promise.all(
    eligible.map((e) => {
      const id = idFromUrl(e.pokemon.url);
      return id > 10000 ? null : apiGet(`/pokemon/${id}`);
    }),
  );
  const bySpecies = new Map();
  records.forEach((record, i) => {
    if (!record) return;
    const id = idFromUrl(record.species.url);
    const hidden = Boolean(eligible[i].is_hidden);
    const existing = bySpecies.get(id);
    if (existing) existing.hidden = existing.hidden && hidden;
    else bySpecies.set(id, { id, name: record.species.name, hidden });
  });
  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}

/** Recursively trim an evolution-chain node to the data the UI needs. */
export function slimChain(node) {
  if (!node) return null;
  return {
    species: { name: node.species.name },
    evolvesTo: (node.evolves_to ?? []).map(slimChain),
  };
}

export { humanize, idFromUrl };
