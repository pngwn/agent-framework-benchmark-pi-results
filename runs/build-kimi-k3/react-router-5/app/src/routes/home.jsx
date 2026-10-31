import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { apiBase, getPokedexIndex } from '../lib/api.server.js';
import { humanize } from '../lib/util.js';
import { CardList } from '../lib/components.jsx';

const PAGE_SIZE = 48;

export async function loader() {
  const index = await getPokedexIndex();
  return { apiBase, ...index };
}

export function meta() {
  return [{ title: 'Pokédex' }];
}

// The whole index is already on the client; changing filters in the URL
// doesn't need a server round trip.
export function shouldRevalidate() {
  return false;
}

export default function Home({ loaderData }) {
  const { species, types, generations, apiBase } = loaderData;
  const [params, setParams] = useSearchParams();
  const qParam = params.get('q') ?? '';
  const typeParam = params.get('type') ?? '';
  const generationParam = params.get('generation') ?? '';
  const pageParam = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  // The search box is controlled locally so typing is instant; the URL
  // catches up after a short debounce.
  const [q, setQ] = useState(qParam);
  useEffect(() => setQ(qParam), [qParam]);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const applyFilter = (changes, options) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        // Changing a filter goes back to page 1.
        next.delete('page');
        return next;
      },
      { preventScrollReset: true, ...options },
    );
  };

  const onSearch = (event) => {
    const value = event.target.value;
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      applyFilter({ q: value.trim().toLowerCase() }, { replace: true });
    }, 200);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return species.filter((s) => {
      if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
      if (typeParam && !s.types.some((t) => t.type === typeParam)) return false;
      if (generationParam && s.generation !== generationParam) return false;
      return true;
    });
  }, [species, q, typeParam, generationParam]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageParam, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (n) => {
    const next = new URLSearchParams(params);
    if (n > 1) next.set('page', String(n));
    else next.delete('page');
    const s = next.toString();
    return s ? `?${s}` : '?';
  };

  return (
    <>
      <h1>Pokémon</h1>
      <div className="filters">
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input id="search" type="search" value={q} onChange={onSearch} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={typeParam}
            onChange={(e) => applyFilter({ type: e.target.value })}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.en}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation">Generation</label>
          <select
            id="generation"
            value={generationParam}
            onChange={(e) => applyFilter({ generation: e.target.value })}
          >
            <option value="">All generations</option>
            {generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="count">{filtered.length} Pokémon</p>

      {pageItems.length ? (
        <CardList
          apiBase={apiBase}
          items={pageItems.map((s) => ({ id: s.id, name: s.name, types: s.types }))}
        />
      ) : (
        <p className="empty">No Pokémon found</p>
      )}

      {filtered.length ? (
        <div className="pagination">
          <span className="page-status">
            Page {page} of {totalPages}
          </span>
          {page > 1 ? <Link to={pageHref(page - 1)}>Previous page</Link> : null}
          {page < totalPages ? <Link to={pageHref(page + 1)}>Next page</Link> : null}
        </div>
      ) : null}
    </>
  );
}
