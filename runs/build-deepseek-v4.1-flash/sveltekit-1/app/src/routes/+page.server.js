import { getIndex } from '#lib/server/pokeapi.js';

const PAGE_SIZE = 48;

function positivePage(value) {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export async function load({ url }) {
  const index = await getIndex();

  const q = (url.searchParams.get('q') ?? '').trim();
  const typeParam = url.searchParams.get('type') ?? '';
  const generationParam = url.searchParams.get('generation') ?? '';
  const type = index.types.some((entry) => entry.name === typeParam) ? typeParam : '';
  const generation = index.generations.some((entry) => entry.name === generationParam) ? generationParam : '';

  const needle = q.toLowerCase();
  let matches = index.species;

  if (needle) {
    matches = matches.filter((species) => species.humanized.toLowerCase().includes(needle));
  }
  if (type) {
    matches = matches.filter((species) => species.types.some((entry) => entry.name === type));
  }
  if (generation) {
    matches = matches.filter((species) => species.generation === generation);
  }

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(positivePage(url.searchParams.get('page')), totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return {
    q,
    type,
    generation,
    page,
    totalPages,
    count: matches.length,
    typeOptions: index.types.map((entry) => ({ name: entry.name, label: entry.label })),
    generationOptions: index.generations.map((entry) => ({ name: entry.name, label: entry.label })),
    cards: matches.slice(start, start + PAGE_SIZE).map((species) => ({
      id: species.id,
      name: species.name,
      humanized: species.humanized,
      sprite: species.sprite,
      types: species.types
    }))
  };
}
