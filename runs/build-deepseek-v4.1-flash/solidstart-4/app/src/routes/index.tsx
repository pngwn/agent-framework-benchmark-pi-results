import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import PokemonCard from "~/components/PokemonCard";
import { getHomeData, type SpeciesSummary } from "~/lib/queries";

const PAGE_SIZE = 48;

function paramValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function HomeContent(props: {
  data: {
    species: SpeciesSummary[];
    types: { name: string; label: string }[];
    generations: { name: string; label: string; order: number }[];
  };
}) {
  const [params, setParams] = useSearchParams<{
    q?: string;
    type?: string;
    generation?: string;
    page?: string;
  }>();

  const [searchText, setSearchText] = createSignal(paramValue(params.q));
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let searchInput: HTMLInputElement | undefined;
  let lastUrlSearch = paramValue(params.q);

  const currentType = () => paramValue(params.type);
  const currentGeneration = () => paramValue(params.generation);

  const navigateWith = (state: {
    q?: string;
    type?: string;
    generation?: string;
    page?: number;
  }) => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    setParams({
      q: state.q?.trim() || undefined,
      type: state.type || undefined,
      generation: state.generation || undefined,
      page: state.page && state.page > 1 ? state.page : undefined,
    });
  };

  const onSearchInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    const value = event.currentTarget.value;
    setSearchText(value);
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      navigateWith({
        q: value,
        type: currentType(),
        generation: currentGeneration(),
      });
    }, 250);
  };

  createEffect(() => {
    const urlSearch = paramValue(params.q);
    if (urlSearch === lastUrlSearch) return;
    lastUrlSearch = urlSearch;
    if (debounceTimer !== undefined) return;
    setSearchText(urlSearch);
    if (searchInput && searchInput.value !== urlSearch) {
      searchInput.value = urlSearch;
    }
  });

  onCleanup(() => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
  });

  const filtered = createMemo(() => {
    const query = searchText().trim().toLowerCase();
    const type = currentType();
    const generation = currentGeneration();

    return props.data.species.filter((species) => {
      if (query && !species.label.toLowerCase().includes(query)) return false;
      if (type && !species.types.some((entry) => entry.name === type)) return false;
      if (generation && species.generation !== generation) return false;
      return true;
    });
  });

  const totalPages = createMemo(() => Math.max(1, Math.ceil(filtered().length / PAGE_SIZE)));
  const currentPage = createMemo(() => {
    const requested = Number.parseInt(paramValue(params.page), 10) || 1;
    return Math.min(Math.max(requested, 1), totalPages());
  });

  const pageSpecies = createMemo(() => {
    const start = (currentPage() - 1) * PAGE_SIZE;
    return filtered().slice(start, start + PAGE_SIZE);
  });

  const pageHref = (page: number) => {
    const search = new URLSearchParams();
    const query = searchText().trim();
    if (query) search.set("q", query);
    if (currentType()) search.set("type", currentType());
    if (currentGeneration()) search.set("generation", currentGeneration());
    if (page > 1) search.set("page", String(page));
    const suffix = search.toString();
    return suffix ? `/?${suffix}` : "/";
  };

  return (
    <>
      <h1>Pokémon</h1>

      <div class="filters">
        <div class="field search-field">
          <label for="search">Search</label>
          <input
            id="search"
            ref={searchInput}
            type="search"
            attr:value={paramValue(params.q)}
            onInput={onSearchInput}
            autocomplete="off"
          />
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            value={currentType()}
            onChange={(event) =>
              navigateWith({
                q: searchText(),
                type: event.currentTarget.value,
                generation: currentGeneration(),
              })
            }
          >
            <option value="" selected={currentType() === ""}>
              All types
            </option>
            <For each={props.data.types}>
              {(type) => (
                <option value={type.name} selected={currentType() === type.name}>
                  {type.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="field">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={currentGeneration()}
            onChange={(event) =>
              navigateWith({
                q: searchText(),
                type: currentType(),
                generation: event.currentTarget.value,
              })
            }
          >
            <option value="" selected={currentGeneration() === ""}>
              All generations
            </option>
            <For each={props.data.generations}>
              {(generation) => (
                <option
                  value={generation.name}
                  selected={currentGeneration() === generation.name}
                >
                  {generation.label}
                </option>
              )}
            </For>
          </select>
        </div>
      </div>

      <p class="result-count">{filtered().length} Pokémon</p>

      <Show
        when={filtered().length > 0}
        fallback={<p class="empty-message">No Pokémon found</p>}
      >
        <ul class="pokemon-grid">
          <For each={pageSpecies()}>
            {(species) => (
              <PokemonCard species={species} types={species.types} showTypes />
            )}
          </For>
        </ul>
      </Show>

      <div class="pagination">
        <Show when={currentPage() > 1}>
          <A href={pageHref(currentPage() - 1)}>Previous page</A>
        </Show>
        <span>
          Page {currentPage()} of {totalPages()}
        </span>
        <Show when={currentPage() < totalPages()}>
          <A href={pageHref(currentPage() + 1)}>Next page</A>
        </Show>
      </div>
    </>
  );
}

export default function Home() {
  const data = createAsync(() => getHomeData());

  return (
    <>
      <Title>Pokédex</Title>
      <Show when={data()}>{(home) => <HomeContent data={home()} />}</Show>
    </>
  );
}
