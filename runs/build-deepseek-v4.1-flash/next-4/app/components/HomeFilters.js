'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

function urlFor(q, type, generation) {
  const params = new URLSearchParams();
  const search = q.trim();
  if (search) params.set('q', search);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export default function HomeFilters({ initialQ, initialType, initialGeneration, types, generations }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState(initialType);
  const [generation, setGeneration] = useState(initialGeneration);
  const timer = useRef(null);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);
  useEffect(() => {
    setType(initialType);
  }, [initialType]);
  useEffect(() => {
    setGeneration(initialGeneration);
  }, [initialGeneration]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(nextQ, nextType, nextGeneration) {
    router.replace(urlFor(nextQ, nextType, nextGeneration), { scroll: false });
  }

  function onSearch(event) {
    const value = event.target.value;
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(value, type, generation), 200);
  }

  function onType(event) {
    const value = event.target.value;
    setType(value);
    clearTimeout(timer.current);
    navigate(q, value, generation);
  }

  function onGeneration(event) {
    const value = event.target.value;
    setGeneration(value);
    clearTimeout(timer.current);
    navigate(q, type, value);
  }

  return (
    <div className="filters">
      <div className="field searchField">
        <label htmlFor="search">Search</label>
        <input
          className="input"
          id="search"
          name="q"
          type="search"
          value={q}
          onChange={onSearch}
          autoComplete="off"
        />
      </div>
      <div className="field selectField">
        <label htmlFor="type">Type</label>
        <select className="select" id="type" name="type" value={type} onChange={onType}>
          <option value="">All types</option>
          {types.map((entry) => (
            <option value={entry.name} key={entry.name}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field selectField">
        <label htmlFor="generation">Generation</label>
        <select className="select" id="generation" name="generation" value={generation} onChange={onGeneration}>
          <option value="">All generations</option>
          {generations.map((entry) => (
            <option value={entry.name} key={entry.name}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
