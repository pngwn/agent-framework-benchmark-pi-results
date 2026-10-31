// Aggregated data derived from the API, cached in memory for the process lifetime.

import { apiJson, apiPath } from './api.js';
import { englishName, humanize, idFromUrl } from './format.js';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const MAX_DEFAULT_POKEMON_ID = 10000; // alternate forms have ids >= 10000

let speciesListPromise;
/** Every species the API lists: [{ id, name }], ordered by id. */
export function getSpeciesList() {
  return (speciesListPromise ??= apiJson('/api/v2/pokemon-species/?limit=100000').then((data) =>
    data.results
      .map((r) => ({ name: r.name, id: idFromUrl(r.url) }))
      .filter((s) => s.id !== null)
      .sort((a, b) => a.id - b.id),
  ));
}

let speciesByIdPromise;
/** Map from species id to species name. */
export function getSpeciesById() {
  return (speciesByIdPromise ??= getSpeciesList().then(
    (list) => new Map(list.map((s) => [s.id, s.name])),
  ));
}

let typesPromise;
/**
 * The 18 types, in API order:
 * [{ name, label, pokemon: [{ id, slot }], moves: [name], damageRelations }]
 */
export function getTypes() {
  return (typesPromise ??= (async () => {
    const list = await apiJson('/api/v2/type/?limit=100');
    const names = list.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
    const records = await Promise.all(names.map((n) => apiJson(`/api/v2/type/${n}/`)));
    return records.map((t) => ({
      name: t.name,
      label: englishName(t.names) ?? humanize(t.name),
      pokemon: t.pokemon.map((p) => ({ id: idFromUrl(p.pokemon.url), slot: p.slot })),
      moves: t.moves.map((m) => m.name),
      damageRelations: t.damage_relations,
    }));
  })());
}

let typeLabelPromise;
/** Map from type API name to English label. */
export function getTypeLabels() {
  return (typeLabelPromise ??= getTypes().then(
    (types) => new Map(types.map((t) => [t.name, t.label])),
  ));
}

let pokemonTypesPromise;
/** Map from default-Pokémon id to its types in slot order: [{ name, label, slot }]. */
export function getPokemonTypes() {
  return (pokemonTypesPromise ??= getTypes().then((types) => {
    const map = new Map();
    for (const t of types) {
      for (const p of t.pokemon) {
        if (p.id === null || p.id >= MAX_DEFAULT_POKEMON_ID) continue;
        if (!map.has(p.id)) map.set(p.id, []);
        map.get(p.id).push({ name: t.name, label: t.label, slot: p.slot });
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => a.slot - b.slot);
    return map;
  }));
}

let generationsPromise;
/** The generations, in API order: [{ name, label, species: Set<species name> }]. */
export function getGenerations() {
  return (generationsPromise ??= (async () => {
    const list = await apiJson('/api/v2/generation/?limit=100');
    const records = await Promise.all(list.results.map((r) => apiJson(apiPath(r.url))));
    return records
      .sort((a, b) => a.id - b.id)
      .map((g) => ({
        name: g.name,
        label: englishName(g.names) ?? humanize(g.name),
        species: new Set(g.pokemon_species.map((s) => s.name)),
      }));
  })());
}

/**
 * Map a list of Pokémon references (from `learned_by_pokemon`, ability/type `pokemon`,
 * etc.) to their species. Alternate forms (id >= 10000) are dropped and each species
 * appears at most once. Returns [{ id, name (species) }] ordered by dex number.
 * `extra(entry)` maps a raw entry to extra data carried onto the result.
 */
export async function pokemonRefsToSpecies(entries, extra = () => ({})) {
  const speciesById = await getSpeciesById();
  const seen = new Map();
  for (const entry of entries) {
    const ref = entry.pokemon ?? entry; // ability/type entries wrap the ref in `pokemon`
    const id = idFromUrl(ref.url);
    if (id === null || id >= MAX_DEFAULT_POKEMON_ID) continue;
    const name = speciesById.get(id);
    if (!name || seen.has(id)) continue;
    seen.set(id, { id, name, ...extra(entry) });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}
