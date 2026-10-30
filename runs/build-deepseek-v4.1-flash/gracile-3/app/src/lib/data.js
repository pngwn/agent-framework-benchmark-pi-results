import { apiGet, cachedAggregate } from './api.js';
import {
  TYPE_EXCLUDED,
  humanize,
  isDefaultPokemonId,
  resourceId,
} from './format.js';

export function getSpeciesList(base) {
  return cachedAggregate(`${base}|species-list`, async () => {
    const page = await apiGet(base, 'pokemon-species?limit=100000');
    return page.results
      .map((entry) => ({ id: resourceId(entry.url), name: entry.name, url: entry.url }))
      .filter((entry) => entry.id && isDefaultPokemonId(entry.id))
      .sort((a, b) => a.id - b.id);
  });
}

export function getTypes(base) {
  return cachedAggregate(`${base}|types`, async () => {
    const page = await apiGet(base, 'type?limit=100000');
    const entries = page.results.filter((entry) => !TYPE_EXCLUDED.has(entry.name));
    const records = await Promise.all(entries.map((entry) => apiGet(base, `type/${entry.name}`)));
    return records
      .filter((record) => !TYPE_EXCLUDED.has(record.name))
      .sort((a, b) => a.id - b.id);
  });
}

export function getGenerations(base) {
  return cachedAggregate(`${base}|generations`, async () => {
    const page = await apiGet(base, 'generation?limit=100000');
    const records = await Promise.all(page.results.map((entry) => apiGet(base, `generation/${entry.name}`)));
    return records.sort((a, b) => a.id - b.id);
  });
}

export async function getVersionGroups(base, names) {
  const unique = [...new Set(names)];
  const records = await Promise.all(unique.map((name) => apiGet(base, `version-group/${name}`)));
  return records.sort((a, b) => a.order - b.order);
}

export async function loadPokemonCards(base, refs) {
  const cards = await Promise.all(
    refs.map(async (ref) => {
      const id = ref.id ?? resourceId(ref.pokemon?.url ?? ref.url);
      if (!isDefaultPokemonId(id)) return null;
      const pokemon = await apiGet(base, `pokemon/${id}`);
      const speciesName = pokemon.species?.name || pokemon.name;
      const speciesId = resourceId(pokemon.species?.url) || id;
      return {
        id: speciesId,
        name: speciesName,
        displayName: humanize(speciesName),
        sprite: pokemon.sprites?.front_default || null,
        types: (pokemon.types || [])
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((entry) => entry.type.name),
        isHidden: Boolean(ref.isHidden),
      };
    }),
  );
  return cards.filter(Boolean);
}
