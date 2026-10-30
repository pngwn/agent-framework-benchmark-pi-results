import Link from 'next/link';
import HomeControls from './components/HomeControls';
import { PokemonCard } from './components/PokemonCard';
import { getHomeData } from './lib/data';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(params: { q: string; type: string; generation: string; page: number }): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.type) search.set('type', params.type);
  if (params.generation) search.set('generation', params.generation);
  if (params.page > 1) search.set('page', String(params.page));
  const query = search.toString();
  return query ? `/?${query}` : '/';
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const data = await getHomeData({
    q: first(params.q),
    type: first(params.type),
    generation: first(params.generation),
    page: first(params.page),
  });

  return (
    <main className="shell page">
      <h1>Pokémon</h1>

      <HomeControls
        initialQ={data.q}
        initialType={data.typeName}
        initialGeneration={data.generationName}
        typeOptions={data.catalog.types.map((type) => ({ value: type.name, label: type.label }))}
        generationOptions={data.catalog.generations.map((generation) => ({
          value: generation.name,
          label: generation.label,
        }))}
      />

      <p className="result-count">{data.total} Pokémon</p>

      {data.total === 0 ? (
        <p className="empty-state">No Pokémon found</p>
      ) : (
        <ul className="card-grid">
          {data.items.map((item) => (
            <PokemonCard
              key={item.species.id}
              card={{
                id: item.species.id,
                dex: `#${String(item.species.id).padStart(4, '0')}`,
                name: item.species.name,
                label: item.species.label,
                nameParam: item.species.name,
                sprite: item.sprite,
              }}
              types={item.types}
            />
          ))}
        </ul>
      )}

      {data.total > 0 ? (
        <nav className="pagination" aria-label="Pagination">
          {data.page > 1 ? (
            <Link
              href={pageHref({
                q: data.q,
                type: data.typeName,
                generation: data.generationName,
                page: data.page - 1,
              })}
            >
              Previous page
            </Link>
          ) : null}
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          {data.page < data.totalPages ? (
            <Link
              href={pageHref({
                q: data.q,
                type: data.typeName,
                generation: data.generationName,
                page: data.page + 1,
              })}
            >
              Next page
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
