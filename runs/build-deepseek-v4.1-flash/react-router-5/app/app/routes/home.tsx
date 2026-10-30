import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { getHomeData } from "../lib/api.server";
import { PokemonCardGrid } from "../components/PokemonCard";

const PAGE_SIZE = 48;

export function meta({}: Route.MetaArgs) {
  return [{ title: "Pokédex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const data = await getHomeData();

  const q = (url.searchParams.get("q") ?? "").trim();
  const requestedType = url.searchParams.get("type") ?? "";
  const requestedGeneration = url.searchParams.get("generation") ?? "";
  const type = data.types.some((entry) => entry.name === requestedType) ? requestedType : "";
  const generation = data.generations.some((entry) => entry.name === requestedGeneration)
    ? requestedGeneration
    : "";

  const needle = q.toLowerCase();
  const filtered = data.species.filter((pokemon) => {
    if (needle && !pokemon.label.toLowerCase().includes(needle)) return false;
    if (type && !pokemon.types.some((entry) => entry.name === type)) return false;
    if (generation && pokemon.generation !== generation) return false;
    return true;
  });

  const count = filtered.length;
  const totalPages = count > 0 ? Math.ceil(count / PAGE_SIZE) : 0;
  const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const requested = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const page = totalPages > 0 ? Math.min(requested, totalPages) : 1;
  const start = (page - 1) * PAGE_SIZE;

  return {
    q,
    type,
    generation,
    page,
    count,
    totalPages,
    species: filtered.slice(start, start + PAGE_SIZE),
    types: data.types,
    generations: data.generations,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { q, type, generation, page, count, totalPages, species, types, generations } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(q);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  useEffect(() => {
    const nextQuery = searchValue.trim();
    if (nextQuery === q) return;
    const timer = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (nextQuery) next.set("q", nextQuery);
        else next.delete("q");
        next.delete("page");
        return next;
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchValue, q, setSearchParams]);

  function updateFilter(key: "type" | "generation", value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  }

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    const query = next.toString();
    return query ? `/?${query}` : "/";
  }

  return (
    <div className="page">
      <h1 className="home-heading">Pokémon</h1>

      <div className="filters">
        <div className="field">
          <label htmlFor="pokemon-search">Search</label>
          <input
            id="pokemon-search"
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pokemon-type">Type</label>
          <select
            id="pokemon-type"
            value={type}
            onChange={(event) => updateFilter("type", event.target.value)}
          >
            <option value="">All types</option>
            {types.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pokemon-generation">Generation</label>
          <select
            id="pokemon-generation"
            value={generation}
            onChange={(event) => updateFilter("generation", event.target.value)}
          >
            <option value="">All generations</option>
            {generations.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="results-count">{count} Pokémon</p>

      {count === 0 ? (
        <p className="empty-state">No Pokémon found</p>
      ) : (
        <>
          <PokemonCardGrid pokemon={species} showTypes />
          <div className="pagination">
            <span>
              Page {Math.min(page, totalPages)} of {totalPages}
            </span>
            {page > 1 ? (
              <Link to={pageHref(page - 1)} rel="prev">
                Previous page
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link to={pageHref(page + 1)} rel="next">
                Next page
              </Link>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
