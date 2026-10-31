import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { getHomeData } from "../lib/data.server";
import { CardGrid } from "../components/ui";

const PAGE_SIZE = 48;

export const meta: Route.MetaFunction = () => [{ title: "Pokédex" }];

export async function loader() {
  return await getHomeData();
}

// Filtering and pagination happen client-side; no need to refetch the
// (server-side cached) data when only the query string changes.
export function shouldRevalidate() {
  return false;
}

function withParams(
  current: URLSearchParams,
  changes: Record<string, string | null>,
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cards, types, generations } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";
  const generation = searchParams.get("generation") ?? "";
  const pageParam = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [qInput, setQInput] = useState(q);
  useEffect(() => {
    setQInput(q);
  }, [q]);

  // Push the search text into the URL, debounced.
  useEffect(() => {
    if (qInput === q) return;
    const timeout = setTimeout(() => {
      setSearchParams((prev) => withParams(prev, { q: qInput || null, page: null }));
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return cards.filter(
      (card) =>
        (!query || card.name.toLowerCase().includes(query)) &&
        (!type || card.types?.some((t) => t.name === type)) &&
        (!generation || card.generation === generation),
    );
  }, [cards, q, type, generation]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageParam, totalPages);
  const pageCards = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateFilter = (key: string, value: string) => {
    setSearchParams((prev) => withParams(prev, { [key]: value || null, page: null }));
  };

  return (
    <>
      <h1>Pokémon</h1>
      <div className="controls">
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={(event) => updateFilter("type", event.target.value)}>
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
            onChange={(event) => updateFilter("generation", event.target.value)}
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
      <p className="count">{filtered.length} Pokémon</p>
      {filtered.length === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <>
          <CardGrid cards={pageCards} showTypes />
          <p className="pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            {page > 1 ? (
              <Link to={{ search: `?${withParams(searchParams, { page: page - 1 > 1 ? String(page - 1) : null })}` }}>
                Previous page
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link to={{ search: `?${withParams(searchParams, { page: String(page + 1) })}` }}>Next page</Link>
            ) : null}
          </p>
        </>
      )}
    </>
  );
}
