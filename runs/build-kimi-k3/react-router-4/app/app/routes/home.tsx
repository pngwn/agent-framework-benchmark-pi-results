import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getPokedex } from "../lib/pokeapi";
import { PokemonCard } from "../components/cards";
import type { CardData } from "../lib/types";

const PAGE_SIZE = 48;

export async function loader() {
  return getPokedex();
}

export function shouldRevalidate() {
  // The loader data is the full index; filtering and pagination happen in the
  // component from the URL, so search-param changes don't need new data.
  return false;
}

export function meta() {
  return [{ title: "Pokédex" }];
}

export default function Home({ loaderData }: { loaderData: any }) {
  const { pokemon, types, generations } = loaderData;
  const typeDisplays = useMemo(
    () => new Map<string, string>(types.map((t: any) => [t.name, t.display])),
    [types],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get("type") ?? "";
  const generationParam = searchParams.get("generation") ?? "";
  const qParam = searchParams.get("q") ?? "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "", 10) || 1);

  const [q, setQ] = useState(qParam);
  const inputRef = useRef<HTMLInputElement>(null);

  // If the user typed before hydration finished, pick up the DOM value.
  useEffect(() => {
    const value = inputRef.current?.value ?? "";
    if (value !== q) setQ(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce pushing the search text into the URL.
  useEffect(() => {
    if (q === qParam) return;
    const timeout = setTimeout(() => {
      updateFilters({ q });
    }, 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateFilters({
    q: nextQ = q,
    type = typeParam,
    generation = generationParam,
    replace = false,
  }: {
    q?: string;
    type?: string;
    generation?: string;
    replace?: boolean;
  }) {
    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (type) params.set("type", type);
    if (generation) params.set("generation", generation);
    setSearchParams(params, { replace, preventScrollReset: true });
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return pokemon.filter(
      (p: any) =>
        (!query || p.display.toLowerCase().includes(query)) &&
        (!typeParam || p.types.includes(typeParam)) &&
        (!generationParam || p.generation === generationParam),
    );
  }, [pokemon, q, typeParam, generationParam]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageParam, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(n: number): string {
    const params = new URLSearchParams(searchParams);
    if (n > 1) params.set("page", String(n));
    else params.delete("page");
    const s = params.toString();
    return s ? `?${s}` : "/";
  }

  return (
    <>
      <h1>Pokémon</h1>
      <div className="controls">
        <div className="control control-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            ref={inputRef}
            defaultValue={qParam}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="control">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={typeParam}
            onChange={(e) => updateFilters({ type: e.target.value })}
          >
            <option value="">All types</option>
            {types.map((t: any) => (
              <option key={t.name} value={t.name}>
                {t.display}
              </option>
            ))}
          </select>
        </div>
        <div className="control">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={generationParam}
            onChange={(e) => updateFilters({ generation: e.target.value })}
          >
            <option value="">All generations</option>
            {generations.map((g: any) => (
              <option key={g.name} value={g.name}>
                {g.display}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{filtered.length} Pokémon</p>

      {pageItems.length === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <ul className="cards">
          {pageItems.map((p: any) => {
            const card: CardData = {
              id: p.id,
              name: p.name,
              display: p.display,
              dex: `#${String(p.id).padStart(4, "0")}`,
              sprite: p.sprite,
            };
            return (
              <PokemonCard
                key={p.id}
                card={card}
                types={p.types.map((t: string) => ({
                  name: t,
                  display: typeDisplays.get(t) ?? t,
                }))}
              />
            );
          })}
        </ul>
      )}

      {pageItems.length > 0 && (
        <p className="pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          {page > 1 && (
            <Link to={pageHref(page - 1)} preventScrollReset>
              Previous page
            </Link>
          )}
          {page < totalPages && (
            <Link to={pageHref(page + 1)} preventScrollReset>
              Next page
            </Link>
          )}
        </p>
      )}
    </>
  );
}
