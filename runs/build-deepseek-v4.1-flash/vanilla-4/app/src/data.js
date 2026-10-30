import { api } from './api.js';
import { englishName, humanize, idFromUrl } from './utils.js';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let speciesPromise;
let generationsPromise;
let typeIndexPromise;
let allTypesPromise;

export function getSpeciesList() {
  if (!speciesPromise) {
    speciesPromise = api('pokemon-species/?limit=100000').then((data) =>
      (data.results ?? [])
        .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
        .filter((entry) => Number.isInteger(entry.id) && entry.id <= 10000)
        .sort((a, b) => a.id - b.id),
    );
    speciesPromise.catch(() => {
      speciesPromise = undefined;
    });
  }
  return speciesPromise;
}

export async function getSpeciesById() {
  const species = await getSpeciesList();
  return new Map(species.map((entry) => [entry.id, entry]));
}

export function getGenerations() {
  if (!generationsPromise) {
    generationsPromise = api('generation/?limit=100000').then(async (data) => {
      const details = await Promise.all((data.results ?? []).map((entry) => api(entry.url)));
      return details
        .map((generation) => ({
          id: generation.id,
          name: generation.name,
          label: englishName(generation, humanize(generation.name)),
          speciesIds: new Set((generation.pokemon_species ?? []).map((entry) => idFromUrl(entry.url))),
        }))
        .sort((a, b) => a.id - b.id);
    });
    generationsPromise.catch(() => {
      generationsPromise = undefined;
    });
  }
  return generationsPromise;
}

export function getTypeIndex() {
  if (!typeIndexPromise) {
    typeIndexPromise = api('type/?limit=100000').then((data) =>
      (data.results ?? [])
        .filter((entry) => !EXCLUDED_TYPES.has(entry.name))
        .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name, label: humanize(entry.name) })),
    );
    typeIndexPromise.catch(() => {
      typeIndexPromise = undefined;
    });
  }
  return typeIndexPromise;
}

export function getAllTypes() {
  if (!allTypesPromise) {
    allTypesPromise = getTypeIndex().then(async (index) => {
      const details = await Promise.all(index.map((entry) => api(`type/${entry.name}`)));
      return details.map((type) => ({
        ...type,
        label: englishName(type, humanize(type.name)),
      }));
    });
    allTypesPromise.catch(() => {
      allTypesPromise = undefined;
    });
  }
  return allTypesPromise;
}

export function buildPokemonTypeMap(typeDetails) {
  const map = new Map();

  for (const type of typeDetails) {
    for (const entry of type.pokemon ?? []) {
      const pokemonId = idFromUrl(entry.pokemon?.url);
      if (!Number.isInteger(pokemonId) || pokemonId > 10000) continue;
      const list = map.get(pokemonId) ?? [];
      list.push({
        name: type.name,
        label: type.label ?? humanize(type.name),
        slot: entry.slot ?? 0,
      });
      map.set(pokemonId, list);
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.slot - b.slot);
  }
  return map;
}
