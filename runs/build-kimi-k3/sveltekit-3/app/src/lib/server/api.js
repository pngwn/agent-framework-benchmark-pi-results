// Server-side PokeAPI client. All data comes from the live API over HTTP at
// request time; responses are cached in memory for the lifetime of the process.
import { API_BASE_URL } from '$app/env/private';
import { idFromUrl, humanize, englishName } from '#lib/utils.js';

export const API_BASE = API_BASE_URL.replace(/\/+$/, '');

const cache = new Map();

function get(url) {
  let entry = cache.get(url);
  if (!entry) {
    entry = fetch(url).then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PokeAPI request failed: ${res.status} ${url}`);
      return res.json();
    });
    cache.set(url, entry);
    // Don't cache network failures so a later request can retry.
    entry.catch(() => {
      if (cache.get(url) === entry) cache.delete(url);
    });
  }
  return entry;
}

/** Fetch a single API resource by path ("pokemon/25"), or null if it doesn't exist. */
export const api = (path) => get(`${API_BASE}/api/v2/${path}`);

async function listAll(resource) {
  const data = await api(`${resource}/?limit=100000`);
  return data?.results ?? [];
}

export const spriteUrl = (pokemonId) => `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let typeRecordsPromise;
/** Full records for the 18 types, in API order. */
export function getTypeRecords() {
  typeRecordsPromise ??= (async () => {
    const list = await listAll('type');
    const records = await Promise.all(list.map((e) => api(`type/${idFromUrl(e.url)}/`)));
    return records.filter((r) => r && !EXCLUDED_TYPES.has(r.name));
  })();
  return typeRecordsPromise;
}

export async function getTypes() {
  const records = await getTypeRecords();
  return records.map((r) => ({ id: r.id, name: r.name, label: englishName(r) }));
}

export async function getTypeLabelMap() {
  const types = await getTypes();
  return new Map(types.map((t) => [t.name, t.label]));
}

let generationRecordsPromise;
export function getGenerationRecords() {
  generationRecordsPromise ??= (async () => {
    const list = await listAll('generation');
    const records = await Promise.all(list.map((e) => api(`generation/${idFromUrl(e.url)}/`)));
    return records.filter(Boolean);
  })();
  return generationRecordsPromise;
}

export async function getGenerations() {
  const records = await getGenerationRecords();
  return records.map((r) => ({ name: r.name, label: englishName(r) }));
}

let speciesListPromise;
/** Every species as { id, name }, ordered by dex number. */
export function getSpeciesList() {
  speciesListPromise ??= (async () => {
    const list = await listAll('pokemon-species');
    return list
      .map((e) => ({ id: idFromUrl(e.url), name: e.name }))
      .filter((s) => Number.isFinite(s.id))
      .sort((a, b) => a.id - b.id);
  })();
  return speciesListPromise;
}

let versionGroupsPromise;
/** All version groups as { name, order, label }, sorted by their order field. */
export function getVersionGroups() {
  versionGroupsPromise ??= (async () => {
    const list = await listAll('version-group');
    const records = await Promise.all(list.map((e) => api(`version-group/${idFromUrl(e.url)}/`)));
    return records
      .filter(Boolean)
      .map((r) => ({ name: r.name, order: r.order, label: humanize(r.name) }))
      .sort((a, b) => a.order - b.order);
  })();
  return versionGroupsPromise;
}

let speciesMetaPromise;
/**
 * Metadata for every species, for the home page: id, name, humanized name,
 * sprite URL, types in slot order and the generation it was introduced in.
 * Default Pokémon have the same id as their species, so type records
 * (which reference Pokémon) map straight onto species.
 */
export function getSpeciesMeta() {
  speciesMetaPromise ??= (async () => {
    const [species, typeRecords, typeLabels, generationRecords] = await Promise.all([
      getSpeciesList(),
      getTypeRecords(),
      getTypeLabelMap(),
      getGenerationRecords()
    ]);

    const typesBySpecies = new Map();
    for (const t of typeRecords) {
      for (const p of t.pokemon ?? []) {
        const id = idFromUrl(p.pokemon?.url);
        if (!Number.isFinite(id) || id >= 10000) continue;
        if (!typesBySpecies.has(id)) typesBySpecies.set(id, []);
        typesBySpecies.get(id).push({ slot: p.slot, name: t.name });
      }
    }

    const generationBySpecies = new Map();
    for (const g of generationRecords) {
      for (const s of g.pokemon_species ?? []) {
        const id = idFromUrl(s.url);
        if (Number.isFinite(id)) generationBySpecies.set(id, g.name);
      }
    }

    return species.map((s) => {
      const types = (typesBySpecies.get(s.id) ?? [])
        .sort((a, b) => a.slot - b.slot)
        .map((t) => ({ name: t.name, label: typeLabels.get(t.name) ?? humanize(t.name) }));
      return {
        id: s.id,
        name: s.name,
        human: humanize(s.name),
        sprite: spriteUrl(s.id),
        types,
        generation: generationBySpecies.get(s.id) ?? ''
      };
    });
  })();
  return speciesMetaPromise;
}

/**
 * Build Pokémon cards from a list of Pokémon references ({ url, hidden? }).
 * Alternate forms (Pokémon ids above 10000) are dropped and every Pokémon is
 * mapped to its species (a default Pokémon has the same id as its species).
 * Cards are ordered by dex number.
 */
export async function speciesCardsFromRefs(refs) {
  const species = await getSpeciesList();
  const byId = new Map(species.map((s) => [s.id, s]));
  const cards = new Map();
  for (const ref of refs) {
    const id = idFromUrl(ref?.url);
    if (!Number.isFinite(id) || id >= 10000) continue;
    if (cards.has(id)) continue;
    const sp = byId.get(id);
    if (!sp) continue;
    cards.set(id, {
      id,
      name: sp.name,
      human: humanize(sp.name),
      sprite: spriteUrl(id),
      hidden: Boolean(ref.hidden)
    });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}
