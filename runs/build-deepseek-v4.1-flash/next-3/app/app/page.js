import Link from 'next/link';
import HomeControls from '../components/HomeControls';
import PokemonCard from '../components/PokemonCard';
import { getHomeData } from '../lib/pokeapi';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pokédex',
};

const PAGE_SIZE = 48;

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const q = (first(params.q) ?? '').toString();
  const type = (first(params.type) ?? '').toString();
  const generation = (first(params.generation) ?? '').toString();
  const requestedPage = Number.parseInt(first(params.page) ?? '1', 10);
  const data = await getHomeData();

  const normalizedQuery = q.toLowerCase();
  const filtered = data.species.filter((pokemon) => {
    if (normalizedQuery && !pokemon.humanizedName.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    if (type && !pokemon.types.some((pokemonType) => pokemonType.name === type)) {
      return false;
    }
    if (generation && pokemon.generation !== generation) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, requestedPage), totalPages)
    : 1;
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const filterValues = { q, type, generation };

  return (
    <>
      <h1>Pokémon</h1>
      <HomeControls
        initialQ={q}
        initialType={type}
        initialGeneration={generation}
        generations={data.generations}
        types={data.types}
      />

      <p className="result-count">{filtered.length} Pokémon</p>

      {filtered.length ? (
        <ul className="pokemon-grid">
          {visible.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} showTypes />
          ))}
        </ul>
      ) : (
        <p className="empty-message">No Pokémon found</p>
      )}

      {filtered.length ? (
        <nav className="pagination" aria-label="Pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          {page > 1 ? (
            <Link href={pageHref({ ...filterValues, page: page - 1 })}>Previous page</Link>
          ) : null}
          {page < totalPages ? (
            <Link href={pageHref({ ...filterValues, page: page + 1 })}>Next page</Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
