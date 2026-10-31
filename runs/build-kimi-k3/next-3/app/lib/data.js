// Shared data-loading helpers. Everything fetches from the API at request
// time; process-level memoization keeps repeated loads cheap.

import { apiFetch, fetchMany, memoize } from './api.js';
import { englishName, humanize, idFromUrl } from './format.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types, in API order, with English labels. */
export const getTypes = memoize(async () => {
  const list = await apiFetch('/type/?limit=100');
  const refs = (list?.results ?? []).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await fetchMany(refs.map((r) => `/type/${idFromUrl(r.url)}/`));
  return records.filter(Boolean).map((r) => ({ name: r.name, label: englishName(r) }));
});

/** All generations, in API order, with English labels and species membership. */
export const getGenerations = memoize(async () => {
  const list = await apiFetch('/generation/?limit=100');
  const records = await fetchMany((list?.results ?? []).map((r) => `/generation/${idFromUrl(r.url)}/`));
  return records.filter(Boolean).map((r) => ({
    name: r.name,
    label: englishName(r),
    species: (r.pokemon_species ?? []).map((s) => s.name),
  }));
});

/** All version groups with their order and humanized labels. */
export const getVersionGroups = memoize(async () => {
  const list = await apiFetch('/version-group/?limit=100');
  const records = await fetchMany((list?.results ?? []).map((r) => `/version-group/${idFromUrl(r.url)}/`));
  return records
    .filter(Boolean)
    .map((r) => ({ name: r.name, order: r.order, label: humanize(r.name) }))
    .sort((a, b) => a.order - b.order);
});

/** Map of type API name -> English label. */
export async function getTypeLabels() {
  const types = await getTypes();
  return Object.fromEntries(types.map((t) => [t.name, t.label]));
}

/**
 * Build Pokémon card data from a list of Pokémon references ({ pokemon: {name,url} }
 * or { name, url }), excluding alternate forms (Pokémon IDs above 10000) and
 * mapping each Pokémon to its species. Cards are deduplicated by species and
 * ordered by dex number. `hidden` flags (abilities) are OR-ed per species.
 */
export async function buildPokemonCards(refs) {
  const eligible = refs
    .map((ref) => {
      const pokemon = ref.pokemon ?? ref;
      return { id: idFromUrl(pokemon.url), hidden: Boolean(ref.is_hidden) };
    })
    .filter((ref) => ref.id != null && ref.id <= 10000);
  const records = await fetchMany(eligible.map((ref) => `/pokemon/${ref.id}/`));
  const bySpecies = new Map();
  records.forEach((record, i) => {
    if (!record?.species?.url) return;
    const speciesId = idFromUrl(record.species.url);
    if (speciesId == null) return;
    let card = bySpecies.get(speciesId);
    if (!card) {
      card = {
        id: speciesId,
        species: record.species.name,
        name: humanize(record.species.name),
        sprite: record.sprites?.front_default ?? null,
        hidden: false,
      };
      bySpecies.set(speciesId, card);
    }
    if (eligible[i].hidden) card.hidden = true;
  });
  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}

/**
 * Data for the home page: every species with its default Pokémon's sprite and
 * types, plus generation membership, the 18 types and the 9 generations.
 */
export const getHomeData = memoize(async () => {
  const [speciesList, generations, types] = await Promise.all([
    apiFetch('/pokemon-species/?limit=100000'),
    getGenerations(),
    getTypes(),
  ]);
  const generationBySpecies = new Map();
  for (const generation of generations) {
    for (const species of generation.species) generationBySpecies.set(species, generation.name);
  }
  const results = speciesList?.results ?? [];
  const ids = results.map((r) => idFromUrl(r.url));
  const records = await fetchMany(ids.map((id) => `/pokemon/${id}/`));
  const typeLabels = Object.fromEntries(types.map((t) => [t.name, t.label]));
  const pokemon = results.map((entry, i) => {
    const record = records[i];
    const typeNames = (record?.types ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name);
    return {
      id: record?.id ?? ids[i],
      species: entry.name,
      name: humanize(entry.name),
      sprite: record?.sprites?.front_default ?? null,
      types: typeNames.map((name) => ({ name, label: typeLabels[name] ?? humanize(name) })),
      generation: generationBySpecies.get(entry.name) ?? '',
    };
  });
  return {
    pokemon,
    types,
    generations: generations.map(({ name, label }) => ({ name, label })),
  };
});
