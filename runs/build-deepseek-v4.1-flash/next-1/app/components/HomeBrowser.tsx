'use client';

import { useMemo, useState } from 'react';
import PokemonCard, { type CardType } from './PokemonCard';

export interface HomeSpecies {
  id: number;
  slug: string;
  displayName: string;
  generation: string;
  types: CardType[];
  spriteUrl: string;
}

interface Option {
  name: string;
  label: string;
}

const PAGE_SIZE = 48;

export default function HomeBrowser({
  species,
  types,
  generations,
  initial,
}: {
  species: HomeSpecies[];
  types: Option[];
  generations: Option[];
  initial: { q: string; type: string; generation: string; page: number };
}) {
  const [query, setQuery] = useState(initial.q);
  const [type, setType] = useState(initial.type);
  const [generation, setGeneration] = useState(initial.generation);
  const [page, setPage] = useState(initial.page);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return species.filter((item) => {
      if (needle && !item.displayName.toLowerCase().includes(needle)) return false;
      if (type && !item.types.some((itemType) => itemType.name === type)) return false;
      if (generation && item.generation !== generation) return false;
      return true;
    });
  }, [generation, query, species, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function buildHref(nextQuery: string, nextType: string, nextGeneration: string, nextPage: number) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set('q', nextQuery);
    if (nextType) params.set('type', nextType);
    if (nextGeneration) params.set('generation', nextGeneration);
    if (nextPage > 1) params.set('page', String(nextPage));
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : '/';
  }

  function hrefFor(targetPage: number) {
    return buildHref(query, type, generation, targetPage);
  }

  function syncUrl(nextQuery: string, nextType: string, nextGeneration: string, nextPage: number) {
    window.history.replaceState(
      window.history.state,
      '',
      buildHref(nextQuery, nextType, nextGeneration, nextPage),
    );
  }

  function onSearch(value: string) {
    setQuery(value);
    setPage(1);
    syncUrl(value, type, generation, 1);
  }

  function onType(value: string) {
    setType(value);
    setPage(1);
    syncUrl(query, value, generation, 1);
  }

  function onGeneration(value: string) {
    setGeneration(value);
    setPage(1);
    syncUrl(query, type, value, 1);
  }

  return (
    <>
      <div className="filters">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(event) => onSearch(event.currentTarget.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select id="type-filter" value={type} onChange={(event) => onType(event.currentTarget.value)}>
            <option value="">All types</option>
            {types.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={generation}
            onChange={(event) => onGeneration(event.currentTarget.value)}
          >
            <option value="">All generations</option>
            {generations.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{filtered.length} Pokémon</p>

      {filtered.length === 0 ? (
        <p className="no-results">No Pokémon found</p>
      ) : (
        <ul className="card-grid">
          {visible.map((item) => (
            <PokemonCard
              key={item.id}
              id={item.id}
              slug={item.slug}
              name={item.displayName}
              spriteUrl={item.spriteUrl}
              types={item.types}
            />
          ))}
        </ul>
      )}

      <div className="pagination">
        {currentPage > 1 ? <a href={hrefFor(currentPage - 1)}>Previous page</a> : null}
        <span className="page-info">
          Page {currentPage} of {totalPages}
        </span>
        {currentPage < totalPages ? <a href={hrefFor(currentPage + 1)}>Next page</a> : null}
      </div>
    </>
  );
}
