import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getAllTypes, getGenerations, getSpeciesIndex } from '@/lib/api';
import { englishName } from '@/lib/format';
import { PokemonCardList } from '@/components/pokemon-cards';
import { Filters, type FilterValues } from './filters';

export const metadata: Metadata = { title: { absolute: 'Pokédex' } };

const PAGE_SIZE = 48;

type SearchParams = Record<string, string | string[] | undefined>;

function param(params: SearchParams, name: string): string {
  const value = params[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function pageHref(filters: FilterValues, page: number): string {
  const query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.type) query.set('type', filters.type);
  if (filters.generation) query.set('generation', filters.generation);
  if (page > 1) query.set('page', String(page));
  const qs = query.toString();
  return qs ? `/?${qs}` : '/';
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const params = await searchParams;
  const filters: FilterValues = { q: param(params, 'q'), type: param(params, 'type'), generation: param(params, 'generation') };

  const [index, types, generations] = await Promise.all([getSpeciesIndex(), getAllTypes(), getGenerations()]);

  const needle = filters.q.toLowerCase();
  const matches = index.filter(
    (entry) =>
      (!needle || entry.label.toLowerCase().includes(needle)) &&
      (!filters.type || entry.types.some((t) => t.name === filters.type)) &&
      (!filters.generation || entry.generation === filters.generation),
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = Number.parseInt(param(params, 'page'), 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <h1>Pokémon</h1>
      <Filters
        values={filters}
        types={types.map((t) => ({ value: t.name, label: englishName(t.names, t.name) }))}
        generations={generations.map((g) => ({ value: g.name, label: englishName(g.names, g.name) }))}
      />
      <p className="count" aria-live="polite">
        {matches.length > 0 ? `${matches.length} Pokémon` : 'No Pokémon found'}
      </p>
      {matches.length > 0 && (
        <>
          <PokemonCardList cards={visible} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <Link href={pageHref(filters, page - 1)} rel="prev">
                Previous page
              </Link>
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link href={pageHref(filters, page + 1)} rel="next">
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
}
