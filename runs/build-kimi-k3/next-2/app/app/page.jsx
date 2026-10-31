import Link from 'next/link';
import {
  getGeneration,
  getGenerationList,
  getPlayableTypes,
  getPokemon,
  getSpeciesList,
  getType,
} from '../lib/api.js';
import { englishName, humanize, idFromUrl, isAlternateFormId } from '../lib/format.js';
import { HomeControls } from './components/HomeControls.jsx';
import { PokemonCardList } from './components/PokemonCard.jsx';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

function queryString({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q ?? '');
  const type = String(sp.type ?? '');
  const generation = String(sp.generation ?? '');
  const requestedPage = Math.max(1, Number.parseInt(sp.page, 10) || 1);

  const [speciesList, types, generationList] = await Promise.all([
    getSpeciesList(),
    getPlayableTypes(),
    getGenerationList(),
  ]);

  const generations = await Promise.all(generationList.map((g) => getGeneration(g.name)));

  // Start from every species, then apply the active filters.
  let matching = speciesList.map((s) => ({ id: idFromUrl(s.url), name: s.name })).filter((s) => s.id != null);

  if (type) {
    const record = await getType(type);
    if (record) {
      const ids = new Set(
        record.pokemon
          .map((entry) => idFromUrl(entry.pokemon.url))
          .filter((id) => id != null && !isAlternateFormId(id)),
      );
      matching = matching.filter((s) => ids.has(s.id));
    }
  }

  if (generation) {
    const record = await getGeneration(generation);
    if (record) {
      const ids = new Set(record.pokemon_species.map((s) => idFromUrl(s.url)));
      matching = matching.filter((s) => ids.has(s.id));
    }
  }

  if (q) {
    const needle = q.toLowerCase();
    matching = matching.filter((s) => humanize(s.name).toLowerCase().includes(needle));
  }

  matching.sort((a, b) => a.id - b.id);

  const count = matching.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageSpecies = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cards = await Promise.all(
    pageSpecies.map(async (s) => {
      const pokemon = await getPokemon(s.id);
      return {
        id: s.id,
        name: s.name,
        sprite: pokemon?.sprites?.front_default ?? null,
        types: (pokemon?.types ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      };
    }),
  );

  return (
    <>
      <h1>Pokémon</h1>
      <HomeControls
        q={q}
        type={type}
        generation={generation}
        types={types.map((t) => ({ name: t.name, label: humanize(t.name) }))}
        generations={generations.filter(Boolean).map((g) => ({ name: g.name, label: englishName(g) }))}
      />
      <p className="result-count">{count} Pokémon</p>
      {count === 0 ? (
        <p className="empty-message">No Pokémon found</p>
      ) : (
        <PokemonCardList cards={cards} showTypes />
      )}
      <nav className="pagination" aria-label="Pagination">
        {page > 1 ? <Link href={queryString({ q, type, generation, page: page - 1 })}>Previous page</Link> : null}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? <Link href={queryString({ q, type, generation, page: page + 1 })}>Next page</Link> : null}
      </nav>
    </>
  );
}
