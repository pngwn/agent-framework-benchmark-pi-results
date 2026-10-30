'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface HomeControlsProps {
  initialQ: string;
  initialType: string;
  initialGeneration: string;
  typeOptions: Option[];
  generationOptions: Option[];
}

export default function HomeControls({
  initialQ,
  initialType,
  initialGeneration,
  typeOptions,
  generationOptions,
}: HomeControlsProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState(initialType);
  const [generation, setGeneration] = useState(initialGeneration);

  const qRef = useRef(initialQ);
  const typeRef = useRef(initialType);
  const generationRef = useRef(initialGeneration);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function navigate(values: { q: string; type: string; generation: string }) {
    const params = new URLSearchParams();
    const query = values.q.trim();
    if (query) params.set('q', query);
    if (values.type) params.set('type', values.type);
    if (values.generation) params.set('generation', values.generation);
    const search = params.toString();
    router.push(search ? `/?${search}` : '/', { scroll: false });
  }

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleSearch(value: string) {
    setQ(value);
    qRef.current = value;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      navigate({ q: qRef.current, type: typeRef.current, generation: generationRef.current });
    }, 250);
  }

  function handleType(value: string) {
    setType(value);
    typeRef.current = value;
    clearTimer();
    navigate({ q: qRef.current, type: value, generation: generationRef.current });
  }

  function handleGeneration(value: string) {
    setGeneration(value);
    generationRef.current = value;
    clearTimer();
    navigate({ q: qRef.current, type: typeRef.current, generation: value });
  }

  return (
    <div className="filters">
      <div className="filter filter-search">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          name="q"
          type="search"
          value={q}
          autoComplete="off"
          onChange={(event) => handleSearch(event.target.value)}
        />
      </div>
      <div className="filter">
        <label htmlFor="type-filter">Type</label>
        <select id="type-filter" name="type" value={type} onChange={(event) => handleType(event.target.value)}>
          <option value="">All types</option>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="filter">
        <label htmlFor="generation-filter">Generation</label>
        <select
          id="generation-filter"
          name="generation"
          value={generation}
          onChange={(event) => handleGeneration(event.target.value)}
        >
          <option value="">All generations</option>
          {generationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
