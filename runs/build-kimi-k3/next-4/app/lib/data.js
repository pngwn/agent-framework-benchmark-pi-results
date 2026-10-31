// Derived, cached views over the API: the species index used by the home page,
// the 18 types, the generations, version-group ordering and helpers that map
// Pokémon references to their species.

import { apiGet, apiList } from './api.js';
import { englishName, humanize, idFromUrl } from './format.js';

// Types that the app covers (everything except these three).
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let typesPromise;
export function getTypes() {
  typesPromise ??= (async () => {
    const list = await apiList('type');
    const names = list.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
    const records = await Promise.all(names.map((n) => apiGet(`type/${n}`)));
    return records.filter(Boolean).map((record) => ({
      name: record.name,
      en: englishName(record),
      record,
    }));
  })();
  return typesPromise;
}

export async function getTypeEnMap() {
  const types = await getTypes();
  return new Map(types.map((t) => [t.name, t.en]));
}

let generationsPromise;
export function getGenerations() {
  generationsPromise ??= (async () => {
    const list = await apiList('generation');
    const records = await Promise.all(list.results.map((r) => apiGet(`generation/${r.name}`)));
    return records.filter(Boolean).map((record) => ({
      name: record.name,
      en: englishName(record),
      record,
    }));
  })();
  return generationsPromise;
}

let versionGroupsPromise;
// Map of version-group name -> order.
export function getVersionGroupOrders() {
  versionGroupsPromise ??= (async () => {
    const list = await apiList('version-group');
    const records = await Promise.all(list.results.map((r) => apiGet(`version-group/${r.name}`)));
    return new Map(records.filter(Boolean).map((r) => [r.name, r.order]));
  })();
  return versionGroupsPromise;
}

let speciesListPromise;
export function getSpeciesList() {
  speciesListPromise ??= apiList('pokemon-species');
  return speciesListPromise;
}

let speciesNameSetPromise;
export function getSpeciesNameSet() {
  speciesNameSetPromise ??= getSpeciesList().then((l) => new Set(l.results.map((r) => r.name)));
  return speciesNameSetPromise;
}

let speciesIndexPromise;
// Every species with its dex number, humanized name, types (slot order) and
// generation, sorted by dex number. Used by the home page.
export function getSpeciesIndex() {
  speciesIndexPromise ??= (async () => {
    const [list, types, generations] = await Promise.all([
      getSpeciesList(),
      getTypes(),
      getGenerations(),
    ]);

    // A species' default Pokémon has the same id, so the per-type Pokémon
    // listings tell us each species' types.
    const typesByPokemonId = new Map();
    for (const t of types) {
      for (const entry of t.record.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon?.url);
        if (id == null) continue;
        if (!typesByPokemonId.has(id)) typesByPokemonId.set(id, []);
        typesByPokemonId.get(id).push({ slot: entry.slot, name: t.name, en: t.en });
      }
    }
    for (const arr of typesByPokemonId.values()) arr.sort((a, b) => a.slot - b.slot);

    const generationBySpeciesId = new Map();
    for (const g of generations) {
      for (const ref of g.record.pokemon_species ?? []) {
        generationBySpeciesId.set(idFromUrl(ref.url), g.name);
      }
    }

    return list.results
      .map((ref) => {
        const id = idFromUrl(ref.url);
        return {
          id,
          name: ref.name,
          humanName: humanize(ref.name),
          types: typesByPokemonId.get(id) ?? [],
          generation: generationBySpeciesId.get(id) ?? null,
        };
      })
      .sort((a, b) => a.id - b.id);
  })();
  return speciesIndexPromise;
}

// Maps a reference to a Pokémon (as found in move/ability/type data) to its
// species. Alternate forms (Pokémon ids 10000 and up) return null.
export async function toSpeciesRef(ref) {
  const id = idFromUrl(ref.url);
  if (id == null || id >= 10000) return null;
  const names = await getSpeciesNameSet();
  if (names.has(ref.name)) return { id, speciesName: ref.name };
  // Names such as "deoxys-normal" refer to the default form of a species with
  // a different name; ask the Pokémon record for its species.
  const pokemon = await apiGet(`pokemon/${ref.name}`);
  return { id, speciesName: pokemon?.species?.name ?? ref.name };
}

// Maps a list of Pokémon references to unique species, ordered by dex number.
// `extra` selects fields to copy from each source entry (e.g. is_hidden).
export async function pokemonRefsToSpecies(entries, getRef = (e) => e) {
  const resolved = await Promise.all(
    entries.map(async (entry) => {
      const species = await toSpeciesRef(getRef(entry));
      return species ? { entry, ...species } : null;
    }),
  );
  const byId = new Map();
  for (const item of resolved) {
    if (!item) continue;
    if (!byId.has(item.id)) byId.set(item.id, { ...item, entries: [] });
    byId.get(item.id).entries.push(item.entry);
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
