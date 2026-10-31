'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Search / type / generation controls. Filter state lives in the URL query;
// changing a filter updates the URL and returns to page 1.
export default function Controls({ q, type, generation, types, generations }) {
  const router = useRouter();
  const [qValue, setQValue] = useState(q);
  const [typeValue, setTypeValue] = useState(type);
  const [generationValue, setGenerationValue] = useState(generation);
  useEffect(() => setQValue(q), [q]);
  useEffect(() => setTypeValue(type), [type]);
  useEffect(() => setGenerationValue(generation), [generation]);

  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = (next) => {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.type) params.set('type', next.type);
    if (next.generation) params.set('generation', next.generation);
    const query = params.toString();
    router.replace(query ? `/?${query}` : '/');
  };

  return (
    <div className="controls">
      <div className="field">
        <label htmlFor="filter-search">Search</label>
        <input
          id="filter-search"
          type="search"
          autoComplete="off"
          value={qValue}
          onChange={(event) => {
            const value = event.target.value;
            setQValue(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(
              () => apply({ q: value, type: typeValue, generation: generationValue }),
              300,
            );
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="filter-type">Type</label>
        <select
          id="filter-type"
          value={typeValue}
          onChange={(event) => {
            setTypeValue(event.target.value);
            apply({ q: qValue, type: event.target.value, generation: generationValue });
          }}
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
        <label htmlFor="filter-generation">Generation</label>
        <select
          id="filter-generation"
          value={generationValue}
          onChange={(event) => {
            setGenerationValue(event.target.value);
            apply({ q: qValue, type: typeValue, generation: event.target.value });
          }}
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
