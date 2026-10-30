import Link from 'next/link';

import HomeFilters from '@/components/HomeFilters';
import PokeCard from '@/components/PokeCard';
import { mapLimit } from '@/lib/api';
import {
  getGenerations,
  getPokemon,
  getSpeciesIndexCached,
  getTypeDirectoryCached,
  idFromUrl,
  spriteUrl,
} from '@/lib/data';
import { humanize } from '@/lib/display';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: { absolute: 'Pokédex' },
};

const PAGE_SIZE = 48;

function firstString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
}

function pageHref({ q, type, generation }, page) {
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
  const q = firstString(params.q).trim();
  const requestedType = firstString(params.type);
  const requestedGeneration = firstString(params.generation);
  const requestedPage = Number.parseInt(firstString(params.page), 10);

  const [species, types, generations] = await Promise.all([
    getSpeciesIndexCached(),
    getTypeDirectoryCached(),
    getGenerations(),
  ]);

  const typeEntry = types.find((entry) => entry.name === requestedType) ?? null;
  const generationEntry = generations.find((entry) => entry.name === requestedGeneration) ?? null;
  const type = typeEntry?.name ?? '';
  const generation = generationEntry?.name ?? '';

  let filtered = species;

  if (typeEntry) {
    const ids = new Set(
      (typeEntry.resource?.pokemon ?? [])
        .map((entry) => idFromUrl(entry?.pokemon?.url ?? entry?.url))
        .filter((id) => id !== null && id <= 10000),
    );
    filtered = filtered.filter((entry) => ids.has(entry.id));
  }

  if (generationEntry) {
    const ids = new Set(
      (generationEntry.resource?.pokemon_species ?? [])
        .map((entry) => idFromUrl(entry.url))
        .filter((id) => id !== null),
    );
    filtered = filtered.filter((entry) => ids.has(entry.id));
  }

  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((entry) => humanize(entry.name).toLowerCase().includes(needle));
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const pageSpecies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pokemon = await mapLimit(pageSpecies, 20, (entry) => getPokemon(entry.id));
  const typeLabels = new Map(types.map((entry) => [entry.name, entry.label]));
  const cards = pageSpecies.map((entry, index) => {
    const details = pokemon[index];
    const cardTypes = [...(details?.types ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((slot) => ({
        name: slot.type.name,
        label: typeLabels.get(slot.type.name) ?? humanize(slot.type.name),
      }));
    return {
      species: entry,
      types: cardTypes,
      sprite: details?.sprites?.front_default ?? spriteUrl(entry.id),
    };
  });

  const filters = { q, type, generation };

  return (
    <>
      <h1 className="homeTitle">Pokémon</h1>
      <HomeFilters
        initialQ={q}
        initialType={type}
        initialGeneration={generation}
        types={types}
        generations={generations}
      />
      <p className="count">{total} Pokémon</p>
      {total === 0 ? (
        <p className="emptyMessage">No Pokémon found</p>
      ) : (
        <>
          <ul className="cardGrid">
            {cards.map((card) => (
              <PokeCard
                key={card.species.id}
                species={card.species}
                sprite={card.sprite}
                types={card.types}
                showTypes
              />
            ))}
          </ul>
          <div className="pagination">
            {page > 1 ? <Link href={pageHref(filters, page - 1)}>Previous page</Link> : null}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? <Link href={pageHref(filters, page + 1)}>Next page</Link> : null}
          </div>
        </>
      )}
    </>
  );
}
