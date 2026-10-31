'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PokemonCardList } from '../lib/components.jsx';

const PAGE_SIZE = 48;
const DEBOUNCE_MS = 200;

function buildQuery({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `?${query}` : '/';
}

export default function HomeClient({ pokemon, types, generations, initial }) {
  const [input, setInput] = useState(initial.q);
  const [q, setQ] = useState(initial.q);
  const [type, setType] = useState(initial.type);
  const [generation, setGeneration] = useState(initial.generation);
  const [page, setPage] = useState(initial.page);

  // Debounce the search text before filtering.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ((current) => {
        if (current !== input) setPage(1);
        return input;
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pokemon.filter((p) => {
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      if (type && !p.types.some((t) => t.name === type)) return false;
      if (generation && p.generation !== generation) return false;
      return true;
    });
  }, [pokemon, q, type, generation]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reflect the filter state in the URL.
  useEffect(() => {
    const target = buildQuery({ q: q.trim(), type, generation, page: currentPage });
    const current = window.location.pathname === '/' ? window.location.search || '/' : window.location.pathname + window.location.search;
    if (target !== current) {
      window.history.replaceState(null, '', target === '/' ? '/' : target);
    }
  }, [q, type, generation, currentPage]);

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const goToPage = (next) => (event) => {
    event.preventDefault();
    setPage(next);
  };

  const pageHref = (n) => buildQuery({ q: q.trim(), type, generation, page: n });

  return (
    <>
      <div className="controls">
        <div className="control">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="control">
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={updateFilter(setType)}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label htmlFor="generation">Generation</label>
          <select id="generation" value={generation} onChange={updateFilter(setGeneration)}>
            <option value="">All generations</option>
            {generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="count-text">{filtered.length} Pokémon</p>

      {visible.length > 0 ? (
        <PokemonCardList cards={visible} showTypes />
      ) : (
        <p>No Pokémon found</p>
      )}

      <nav className="pagination" aria-label="Pagination">
        {currentPage > 1 && (
          <a href={pageHref(currentPage - 1)} onClick={goToPage(currentPage - 1)}>
            Previous page
          </a>
        )}
        <span>
          Page {currentPage} of {totalPages}
        </span>
        {currentPage < totalPages && (
          <a href={pageHref(currentPage + 1)} onClick={goToPage(currentPage + 1)}>
            Next page
          </a>
        )}
      </nav>
    </>
  );
}
