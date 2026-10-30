import { loadTypePage } from '#lib/server/pokeapi.js';

export async function load({ params }) {
  return loadTypePage(params.name);
}
