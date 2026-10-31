import { setBase, getTypes } from '#lib/api.js';

export async function load({ parent }) {
  const { apiBase } = await parent();
  setBase(apiBase);

  const types = await getTypes();
  return {
    types: types.map((t) => ({ name: t.name, en: t.en })),
  };
}
