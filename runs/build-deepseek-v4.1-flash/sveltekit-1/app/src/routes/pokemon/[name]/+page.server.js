import { loadPokemonPage } from '#lib/server/pokeapi.js';

export async function load({ params, url }) {
  return loadPokemonPage(params.name, url.searchParams.get('game') ?? '');
}
