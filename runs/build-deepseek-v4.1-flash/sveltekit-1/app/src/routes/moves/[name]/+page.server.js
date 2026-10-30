import { loadMovePage } from '#lib/server/pokeapi.js';

export async function load({ params }) {
  return loadMovePage(params.name);
}
