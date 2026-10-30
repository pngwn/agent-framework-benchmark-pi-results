'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function urlFor(pathname, { q, type, generation }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function HomeControls({
  initialQ,
  initialType,
  initialGeneration,
  generations,
  types,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initialQ);

  useEffect(() => {
    setSearch(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (search === initialQ) return undefined;
    const timer = setTimeout(() => {
      router.replace(
        urlFor(pathname, { q: search.trimEnd(), type: initialType, generation: initialGeneration }),
        { scroll: false },
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [search, initialQ, initialType, initialGeneration, pathname, router]);

  return (
    <div className="home-controls">
      <div className="field search-field">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          name="q"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="type-filter">Type</label>
        <select
          id="type-filter"
          value={initialType}
          onChange={(event) =>
            router.push(
              urlFor(pathname, {
                q: initialQ,
                type: event.target.value,
                generation: initialGeneration,
              }),
              { scroll: false },
            )
          }
        >
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type.name} value={type.name}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="generation-filter">Generation</label>
        <select
          id="generation-filter"
          value={initialGeneration}
          onChange={(event) =>
            router.push(
              urlFor(pathname, {
                q: initialQ,
                type: initialType,
                generation: event.target.value,
              }),
              { scroll: false },
            )
          }
        >
          <option value="">All generations</option>
          {generations.map((generation) => (
            <option key={generation.name} value={generation.name}>
              {generation.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
