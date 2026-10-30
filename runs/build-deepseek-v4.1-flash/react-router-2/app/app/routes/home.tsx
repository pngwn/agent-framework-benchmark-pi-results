import { useEffect, useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router";
import { PokemonCards } from "../components/PokemonCards";
import { getHomeData } from "../lib/api.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return getHomeData(new URL(request.url));
}

export const meta: MetaFunction<typeof loader> = () => [{ title: "Pokédex" }];

function searchFor(
  filters: { q: string; type: string; generation: string },
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (page > 1) params.set("page", String(page));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export default function HomeRoute() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState(data.filters.q);

  useEffect(() => {
    setSearch(data.filters.q);
  }, [data.filters.q]);

  useEffect(() => {
    if (search === data.filters.q) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (search) params.set("q", search);
      else params.delete("q");
      params.delete("page");
      const value = params.toString();
      navigate({ search: value ? `?${value}` : "" }, { replace: true, preventScrollReset: true });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search, data.filters.q, location.search, navigate]);

  function updateFilter(key: "type" | "generation", value: string) {
    const params = new URLSearchParams(location.search);
    if (search) params.set("q", search);
    else params.delete("q");
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const valueString = params.toString();
    navigate({ search: valueString ? `?${valueString}` : "" }, { preventScrollReset: true });
  }

  return (
    <div className="home-page">
      <h1 className="page-title">Pokémon</h1>

      <div className="filters">
        <div className="field">
          <label htmlFor="search-filter">Search</label>
          <input
            id="search-filter"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={data.filters.type}
            onChange={(event) => updateFilter("type", event.target.value)}
          >
            <option value="">All types</option>
            {data.types.map((type: { name: string; english: string }) => (
              <option key={type.name} value={type.name}>
                {type.english}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={data.filters.generation}
            onChange={(event) => updateFilter("generation", event.target.value)}
          >
            <option value="">All generations</option>
            {data.generations.map((generation: { name: string; english: string }) => (
              <option key={generation.name} value={generation.name}>
                {generation.english}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="count">{data.count} Pokémon</p>

      {data.cards.length ? (
        <>
          <PokemonCards cards={data.cards} showTypes />
          <div className="pagination">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            {data.page > 1 ? (
              <Link to={searchFor(data.filters, data.page - 1)}>Previous page</Link>
            ) : null}
            {data.page < data.totalPages ? (
              <Link to={searchFor(data.filters, data.page + 1)}>Next page</Link>
            ) : null}
          </div>
        </>
      ) : (
        <p className="empty">No Pokémon found</p>
      )}
    </div>
  );
}
