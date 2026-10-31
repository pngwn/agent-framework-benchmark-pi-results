import { fetchJson, mapAll } from './api.js';
import { idFromUrl, englishName } from './format.js';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
// Alternate forms (Pokémon IDs above 10000) are out of scope.
export const MAX_MAIN_ID = 10000;

export async function getTypeRecords() {
  const list = await fetchJson('/type/?limit=100');
  const names = list.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
  return mapAll(names, (n) => fetchJson(`/type/${n}/`));
}

// Map of type API name -> English name, for the 18 types.
export async function getTypeNameMap() {
  const records = await getTypeRecords();
  return new Map(records.map((t) => [t.name, englishName(t.names) ?? t.name]));
}

export async function getSpeciesList() {
  const list = await fetchJson('/pokemon-species/?limit=5000');
  return list.results
    .map((r) => ({ name: r.name, id: idFromUrl(r.url) }))
    .filter((s) => s.id !== null)
    .sort((a, b) => a.id - b.id);
}

// Map of Pokémon id -> its types in slot order, built from the type records
// (a species' default Pokémon has the same id as the species).
export async function getPokemonTypesMap() {
  const records = await getTypeRecords();
  const map = new Map();
  for (const t of records) {
    for (const entry of t.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url);
      if (id === null || id > MAX_MAIN_ID) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({ slot: entry.slot, type: t.name });
    }
  }
  for (const arr of map.values()) arr.sort((a, b) => a.slot - b.slot);
  return map;
}

export async function getGenerationRecords() {
  const list = await fetchJson('/generation/?limit=100');
  return mapAll(list.results.map((r) => r.name), (n) => fetchJson(`/generation/${n}/`));
}

export async function getVersionGroupOrders(names) {
  const records = await mapAll(names, (n) => fetchJson(`/version-group/${n}/`));
  return new Map(records.map((r) => [r.name, r.order]));
}

// Map a list of Pokémon references (e.g. a move's learned_by_pokemon) to
// unique species, excluding alternate forms, ordered by dex number.
export async function pokemonRefsToSpecies(refs) {
  const mains = (refs ?? [])
    .map((r) => ({ ref: r, id: idFromUrl(r.url) }))
    .filter((x) => x.id !== null && x.id <= MAX_MAIN_ID);
  const records = await mapAll(mains, (x) => fetchJson(`/pokemon/${x.id}/`));
  const seen = new Set();
  const out = [];
  for (const p of records) {
    const speciesId = idFromUrl(p.species.url);
    if (speciesId === null || seen.has(speciesId)) continue;
    seen.add(speciesId);
    out.push({ id: speciesId, name: p.species.name });
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}
