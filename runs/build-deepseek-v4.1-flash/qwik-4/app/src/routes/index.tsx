import { component$, useComputed$, useSignal } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getHomeCatalog, parseHomeQuery } from "../lib/data";
import { PokemonCard } from "../components/ui";

const PER_PAGE = 48;

export const useHomeData = routeLoader$(async ({ url }) => {
  const catalog = await getHomeCatalog();
  return {
    ...catalog,
    initial: parseHomeQuery(url),
  };
});

function homeUrl(q: string, type: string, generation: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (generation) params.set("generation", generation);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default component$(() => {
  const data = useHomeData();
  const query = useSignal(data.value.initial.q);
  const typeFilter = useSignal(data.value.initial.type);
  const generationFilter = useSignal(data.value.initial.generation);
  const page = useSignal(data.value.initial.page);

  const matches = useComputed$(() => {
    const needle = query.value.trim().toLowerCase();
    return data.value.entries.filter((entry) => {
      if (needle && !entry.displayName.toLowerCase().includes(needle)) return false;
      if (typeFilter.value && !entry.types.includes(typeFilter.value)) return false;
      if (generationFilter.value && entry.generation !== generationFilter.value) return false;
      return true;
    });
  });

  const totalPages = useComputed$(() => Math.max(1, Math.ceil(matches.value.length / PER_PAGE)));
  const currentPage = useComputed$(() => Math.min(Math.max(1, page.value), totalPages.value));
  const visible = useComputed$(() => {
    const start = (currentPage.value - 1) * PER_PAGE;
    return matches.value.slice(start, start + PER_PAGE);
  });

  return (
    <>
      <h1>Pokémon</h1>

      <div class="filters">
        <div class="field">
          <label for="pokemon-search">Search</label>
          <input
            id="pokemon-search"
            type="search"
            value={query.value}
            onInput$={(event) => {
              query.value = (event.target as HTMLInputElement).value;
              page.value = 1;
              window.history.replaceState(
                null,
                "",
                homeUrl(query.value, typeFilter.value, generationFilter.value, page.value),
              );
            }}
          />
        </div>
        <div class="field">
          <label for="pokemon-type">Type</label>
          <select
            id="pokemon-type"
            value={typeFilter.value}
            onChange$={(event) => {
              typeFilter.value = (event.target as HTMLSelectElement).value;
              page.value = 1;
              window.history.replaceState(
                null,
                "",
                homeUrl(query.value, typeFilter.value, generationFilter.value, page.value),
              );
            }}
          >
            <option value="" selected={typeFilter.value === ""}>All types</option>
            {data.value.types.map((type) => (
              <option key={type.name} value={type.name} selected={typeFilter.value === type.name}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="pokemon-generation">Generation</label>
          <select
            id="pokemon-generation"
            value={generationFilter.value}
            onChange$={(event) => {
              generationFilter.value = (event.target as HTMLSelectElement).value;
              page.value = 1;
              window.history.replaceState(
                null,
                "",
                homeUrl(query.value, typeFilter.value, generationFilter.value, page.value),
              );
            }}
          >
            <option value="" selected={generationFilter.value === ""}>All generations</option>
            {data.value.generations.map((generation) => (
              <option key={generation.name} value={generation.name} selected={generationFilter.value === generation.name}>
                {generation.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="result-count">{matches.value.length} Pokémon</p>

      {matches.value.length === 0 ? (
        <p class="no-results">No Pokémon found</p>
      ) : (
        <>
          <ul class="card-grid">
            {visible.value.map((entry) => (
              <PokemonCard
                key={entry.id}
                card={{
                  id: entry.id,
                  name: entry.name,
                  displayName: entry.displayName,
                  sprite: entry.sprite,
                  types: entry.types,
                }}
                showTypes
              />
            ))}
          </ul>
          <nav class="pagination" aria-label="Pagination">
            <span class="page-label">
              Page {currentPage.value} of {totalPages.value}
            </span>
            {currentPage.value > 1 ? (
              <a href={homeUrl(query.value, typeFilter.value, generationFilter.value, currentPage.value - 1)}>
                Previous page
              </a>
            ) : null}
            {currentPage.value < totalPages.value ? (
              <a href={homeUrl(query.value, typeFilter.value, generationFilter.value, currentPage.value + 1)}>
                Next page
              </a>
            ) : null}
          </nav>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: "Pokédex",
};
