import {
  setBase,
  humanize,
  dexNumber,
  spriteUrl,
  getSpeciesIndex,
  getSpeciesTypes,
  getGenerations,
  getTypes,
} from '#lib/api.js';

const PAGE_SIZE = 48;

export async function load({ url, parent }) {
  const { apiBase } = await parent();
  setBase(apiBase);

  const [species, speciesTypes, generations, types] = await Promise.all([
    getSpeciesIndex(),
    getSpeciesTypes(),
    getGenerations(),
    getTypes(),
  ]);

  const q = url.searchParams.get('q') ?? '';
  const type = url.searchParams.get('type') ?? '';
  const generation = url.searchParams.get('generation') ?? '';
  const rawPage = parseInt(url.searchParams.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const query = q.trim().toLowerCase();
  const genSpecies = generation
    ? new Set(generations.find((g) => g.name === generation)?.species ?? [])
    : null;

  const matching = species.filter((s) => {
    if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
    if (type && !(speciesTypes.get(s.id) ?? []).some((t) => t.name === type)) return false;
    if (genSpecies && !genSpecies.has(s.name)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageSpecies = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    q,
    type,
    generation,
    page,
    totalPages,
    count: matching.length,
    cards: pageSpecies.map((s) => ({
      id: s.id,
      name: s.name,
      human: humanize(s.name),
      dex: dexNumber(s.id),
      sprite: spriteUrl(s.id),
      href: `/pokemon/${s.name}`,
      types: speciesTypes.get(s.id) ?? [],
    })),
    types: types.map((t) => ({ name: t.name, en: t.en })),
    generations: generations.map((g) => ({ name: g.name, en: g.en })),
  };
}
