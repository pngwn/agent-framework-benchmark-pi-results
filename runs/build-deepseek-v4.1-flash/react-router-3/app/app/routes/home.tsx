import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PokemonCardList } from "../components/ui";
import {
  getGenerationEntries,
  getResource,
  getSpeciesCardMap,
  getSpeciesIndex,
  getTypeDisplayMap,
  getTypeEntries,
  refId,
} from "../lib/data.server";
import { humanize } from "../lib/format";

const PAGE_SIZE = 48;

export function meta() {
  return [{ title: "Pokédex" }];
}

export async function loader({ request }: any) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const type = url.searchParams.get("type") ?? "";
  const generation = url.searchParams.get("generation") ?? "";
  const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const [species, typeEntries, generationEntries] = await Promise.all([
    getSpeciesIndex(),
    getTypeEntries(),
    getGenerationEntries(),
  ]);

  let filtered = species;

  if (type) {
    const typeEntry = typeEntries.find((entry) => entry.name === type);
    if (!typeEntry) {
      filtered = [];
    } else {
      const record = await getResource("type", type);
      const ids = new Set(
        (record?.pokemon ?? [])
          .map((entry: any) => refId(entry.pokemon))
          .filter((id: number | null): id is number => id !== null && id <= 10000),
      );
      filtered = filtered.filter((entry) => ids.has(entry.id));
    }
  }

  if (generation) {
    const record = await getResource("generation", generation);
    const ids = new Set(
      (record?.pokemon_species ?? [])
        .map((entry: any) => refId(entry))
        .filter((id: number | null): id is number => id !== null),
    );
    filtered = filtered.filter((entry) => ids.has(entry.id));
  }

  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((entry) =>
      humanize(entry.name).toLowerCase().includes(needle),
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageSpecies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [cardMap, typeNames] = [await getSpeciesCardMap(), getTypeDisplayMap(typeEntries)];

  const cards = (
    await Promise.all(
      pageSpecies.map(async (entry) => {
        const base = cardMap.get(entry.id);
        if (!base) return null;
        const pokemon = await getResource("pokemon", entry.id);
        const types = (pokemon?.types ?? [])
          .slice()
          .sort((a: any, b: any) => a.slot - b.slot)
          .map((entry: any) => ({
            name: entry.type.name,
            displayName: typeNames.get(entry.type.name) ?? humanize(entry.type.name),
          }));
        return {
          ...base,
          sprite: pokemon?.sprites?.front_default ?? base.sprite,
          types,
        };
      }),
    )
  ).filter(Boolean);

  return {
    cards,
    total,
    page,
    totalPages,
    q,
    type,
    generation,
    typeEntries,
    generationEntries,
  };
}

export default function Home({ loaderData }: any) {
  const {
    cards,
    total,
    page,
    totalPages,
    q: qFromUrl,
    type,
    generation,
    typeEntries,
    generationEntries,
  } = loaderData;

  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(qFromUrl);

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    if (q === qFromUrl) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = q.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [q, qFromUrl, searchParams, setSearchParams]);

  const updateFilter = (key: "type" | "generation", value: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = q.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  };

  const pageHref = (target: number) => {
    const next = new URLSearchParams(searchParams);
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const search = next.toString();
    return `/${search ? `?${search}` : ""}`;
  };

  return (
    <>
      <h1>Pokémon</h1>

      <div className="filters">
        <div className="field">
          <label className="field-label" htmlFor="search">
            Search
          </label>
          <input
            id="search"
            type="search"
            className="text-input"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="type-filter">
            Type
          </label>
          <select
            id="type-filter"
            className="select-input"
            value={type}
            onChange={(event) => updateFilter("type", event.target.value)}
          >
            <option value="">All types</option>
            {typeEntries.map((entry: any) => (
              <option key={entry.name} value={entry.name}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="generation-filter">
            Generation
          </label>
          <select
            id="generation-filter"
            className="select-input"
            value={generation}
            onChange={(event) => updateFilter("generation", event.target.value)}
          >
            <option value="">All generations</option>
            {generationEntries.map((entry: any) => (
              <option key={entry.name} value={entry.name}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="result-count">{total} Pokémon</p>

      {cards.length ? (
        <>
          <PokemonCardList cards={cards} showTypes />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 ? <Link to={pageHref(page - 1)}>Previous page</Link> : null}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? <Link to={pageHref(page + 1)}>Next page</Link> : null}
          </nav>
        </>
      ) : (
        <p className="empty-message">No Pokémon found</p>
      )}
    </>
  );
}
