'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Search / type / generation filter controls. Filter state lives in the URL;
// changing a control navigates (and resets to page 1).
export function HomeControls({ q, type, generation, types, generations }) {
  const router = useRouter();
  const [search, setSearch] = useState(q);
  const lastPushed = useRef(q);
  const debounce = useRef(null);

  // Sync the input when the URL's q changes outside of our own navigation
  // (e.g. browser back/forward).
  useEffect(() => {
    if (q !== lastPushed.current) {
      lastPushed.current = q;
      setSearch(q);
    }
  }, [q]);

  useEffect(() => () => clearTimeout(debounce.current), []);

  function navigate(params) {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.type) query.set('type', params.type);
    if (params.generation) query.set('generation', params.generation);
    const qs = query.toString();
    return qs ? `/?${qs}` : '/';
  }

  function onSearchChange(event) {
    const value = event.target.value;
    setSearch(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      lastPushed.current = value;
      router.replace(navigate({ q: value, type, generation }), { scroll: false });
    }, 250);
  }

  function onTypeChange(event) {
    const value = event.target.value;
    router.push(navigate({ q, type: value, generation }), { scroll: false });
  }

  function onGenerationChange(event) {
    const value = event.target.value;
    router.push(navigate({ q, type, generation: value }), { scroll: false });
  }

  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="search">Search</label>
        <input id="search" type="search" value={search} onChange={onSearchChange} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="type-filter">Type</label>
        <select id="type-filter" value={type} onChange={onTypeChange}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="generation-filter">Generation</label>
        <select id="generation-filter" value={generation} onChange={onGenerationChange}>
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
