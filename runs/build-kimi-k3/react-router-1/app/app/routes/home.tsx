import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getGenerations, getSpeciesIndex, getSpeciesTypeMap, getTypes, idFromUrl, mediaBase } from "../lib/api.server";
import { englishName, humanize } from "../lib/format";
import { PokemonCard } from "../components/PokemonCard";

const PAGE_SIZE = 48;

export async function loader() {
  const [speciesIndex, types, generations, typeMap] = await Promise.all([
    getSpeciesIndex(),
    getTypes(),
    getGenerations(),
    getSpeciesTypeMap(),
  ]);
  return {
    spriteBase: mediaBase(),
    species: speciesIndex.entries.map((e) => ({
      id: e.id,
      name: e.name,
      types: (typeMap.get(e.id) ?? []).map((t) => t.type),
    })),
    typeOptions: types.map((t) => ({ name: t.name, label: englishName(t) })),
    generationOptions: generations.map((g) => ({
      name: g.name,
      label: englishName(g),
      species: (g.pokemon_species ?? []).map((r: any) => idFromUrl(r.url)),
    })),
  };
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function Home({ loaderData }: { loaderData: LoaderData }) {
  const { species, typeOptions, generationOptions, spriteBase } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const qParam = searchParams.get("q") ?? "";
  const typeParam = searchParams.get("type") ?? "";
  const generationParam = searchParams.get("generation") ?? "";

  // Local state for the search box so it feels instant; the URL (and results)
  // follow after a short debounce.
  const [q, setQ] = useState(qParam);
  const lastSubmitted = useRef(qParam);
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Keep the box in sync with navigations that didn't come from typing
    // (e.g. back/forward).
    if (qParam !== lastSubmitted.current) {
      lastSubmitted.current = qParam;
      setQ(qParam);
    }
  }, [qParam]);

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  function onSearchChange(value: string) {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      lastSubmitted.current = value;
      const next = new URLSearchParams(searchParamsRef.current);
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    }, 150);
  }

  function onSelectChange(key: "type" | "generation", value: string) {
    const next = new URLSearchParams(searchParamsRef.current);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  const filtered = useMemo(() => {
    const query = qParam.trim().toLowerCase();
    const generation = generationOptions.find((g) => g.name === generationParam);
    const generationSet = generation ? new Set(generation.species) : null;
    return species.filter((s) => {
      if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
      if (typeParam && !s.types.includes(typeParam)) return false;
      if (generationSet && !generationSet.has(s.id)) return false;
      return true;
    });
  }, [species, generationOptions, qParam, typeParam, generationParam]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const parsed = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Math.min(Math.max(1, Number.isFinite(parsed) ? parsed : 1), totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(p: number): string {
    const next = new URLSearchParams(searchParamsRef.current);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const s = next.toString();
    return s ? `?${s}` : "?";
  }

  return (
    <>
      <title>Pokédex</title>
      <h1>Pokémon</h1>
      <div className="controls">
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input id="search" type="search" value={q} onChange={(e) => onSearchChange(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="type-filter">Type</label>
          <select id="type-filter" value={typeParam} onChange={(e) => onSelectChange("type", e.target.value)}>
            <option value="">All types</option>
            {typeOptions.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={generationParam}
            onChange={(e) => onSelectChange("generation", e.target.value)}
          >
            <option value="">All generations</option>
            {generationOptions.map((g) => (
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
        <ul className="card-grid">
          {pageItems.map((s) => (
            <li key={s.id}>
              <PokemonCard species={s} spriteBase={spriteBase} showTypes />
            </li>
          ))}
        </ul>
      )}
      <div className="pagination">
        <span className="page-status">
          Page {page} of {totalPages}
        </span>
        {page > 1 ? (
          <Link to={pageHref(page - 1)} className="page-link">
            Previous page
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link to={pageHref(page + 1)} className="page-link">
            Next page
          </Link>
        ) : null}
      </div>
    </>
  );
}
