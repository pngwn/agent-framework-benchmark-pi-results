import {
  getDefaultPokemon,
  getSpeciesRefById,
  mapLimit,
  spriteUrlForId,
} from './api';
import { humanize, idFromUrl, isAlternateForm } from './format';

export function uniquePokemonRefs(refs, pokemonOf = (entry) => entry.pokemon ?? entry) {
  const byId = new Map();
  for (const entry of refs ?? []) {
    const pokemon = pokemonOf(entry);
    const id = idFromUrl(pokemon?.url);
    if (!id || isAlternateForm(id)) continue;
    byId.set(id, { id, name: pokemon.name });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export async function buildPokemonCards(refs, hiddenById = null) {
  const entries = uniquePokemonRefs(refs);
  const species = await Promise.all(entries.map((entry) => getSpeciesRefById(entry.id)));
  const pokemon = await mapLimit(entries, 16, (entry) => getDefaultPokemon(entry.id));

  return entries.map((entry, index) => {
    const speciesEntry = species[index];
    const pokemonEntry = pokemon[index];
    const apiName = speciesEntry?.name ?? entry.name;
    return {
      id: speciesEntry?.id ?? entry.id,
      linkName: apiName,
      name: humanize(apiName),
      sprite: pokemonEntry?.sprites?.front_default || spriteUrlForId(entry.id),
      hidden: hiddenById?.get(entry.id) ?? false,
    };
  });
}
