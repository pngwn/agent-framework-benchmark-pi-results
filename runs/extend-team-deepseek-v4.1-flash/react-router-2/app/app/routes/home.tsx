import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { getIndex, speciesCard } from "../lib/api.server";
import { PokemonCards } from "../components/PokemonCards";
import type { Card } from "../lib/types";

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 150;

type Filters = { q: string; type: string; generation: string };

/** Query string for the given filters and page, leaving out empty and default values. */
function queryString(filters: Filters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const index = await getIndex();

  const q = params.get("q")?.trim() ?? "";
  const type = index.types.some((t) => t.name === params.get("type")) ? params.get("type")! : "";
  const generation = index.generations.find((g) => g.name === params.get("generation"));

  const needle = q.toLowerCase();
  const matches = index.species.filter(
    (s) =>
      (!needle || s.label.toLowerCase().includes(needle)) &&
      (!type || index.speciesTypes.get(s.id)?.includes(type)) &&
      (!generation || generation.speciesIds.has(s.id)),
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
  const cards = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((s) => speciesCard(index, s.id, true))
    .filter((c): c is Card => c !== null);

  return {
    filters: { q, type, generation: generation?.name ?? "" } satisfies Filters,
    count: matches.length,
    page,
    totalPages,
    cards,
    types: index.types,
    generations: index.generations.map(({ name, label }) => ({ name, label })),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { filters, count, page, totalPages, cards, types, generations } = loaderData;
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const generationRef = useRef<HTMLSelectElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const currentFilters = (): Filters => ({
    q: searchRef.current?.value ?? "",
    type: typeRef.current?.value ?? "",
    generation: generationRef.current?.value ?? "",
  });

  const applyFilters = (replace: boolean) => {
    clearTimeout(debounce.current);
    navigate({ search: queryString(currentFilters()) }, { replace, preventScrollReset: true });
  };

  // Input made before hydration finished didn't fire React handlers; apply it now.
  useEffect(() => {
    const current = currentFilters();
    if (current.q.trim() !== filters.q || current.type !== filters.type || current.generation !== filters.generation) {
      applyFilters(true);
    }
    return () => clearTimeout(debounce.current);
  }, []);

  // Keep the controls in step with the URL (back/forward, links), without clobbering typing.
  useEffect(() => {
    if (searchRef.current && document.activeElement !== searchRef.current) searchRef.current.value = filters.q;
    if (typeRef.current) typeRef.current.value = filters.type;
    if (generationRef.current) generationRef.current.value = filters.generation;
  }, [filters.q, filters.type, filters.generation]);

  return (
    <>
      <title>Pokédex</title>
      <h1>Pokémon</h1>
      <form
        className="filters"
        role="search"
        action="/"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(false);
        }}
      >
        <div className="field filters__search">
          <label htmlFor="search">Search</label>
          <input
            ref={searchRef}
            id="search"
            type="search"
            name="q"
            defaultValue={filters.q}
            autoComplete="off"
            onChange={() => {
              clearTimeout(debounce.current);
              debounce.current = setTimeout(() => applyFilters(true), SEARCH_DEBOUNCE_MS);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select ref={typeRef} id="type" name="type" defaultValue={filters.type} onChange={() => applyFilters(false)}>
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
            ref={generationRef}
            id="generation"
            name="generation"
            defaultValue={filters.generation}
            onChange={() => applyFilters(false)}
          >
            <option value="">All generations</option>
            {generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {count === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <p className="count">{count} Pokémon</p>
          <PokemonCards cards={cards} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <Link to={queryString(filters, page - 1) || "/"}>
                Previous page
              </Link>
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && <Link to={queryString(filters, page + 1)}>Next page</Link>}
          </nav>
        </>
      )}
    </>
  );
}
