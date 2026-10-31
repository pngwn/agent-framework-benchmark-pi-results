import { getIndex } from '#lib/server/api.js';

export async function load({ url }) {
  const index = await getIndex();
  return {
    species: index.species,
    types: index.types,
    generations: index.generations,
    filters: {
      q: url.searchParams.get('q') ?? '',
      type: url.searchParams.get('type') ?? '',
      generation: url.searchParams.get('generation') ?? '',
      page: Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1)
    }
  };
}
