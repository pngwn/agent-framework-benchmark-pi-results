import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { getIndex } from "../lib/pokeapi.server";
import { humanize } from "../lib/format";
import { PokemonCardList } from "../components/ui";

const PAGE_SIZE = 48;

export async function loader() {
  const index = await getIndex();
  return index;
}

// Filtering and pagination happen client-side from the URL; the index data doesn't change.
export function shouldRevalidate() {
  return false;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Not found – Pokédex" }];
  return [{ title: "Pokédex" }];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { species, types, generations } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const type = searchParams.get("type") ?? "";
  const generation = searchParams.get("generation") ?? "";
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);

  // The search box is driven by local state so fast typing never races the URL;
  // the URL is updated (replacing history) on every change.
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  const query = q.trim().toLowerCase();
  const filtered = species.filter((s) => {
    if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
    if (type && !s.types.some((t) => t.name === type)) return false;
    if (generation && s.generation !== generation) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number.isFinite(rawPage) ? rawPage : 1), totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    // Keep the (possibly newer) local search text when other filters change.
    if (key !== "q") {
      if (q) next.set("q", q);
      else next.delete("q");
    }
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const updateSearch = (value: string) => {
    setQ(value);
    updateFilter("q", value);
  };

  const pageHref = (n: number) => {
    const next = new URLSearchParams(searchParams);
    if (n > 1) next.set("page", String(n));
    else next.delete("page");
    const search = next.toString();
    return search ? `/?${search}` : "/";
  };

  return (
    <>
      <h1>Pokémon</h1>
      <div className="controls">
        <div className="control">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={q}
            onChange={(e) => updateSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="control">
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={(e) => updateFilter("type", e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.english}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label htmlFor="generation">Generation</label>
          <select
            id="generation"
            value={generation}
            onChange={(e) => updateFilter("generation", e.target.value)}
          >
            <option value="">All generations</option>
            {generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.english}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{filtered.length} Pokémon</p>

      {pageItems.length === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <PokemonCardList
          cards={pageItems.map((s) => ({ id: s.id, speciesName: s.name, types: s.types }))}
          showTypes
        />
      )}

      <nav className="pagination" aria-label="Pagination">
        <span>
          Page {page} of {totalPages}
        </span>
        {page > 1 && (
          <Link to={pageHref(page - 1)} rel="prev">
            Previous page
          </Link>
        )}
        {page < totalPages && (
          <Link to={pageHref(page + 1)} rel="next">
            Next page
          </Link>
        )}
      </nav>
    </>
  );
}
