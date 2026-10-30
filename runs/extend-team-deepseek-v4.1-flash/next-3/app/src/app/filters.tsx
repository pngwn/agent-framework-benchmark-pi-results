'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

export type FilterValues = { q: string; type: string; generation: string };
type Option = { value: string; label: string };

const SEARCH_DEBOUNCE_MS = 200;

function href(pathname: string, values: FilterValues): string {
  const query = new URLSearchParams();
  if (values.q.trim()) query.set('q', values.q.trim());
  if (values.type) query.set('type', values.type);
  if (values.generation) query.set('generation', values.generation);
  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function Filters({ values, types, generations }: { values: FilterValues; types: Option[]; generations: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useState(values);
  const lastPushed = useRef(values);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow URL changes that didn't come from these controls (links, back/forward).
  useEffect(() => {
    const pushed = lastPushed.current;
    if (values.q === pushed.q.trim() && values.type === pushed.type && values.generation === pushed.generation) return;
    lastPushed.current = values;
    setCurrent(values);
  }, [values]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(next: FilterValues) {
    lastPushed.current = next;
    startTransition(() => router.replace(href(pathname, next), { scroll: false }));
  }

  function update(change: Partial<FilterValues>, debounce = false) {
    const next = { ...current, ...change };
    setCurrent(next);
    clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => navigate(next), SEARCH_DEBOUNCE_MS);
    else navigate(next);
  }

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
      <div className="field field-search">
        <label htmlFor="filter-q">Search</label>
        <input
          id="filter-q"
          type="search"
          autoComplete="off"
          value={current.q}
          onChange={(e) => update({ q: e.target.value }, true)}
        />
      </div>
      <div className="field">
        <label htmlFor="filter-type">Type</label>
        <select id="filter-type" value={current.type} onChange={(e) => update({ type: e.target.value })}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-generation">Generation</label>
        <select id="filter-generation" value={current.generation} onChange={(e) => update({ generation: e.target.value })}>
          <option value="">All generations</option>
          {generations.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
