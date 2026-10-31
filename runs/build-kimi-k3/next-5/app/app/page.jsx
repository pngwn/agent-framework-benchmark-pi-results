import Link from 'next/link';

import HomeControls from '@/components/HomeControls.jsx';
import PokemonCard from '@/components/PokemonCard.jsx';
import { getGenerations, getPokemonTypes, getSpeciesList, getTypes } from '@/lib/data.js';
import { humanize } from '@/lib/format.js';

export const dynamic = 'force-dynamic';

const PER_PAGE = 48;

function queryString({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/?${s}` : '/';
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim();
  const type = String(sp.type ?? '');
  const generation = String(sp.generation ?? '');
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);

  const [species, types, generations, pokemonTypes] = await Promise.all([
    getSpeciesList(),
    getTypes(),
    getGenerations(),
    getPokemonTypes(),
  ]);

  const generationEntry = generations.find((g) => g.name === generation);
  const query = q.toLowerCase();
  const matches = species.filter((s) => {
    if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
    if (type && !(pokemonTypes.get(s.id) ?? []).some((t) => t.name === type)) return false;
    if (generationEntry && !generationEntry.species.has(s.name)) return false;
    return true;
  });

  const total = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const visible = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <h1>Pokémon</h1>
      <HomeControls
        q={q}
        type={type}
        generation={generation}
        types={types.map(({ name, label }) => ({ name, label }))}
        generations={generations.map(({ name, label }) => ({ name, label }))}
      />
      <p className="count">{total} Pokémon</p>
      {total === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <>
          <ul className="cards">
            {visible.map((s) => (
              <PokemonCard
                key={s.id}
                id={s.id}
                speciesName={s.name}
                types={pokemonTypes.get(s.id) ?? []}
              />
            ))}
          </ul>
          <div className="pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            {page > 1 && (
              <Link href={queryString({ q, type, generation, page: page - 1 })}>
                Previous page
              </Link>
            )}
            {page < totalPages && (
              <Link href={queryString({ q, type, generation, page: page + 1 })}>Next page</Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
