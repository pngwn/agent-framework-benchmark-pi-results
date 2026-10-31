// Domain data loaders. Everything is fetched from the API over HTTP at
// request time and cached in memory for the lifetime of the process.

import { apiGet, idFromUrl } from './api.js';
import { englishName } from './format.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let speciesListPromise;
/** Every species the API lists: `[{ id, name }]`, sorted by dex number. */
export function getSpeciesList() {
  speciesListPromise ??= apiGet('/pokemon-species/?limit=100000').then((data) =>
    data.results
      .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url) }))
      .sort((a, b) => a.id - b.id),
  );
  return speciesListPromise;
}

let typesPromise;
/** The 18 type records, in API order. */
export function getTypes() {
  typesPromise ??= apiGet('/type/?limit=100').then(async (data) => {
    const refs = data.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
    return Promise.all(refs.map((entry) => apiGet(`/type/${entry.name}/`)));
  });
  return typesPromise;
}

/** Map of type API name → English name. */
export async function getTypeEnglishNames() {
  const types = await getTypes();
  return Object.fromEntries(types.map((type) => [type.name, englishName(type) ?? type.name]));
}

let generationsPromise;
/** The generation records, in API order (Generation I … IX). */
export function getGenerations() {
  generationsPromise ??= apiGet('/generation/?limit=100').then(async (data) =>
    Promise.all(data.results.map((entry) => apiGet(`/generation/${entry.name}/`))),
  );
  return generationsPromise;
}

let versionGroupsPromise;
/** Every version-group record (provides the `order` field). */
export function getVersionGroups() {
  versionGroupsPromise ??= apiGet('/version-group/?limit=100').then(async (data) =>
    Promise.all(data.results.map((entry) => apiGet(`/version-group/${entry.name}/`))),
  );
  return versionGroupsPromise;
}

let speciesIndexPromise;
/**
 * The home page index: `[{ id, name, types, generation }]` for every species.
 * Types come from the default Pokémon (same id as the species) via the type
 * records; generations via the generation records.
 */
export function getSpeciesIndex() {
  speciesIndexPromise ??= Promise.all([getSpeciesList(), getTypes(), getGenerations()]).then(
    ([species, types, generations]) => {
      const typesByPokemonId = new Map();
      for (const type of types) {
        for (const entry of type.pokemon ?? []) {
          const id = idFromUrl(entry.pokemon.url);
          if (id >= 10000) continue; // alternate forms are out of scope
          let slots = typesByPokemonId.get(id);
          if (!slots) {
            slots = [];
            typesByPokemonId.set(id, slots);
          }
          slots[entry.slot - 1] = type.name;
        }
      }
      const generationBySpecies = new Map();
      for (const generation of generations) {
        for (const entry of generation.pokemon_species ?? []) {
          generationBySpecies.set(entry.name, generation.name);
        }
      }
      return species.map((entry) => ({
        id: entry.id,
        name: entry.name,
        types: (typesByPokemonId.get(entry.id) ?? []).filter(Boolean),
        generation: generationBySpecies.get(entry.name) ?? null,
      }));
    },
  );
  return speciesIndexPromise;
}

/**
 * Maps a list of Pokémon references (as found in move/ability/type records)
 * to their species, leaving out alternate forms (ids ≥ 10000). Returns
 * `[{ id, speciesName, …extra }]` sorted by dex number, deduplicated.
 */
export async function pokemonRefsToSpecies(refs, extra = () => ({})) {
  const speciesList = await getSpeciesList();
  const speciesById = new Map(speciesList.map((entry) => [entry.id, entry]));
  const byId = new Map();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon?.url ?? ref.url);
    if (!(id > 0) || id >= 10000) continue;
    const species = speciesById.get(id);
    if (!species) continue;
    const existing = byId.get(id);
    byId.set(id, {
      id,
      speciesName: species.name,
      ...extra(ref, existing),
    });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
