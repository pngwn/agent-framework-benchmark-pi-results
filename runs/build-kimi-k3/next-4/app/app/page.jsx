import Link from 'next/link';
import HomeFilters from '../components/HomeFilters.jsx';
import PokemonCards from '../components/PokemonCards.jsx';
import { getGenerations, getSpeciesIndex, getTypes } from '../lib/data.js';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? '';

function pageQuery({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const [index, types, generations] = await Promise.all([getSpeciesIndex(), getTypes(), getGenerations()]);

  const q = first(sp.q).trim();
  const typeParam = first(sp.type);
  const generationParam = first(sp.generation);
  const type = types.some((t) => t.name === typeParam) ? typeParam : '';
  const generation = generations.some((g) => g.name === generationParam) ? generationParam : '';
  const requestedPage = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);

  const query = q.toLowerCase();
  const matching = index.filter(
    (s) =>
      (!query || s.humanName.toLowerCase().includes(query)) &&
      (!type || s.types.some((t) => t.name === type)) &&
      (!generation || s.generation === generation),
  );

  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageItems = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <h1>Pokémon</h1>
      <HomeFilters q={q} type={type} generation={generation} types={types} generations={generations} />
      <p className="count">{matching.length} Pokémon</p>
      {pageItems.length > 0 ? (
        <PokemonCards items={pageItems.map((s) => ({ id: s.id, speciesName: s.name, types: s.types }))} />
      ) : (
        <p className="empty">No Pokémon found</p>
      )}
      <div className="pagination">
        {page > 1 && <Link href={pageQuery({ q, type, generation, page: page - 1 })}>Previous page</Link>}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages && <Link href={pageQuery({ q, type, generation, page: page + 1 })}>Next page</Link>}
      </div>
    </>
  );
}
