'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function buildUrl(pathname, updates) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.delete('page');
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function Filters({ q, type, generation, types, generations }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);

  useEffect(() => {
    if (search === q) return undefined;
    const timer = setTimeout(() => {
      router.replace(buildUrl(pathname, { q: search.trim() }));
    }, 250);
    return () => clearTimeout(timer);
    // Only the input value should schedule a navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <form className="filter-form" role="search" onSubmit={(event) => event.preventDefault()}>
      <div className="field">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          name="q"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="type">Type</label>
        <select
          id="type"
          name="type"
          value={type || ''}
          onChange={(event) => router.push(buildUrl(pathname, { type: event.target.value }))}
        >
          <option value="">All types</option>
          {types.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.english}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="generation">Generation</label>
        <select
          id="generation"
          name="generation"
          value={generation || ''}
          onChange={(event) => router.push(buildUrl(pathname, { generation: event.target.value }))}
        >
          <option value="">All generations</option>
          {generations.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.english}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
