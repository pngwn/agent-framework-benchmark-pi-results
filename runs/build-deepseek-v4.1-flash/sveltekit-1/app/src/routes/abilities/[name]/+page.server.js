import { loadAbilityPage } from '#lib/server/pokeapi.js';

export async function load({ params }) {
  return loadAbilityPage(params.name);
}
