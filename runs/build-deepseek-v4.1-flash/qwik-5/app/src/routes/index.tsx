import { component$, useSignal, useTask$, isBrowser } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { PokemonCards } from "../components/ui";
import {
  cardsForSpecies,
  getGenerationCatalog,
  getSpeciesList,
  getTypeCatalog,
} from "../lib/api";

const PAGE_SIZE = 48;

function pageHref(filters: {
  q: string;
  type: string;
  generation: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.size ? `/?${params.toString()}` : "/";
}

export const useHomeData = routeLoader$(async ({ url }) => {
  const [species, typeCatalog, generationCatalog] = await Promise.all([
    getSpeciesList(),
    getTypeCatalog(),
    getGenerationCatalog(),
  ]);

  const q = (url.searchParams.get("q") ?? "").trim();
  const requestedType = url.searchParams.get("type") ?? "";
  const typeName = typeCatalog.types.some((type) => type.name === requestedType)
    ? requestedType
    : "";
  const requestedGeneration = url.searchParams.get("generation") ?? "";
  const generationName = generationCatalog.generations.some(
    (generation) => generation.name === requestedGeneration,
  )
    ? requestedGeneration
    : "";

  let filtered = species;
  if (typeName) {
    filtered = filtered.filter((speciesEntry) =>
      (typeCatalog.pokemonBySpecies.get(speciesEntry.id) ?? []).some(
        (type) => type.name === typeName,
      ),
    );
  }
  if (generationName) {
    filtered = filtered.filter(
      (speciesEntry) =>
        generationCatalog.generationBySpecies.get(speciesEntry.id) === generationName,
    );
  }
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((speciesEntry) =>
      speciesEntry.display.toLowerCase().includes(needle),
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    q,
    typeName,
    generationName,
    page,
    total,
    totalPages,
    items: cardsForSpecies(pageItems, typeCatalog.pokemonBySpecies),
    types: typeCatalog.types,
    generations: generationCatalog.generations,
  };
});

export default component$(() => {
  const data = useHomeData();
  const navigate = useNavigate();
  const search = useSignal(data.value.q);

  useTask$(({ track, cleanup }) => {
    const value = track(search);
    if (!isBrowser) return;
    if (value === data.value.q) return;
    const timer = setTimeout(() => {
      void navigate(
        pageHref({
          q: search.value.trim(),
          type: data.value.typeName,
          generation: data.value.generationName,
          page: 1,
        }),
        { replaceState: true },
      );
    }, 250);
    cleanup(() => clearTimeout(timer));
  });

  const current = () => ({
    q: data.value.q,
    type: data.value.typeName,
    generation: data.value.generationName,
    page: data.value.page,
  });

  return (
    <>
      <h1>Pokémon</h1>

      <div class="home-controls">
        <div class="form-field search-field">
          <label for="search">Search</label>
          <input
            id="search"
            name="q"
            type="search"
            value={search.value}
            onInput$={(event) => {
              search.value = (event.target as HTMLInputElement).value;
            }}
          />
        </div>
        <div class="form-field">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            name="type"
            value={data.value.typeName}
            onChange$={(event) => {
              const value = (event.target as HTMLSelectElement).value;
              void navigate(
                pageHref({
                  q: search.value.trim(),
                  type: value,
                  generation: data.value.generationName,
                  page: 1,
                }),
              );
            }}
          >
            <option value="">All types</option>
            {data.value.types.map((type) => (
              <option key={type.name} value={type.name} selected={type.name === data.value.typeName}>
                {type.english}
              </option>
            ))}
          </select>
        </div>
        <div class="form-field">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            name="generation"
            value={data.value.generationName}
            onChange$={(event) => {
              const value = (event.target as HTMLSelectElement).value;
              void navigate(
                pageHref({
                  q: search.value.trim(),
                  type: data.value.typeName,
                  generation: value,
                  page: 1,
                }),
              );
            }}
          >
            <option value="">All generations</option>
            {data.value.generations.map((generation) => (
              <option
                key={generation.name}
                value={generation.name}
                selected={generation.name === data.value.generationName}
              >
                {generation.english}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="result-count">{data.value.total} Pokémon</p>

      {data.value.total === 0 ? (
        <p class="empty-results">No Pokémon found</p>
      ) : (
        <PokemonCards cards={data.value.items} showTypes />
      )}

      <nav class="pagination" aria-label="Pagination">
        <span class="page-of">
          Page {data.value.page} of {data.value.totalPages}
        </span>
        {data.value.page > 1 ? (
          <Link href={pageHref({ ...current(), page: data.value.page - 1 })}>
            Previous page
          </Link>
        ) : null}
        {data.value.page < data.value.totalPages ? (
          <Link href={pageHref({ ...current(), page: data.value.page + 1 })}>
            Next page
          </Link>
        ) : null}
      </nav>
    </>
  );
});

export const head: DocumentHead = {
  title: "Pokédex",
};
