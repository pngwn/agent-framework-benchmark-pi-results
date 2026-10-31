'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Search / type / generation controls. Filter state lives in the URL query;
// changing a filter updates the URL and goes back to page 1.
export default function HomeFilters({ q, type, generation, types, generations }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const timer = useRef(null);

  // Keep the input in sync when the URL changes elsewhere (e.g. navigation).
  useEffect(() => {
    setText(q);
  }, [q]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const navigate = (next) => {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.type) params.set('type', next.type);
    if (next.generation) params.set('generation', next.generation);
    const query = params.toString();
    router.replace(query ? `/?${query}` : '/', { scroll: false });
  };

  const onSearch = (event) => {
    const value = event.target.value;
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate({ q: value.trim(), type, generation }), 250);
  };

  return (
    <div className="filters">
      <div className="field">
        <label htmlFor="filter-search">Search</label>
        <input id="filter-search" type="search" value={text} onChange={onSearch} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="filter-type">Type</label>
        <select
          id="filter-type"
          key={type}
          defaultValue={type}
          onChange={(e) => navigate({ q: text.trim(), type: e.target.value, generation })}
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
        <label htmlFor="filter-generation">Generation</label>
        <select
          id="filter-generation"
          key={generation}
          defaultValue={generation}
          onChange={(e) => navigate({ q: text.trim(), type, generation: e.target.value })}
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
  );
}
