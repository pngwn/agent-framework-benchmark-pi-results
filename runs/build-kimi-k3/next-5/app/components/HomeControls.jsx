'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Search / type / generation controls for the home page. Filter state lives in the
 * URL query; changing a control updates the URL and returns to page 1.
 */
export default function HomeControls({ q, type, generation, types, generations }) {
  const router = useRouter();
  const [term, setTerm] = useState(q);
  const termRef = useRef(term);
  termRef.current = term;

  // Keep the input in sync when the URL changes elsewhere (e.g. pagination).
  useEffect(() => {
    setTerm(q);
  }, [q]);

  // Debounced search-as-you-type.
  useEffect(() => {
    if (term === q) return undefined;
    const handle = setTimeout(() => {
      navigate((params) => {
        if (termRef.current) params.set('q', termRef.current);
        else params.delete('q');
      });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function navigate(update, { replace = true } = {}) {
    const params = new URLSearchParams(window.location.search);
    update(params);
    params.delete('page');
    const query = params.toString();
    const url = query ? `/?${query}` : '/';
    if (replace) router.replace(url);
    else router.push(url);
  }

  return (
    <div className="controls">
      <div className="field field-search">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="type">Type</label>
        <select
          id="type"
          value={type}
          onChange={(e) =>
            navigate((params) => {
              if (e.target.value) params.set('type', e.target.value);
              else params.delete('type');
            })
          }
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="generation">Generation</label>
        <select
          id="generation"
          value={generation}
          onChange={(e) =>
            navigate((params) => {
              if (e.target.value) params.set('generation', e.target.value);
              else params.delete('generation');
            })
          }
        >
          <option value="">All generations</option>
          {generations.map((g) => (
            <option key={g.name} value={g.name}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
