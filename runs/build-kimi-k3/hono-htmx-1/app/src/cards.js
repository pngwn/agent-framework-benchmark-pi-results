import { getRecord, idFromUrl, mapPool } from './api.js';

// Turn a list of Pokémon references (as found in move/ability/type data) into
// card data for their species: alternate forms (id >= 10000) are excluded and
// the result is deduplicated by species and ordered by dex number.
//
// entries: [{ url, name, ... }] — extra fields (e.g. is_hidden) are preserved.
export async function cardsFromPokemonRefs(entries) {
  const bySpecies = new Map();
  await mapPool(entries, async (entry) => {
    const pokemonId = idFromUrl(entry.pokemon?.url ?? entry.url);
    if (pokemonId == null || pokemonId >= 10000) return;
    const ref = entry.pokemon ?? entry;
    const pokemon = await getRecord('pokemon', ref.name);
    if (!pokemon) return;
    const speciesId = idFromUrl(pokemon.species.url) ?? pokemonId;
    const card = {
      speciesName: pokemon.species.name,
      speciesId,
      sprite: pokemon.sprites?.front_default ?? null,
      hidden: Boolean(entry.is_hidden),
      pokemonId,
    };
    const existing = bySpecies.get(speciesId);
    // Prefer the entry for the species' default Pokémon (id === species id).
    if (!existing || (existing.pokemonId !== speciesId && pokemonId === speciesId)) {
      bySpecies.set(speciesId, card);
    }
  });
  return [...bySpecies.values()].sort((a, b) => a.speciesId - b.speciesId);
}
