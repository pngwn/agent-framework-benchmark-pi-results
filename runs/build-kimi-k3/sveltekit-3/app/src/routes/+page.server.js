import { getSpeciesMeta, getTypes, getGenerations } from '#lib/server/api.js';

export async function load() {
  const [species, types, generations] = await Promise.all([
    getSpeciesMeta(),
    getTypes(),
    getGenerations()
  ]);
  return { species, types, generations };
}
