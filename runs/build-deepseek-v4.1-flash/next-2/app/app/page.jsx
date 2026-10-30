import Link from 'next/link';
import Filters from '@/components/Filters';
import { PokemonCard } from '@/components/PokemonCard';
import {
  getDefaultPokemon,
  getGenerations,
  getSpeciesList,
  getTypes,
  spriteUrlForId,
} from '@/lib/api';
import { humanize, idFromUrl, isAlternateForm } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pokédex',
};

const PAGE_SIZE = 48;

function single(value) {
  return Array.isArray(value) ? value[0] : value;
}

function validId(id) {
  return Number.isFinite(id) && !isAlternateForm(id);
}

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const q = (single(params.q) ?? '').trim();
  const typeParam = single(params.type) ?? '';
  const generationParam = single(params.generation) ?? '';
  const requestedPage = Number.parseInt(single(params.page) ?? '1', 10);

  const [allSpecies, typeData, generations] = await Promise.all([
    getSpeciesList(),
    getTypes(),
    getGenerations(),
  ]);

  const selectedType = typeParam ? typeData.byName.get(typeParam) : null;
  const selectedGeneration = generationParam
    ? generations.find((entry) => entry.name === generationParam)
    : null;

  let typeIds = null;
  if (selectedType) {
    typeIds = new Set(
      (selectedType.record.pokemon ?? [])
        .map((entry) => idFromUrl(entry.pokemon?.url))
        .filter(validId),
    );
  }

  let generationIds = null;
  if (selectedGeneration) {
    generationIds = new Set(
      (selectedGeneration.record.pokemon_species ?? [])
        .map((entry) => idFromUrl(entry.url))
        .filter(validId),
    );
  }

  const searchTerm = q.toLowerCase();
  const matches = allSpecies.filter((species) => {
    if (searchTerm && !humanize(species.name).toLowerCase().includes(searchTerm)) return false;
    if (typeIds && !typeIds.has(species.id)) return false;
    if (generationIds && !generationIds.has(species.id)) return false;
    return true;
  });

  const count = matches.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, totalPages)
    : 1;
  const pageSpecies = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pagePokemon = await Promise.all(
    pageSpecies.map(async (species) => {
      const pokemon = await getDefaultPokemon(species.id);
      const sprite = pokemon?.sprites?.front_default
        ? pokemon.sprites.front_default
        : spriteUrlForId(species.id);
      const types = (pokemon?.types ?? [])
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((entry) => ({
          name: entry.type.name,
          english: typeData.byName.get(entry.type.name)?.english ?? humanize(entry.type.name),
        }));
      return { species, sprite, types };
    }),
  );

  const hrefForPage = (targetPage) => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (typeParam) search.set('type', typeParam);
    if (generationParam) search.set('generation', generationParam);
    if (targetPage > 1) search.set('page', String(targetPage));
    const query = search.toString();
    return query ? `/?${query}` : '/';
  };

  return (
    <>
      <h1>Pokémon</h1>
      <Filters
        q={q}
        type={selectedType?.name ?? ''}
        generation={selectedGeneration?.name ?? ''}
        types={typeData.list}
        generations={generations}
      />
      <p className="result-count">{count} Pokémon</p>

      {count === 0 ? (
        <p className="empty-message">No Pokémon found</p>
      ) : (
        <>
          <ul className="card-grid">
            {pagePokemon.map(({ species, sprite, types }) => (
              <PokemonCard
                key={species.id}
                id={species.id}
                name={humanize(species.name)}
                linkName={species.name}
                sprite={sprite}
                types={types}
              />
            ))}
          </ul>
          <div className="pagination">
            {page > 1 ? (
              <Link href={hrefForPage(page - 1)} prefetch={false}>
                Previous page
              </Link>
            ) : null}
            <span className="page-number">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={hrefForPage(page + 1)} prefetch={false}>
                Next page
              </Link>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
