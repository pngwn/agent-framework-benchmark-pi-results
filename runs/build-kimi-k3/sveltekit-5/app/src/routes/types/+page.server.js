import { getIndex } from '#lib/server/api.js';

export async function load() {
  const index = await getIndex();
  return { types: index.types };
}
