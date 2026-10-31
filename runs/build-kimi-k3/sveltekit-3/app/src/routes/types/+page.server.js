import { getTypes } from '#lib/server/api.js';

export async function load() {
  return { types: await getTypes() };
}
