import { getIndex } from '#lib/server/pokeapi.js';

export async function load() {
  const index = await getIndex();
  return {
    types: index.types.map((type) => ({ name: type.name, label: type.label }))
  };
}
