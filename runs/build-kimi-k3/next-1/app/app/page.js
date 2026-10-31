import Link from 'next/link';
import {
  MAX_FORM_ID,
  getGenerationRecords,
  getPokemonTypesMap,
  getSpeciesIndex,
  getType,
  getTypeLabels,
  getTypeRecords,
  getGeneration,
  idFromUrl,
} from 'lib/api';
import { enName, humanize } from 'lib/format';
import { CardGrid, PokemonCard } from 'components/PokemonCard';
import Controls from './Controls';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp?.q === 'string' ? sp.q : '';
  const type = typeof sp?.type === 'string' ? sp.type : '';
  const generation = typeof sp?.generation === 'string' ? sp.generation : '';
  let page = Number.parseInt(typeof sp?.page === 'string' ? sp.page : '', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const [species, typeRecords, typeLabels, generations, pokemonTypes] = await Promise.all([
    getSpeciesIndex(),
    getTypeRecords(),
    getTypeLabels(),
    getGenerationRecords(),
    getPokemonTypesMap(),
  ]);

  let filtered = species;

  if (type) {
    const record = await getType(type);
    if (record) {
      const ids = new Set(
        (record.pokemon ?? [])
          .map((e) => idFromUrl(e.pokemon.url))
          .filter((id) => id < MAX_FORM_ID),
      );
      filtered = filtered.filter((s) => ids.has(s.id));
    }
  }

  if (generation) {
    const record = await getGeneration(generation);
    if (record) {
      const names = new Set((record.pokemon_species ?? []).map((e) => e.name));
      filtered = filtered.filter((s) => names.has(s.name));
    }
  }

  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((s) => humanize(s.name).toLowerCase().includes(needle));
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) page = totalPages;
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (p) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    if (generation) params.set('generation', generation);
    if (p > 1) params.set('page', String(p));
    const query = params.toString();
    return query ? `/?${query}` : '/';
  };

  const typeOptions = typeRecords.map((t) => ({
    name: t.name,
    label: typeLabels.get(t.name) ?? humanize(t.name),
  }));
  const generationOptions = generations.map((g) => ({
    name: g.name,
    label: enName(g.names, g.name),
  }));

  return (
    <>
      <h1 className="page-title">Pokémon</h1>
      <Controls q={q} type={type} generation={generation} types={typeOptions} generations={generationOptions} />
      <p className="count">{total} Pokémon</p>
      {total === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <CardGrid>
          {items.map((s) => (
            <PokemonCard
              key={s.id}
              id={s.id}
              name={s.name}
              types={(pokemonTypes.get(s.id) ?? []).map((t) => ({
                name: t.name,
                label: typeLabels.get(t.name) ?? humanize(t.name),
              }))}
            />
          ))}
        </CardGrid>
      )}
      {total > 0 && (
        <div className="pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          {page > 1 && <Link href={pageHref(page - 1)}>Previous page</Link>}
          {page < totalPages && <Link href={pageHref(page + 1)}>Next page</Link>}
        </div>
      )}
    </>
  );
}
