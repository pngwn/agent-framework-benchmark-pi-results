// The shared catalogue: every species with its types and generation, the 18
// types and the generations. Loaded once per session from the live API.

import { fetchJson } from './api.js';
import { englishName, humanize, idFromUrl } from './util.js';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const MAX_DEFAULT_POKEMON_ID = 10000; // IDs above this are alternate forms.

let catalogPromise = null;

export function loadCatalog() {
  catalogPromise ??= buildCatalog();
  return catalogPromise;
}

async function buildCatalog() {
  const [speciesList, typeList, generationList] = await Promise.all([
    fetchJson('/api/v2/pokemon-species/?limit=100000'),
    fetchJson('/api/v2/type/?limit=1000'),
    fetchJson('/api/v2/generation/?limit=1000'),
  ]);

  const typeRefs = typeList.results.filter((t) => !EXCLUDED_TYPES.has(t.name));
  const [typeRecords, generationRecords] = await Promise.all([
    Promise.all(typeRefs.map((t) => fetchJson(t.url))),
    Promise.all(generationList.results.map((g) => fetchJson(g.url))),
  ]);

  // The 18 types in API order, with their English names.
  const types = typeRecords.map((record) => ({
    id: record.id,
    name: record.name,
    en: englishName(record.names) ?? humanize(record.name),
  }));
  const typeEn = new Map(types.map((t) => [t.name, t.en]));

  // pokemon id -> [{ slot, name }] built from the type records (default forms only).
  const typesByPokemonId = new Map();
  for (const record of typeRecords) {
    for (const entry of record.pokemon ?? []) {
      const pokemonId = idFromUrl(entry.pokemon.url);
      if (pokemonId === null || pokemonId > MAX_DEFAULT_POKEMON_ID) continue;
      let slots = typesByPokemonId.get(pokemonId);
      if (!slots) typesByPokemonId.set(pokemonId, (slots = []));
      slots.push({ slot: entry.slot, name: record.name });
    }
  }
  for (const slots of typesByPokemonId.values()) slots.sort((a, b) => a.slot - b.slot);

  // species name -> generation API name.
  const generations = generationRecords.map((record) => ({
    id: record.id,
    name: record.name,
    en: englishName(record.names) ?? humanize(record.name),
  }));
  const generationBySpecies = new Map();
  for (const record of generationRecords) {
    for (const entry of record.pokemon_species ?? []) {
      generationBySpecies.set(entry.name, record.name);
    }
  }

  const species = speciesList.results
    .map((entry) => {
      const id = idFromUrl(entry.url);
      return {
        id,
        name: entry.name,
        human: humanize(entry.name),
        generation: generationBySpecies.get(entry.name) ?? null,
        types: (typesByPokemonId.get(id) ?? []).map((t) => t.name),
      };
    })
    .filter((s) => s.id !== null)
    .sort((a, b) => a.id - b.id);

  const speciesById = new Map(species.map((s) => [s.id, s]));
  const speciesByName = new Map(species.map((s) => [s.name, s]));

  return { species, speciesById, speciesByName, types, typeEn, generations };
}

// Maps a reference to a Pokémon (from move/ability/type data) to its species.
// Alternate forms (IDs above 10000) return null and must be left out.
export function speciesForPokemonRef(catalog, ref) {
  const id = idFromUrl(ref.url);
  if (id === null || id > MAX_DEFAULT_POKEMON_ID) return null;
  return catalog.speciesById.get(id) ?? null;
}
