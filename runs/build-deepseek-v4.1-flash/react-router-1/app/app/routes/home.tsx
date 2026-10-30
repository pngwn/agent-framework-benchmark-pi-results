import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PokemonGrid } from '../components';
import { getHomeData } from '../lib/api.server';

export async function loader() {
  return getHomeData();
}

export function meta() {
  return [{ title: 'Pokédex' }];
}

const PAGE_SIZE = 48;

export default function Home({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { species, types, generations } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = searchParams.get('q') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const generationFilter = searchParams.get('generation') ?? '';
  const [query, setQuery] = useState(qParam);
  const previousQ = useRef(qParam);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (qParam !== previousQ.current) {
      previousQ.current = qParam;
      if (document.activeElement !== searchInputRef.current) {
        setQuery(qParam);
      }
    }
  }, [qParam]);

  function navigateWithParam(key: string, value: string, replace = false) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('page');
        return next;
      },
      { replace, preventScrollReset: true },
    );
  }

  function onSearch(value: string) {
    setQuery(value);
    previousQ.current = value;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value.trim()) next.set('q', value);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return species.filter((pokemon) => {
      if (needle && !pokemon.humanized.toLowerCase().includes(needle)) {
        return false;
      }
      if (typeFilter && !pokemon.types.some((type) => type.name === typeFilter)) {
        return false;
      }
      if (generationFilter && pokemon.generation !== generationFilter) {
        return false;
      }
      return true;
    });
  }, [species, query, typeFilter, generationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Math.min(
    totalPages,
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  );
  const pageSpecies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    const queryString = next.toString();
    return queryString ? `/?${queryString}` : '/';
  }

  return (
    <>
      <h1>Pokémon</h1>
      <div className="filters">
        <div className="field search-field">
          <label htmlFor="pokemon-search">Search</label>
          <input
            id="pokemon-search"
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(event) => navigateWithParam('type', event.target.value)}
          >
            <option value="">All types</option>
            {types.map((type) => (
              <option key={type.name} value={type.name}>
                {type.english}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={generationFilter}
            onChange={(event) =>
              navigateWithParam('generation', event.target.value)
            }
          >
            <option value="">All generations</option>
            {generations.map((generation) => (
              <option key={generation.name} value={generation.name}>
                {generation.english}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{filtered.length} Pokémon</p>

      {filtered.length === 0 ? (
        <p className="empty">No Pokémon found</p>
      ) : (
        <>
          <PokemonGrid cards={pageSpecies} showTypes />
          <div className="pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            {page > 1 ? (
              <Link to={pageHref(page - 1)}>Previous page</Link>
            ) : null}
            {page < totalPages ? (
              <Link to={pageHref(page + 1)}>Next page</Link>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}

