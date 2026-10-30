import { A, createAsync, useSearchParams } from "@solidjs/router";
import { Show, For, createMemo } from "solid-js";
import { PageTitle, PokemonCard } from "~/components";
import { getHomeData } from "~/lib/api";

const PAGE_SIZE = 48;

export default function HomePage() {
  const data = createAsync(() => getHomeData());
  return (
    <Show
      when={data()}
      fallback={
        <main class="page">
          <PageTitle text="Pokédex" />
          <h1>Pokémon</h1>
        </main>
      }
    >
      <HomeView data={() => data()!} />
    </Show>
  );
}

function HomeView(props: { data: () => any }) {
  const [params, setParams] = useSearchParams();

  const textParam = (key: string) => {
    const value = (params as any)[key];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };

  const q = () => textParam("q");
  const typeFilter = () => textParam("type");
  const generationFilter = () => textParam("generation");
  const requestedPage = () => {
    const value = parseInt(textParam("page"), 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
  };

  const typeLabels = createMemo(
    () =>
      new Map<string, string>(
        props.data().types.map((type: any) => [type.name, type.label]),
      ),
  );

  const filtered = createMemo(() => {
    const data = props.data();
    let species = data.species as any[];
    const type = typeFilter();
    const generation = generationFilter();
    const search = q().trim().toLowerCase();

    if (type) {
      species = species.filter(entry => entry.types.includes(type));
    }
    if (generation) {
      const record = data.generations.find(
        (entry: any) => entry.name === generation,
      );
      if (record) {
        const ids = new Set<number>(record.speciesIds);
        species = species.filter(entry => ids.has(entry.id));
      } else {
        species = [];
      }
    }
    if (search) {
      species = species.filter(entry =>
        entry.humanized.toLowerCase().includes(search),
      );
    }
    return species;
  });

  const totalPages = () => Math.max(1, Math.ceil(filtered().length / PAGE_SIZE));
  const currentPage = () => Math.min(requestedPage(), totalPages());
  const visible = createMemo(() => {
    const start = (currentPage() - 1) * PAGE_SIZE;
    return filtered().slice(start, start + PAGE_SIZE);
  });

  const hrefForPage = (page: number) => {
    const query = new URLSearchParams();
    if (q()) query.set("q", q());
    if (typeFilter()) query.set("type", typeFilter());
    if (generationFilter()) query.set("generation", generationFilter());
    if (page > 1) query.set("page", String(page));
    const search = query.toString();
    return search ? `/?${search}` : "/";
  };

  const updateFilter = (patch: Record<string, string | undefined>) => {
    setParams({ ...patch, page: undefined });
  };

  return (
    <main class="page">
      <PageTitle text="Pokédex" />
      <h1>Pokémon</h1>

      <div class="filters">
        <div class="field field-search">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            value={q()}
            autocomplete="off"
            onInput={event =>
              updateFilter({ q: event.currentTarget.value || undefined })
            }
          />
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            value={typeFilter()}
            onChange={event =>
              updateFilter({ type: event.currentTarget.value || undefined })
            }
          >
            <option value="" selected={!typeFilter()}>All types</option>
            <For each={props.data().types}>
              {(type: any) => (
                <option value={type.name} selected={typeFilter() === type.name}>
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
            value={generationFilter()}
            onChange={event =>
              updateFilter({
                generation: event.currentTarget.value || undefined,
              })
            }
          >
            <option value="" selected={!generationFilter()}>All generations</option>
            <For each={props.data().generations}>
              {(generation: any) => (
                <option
                  value={generation.name}
                  selected={generationFilter() === generation.name}
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
          <For each={visible()}>
            {(entry: any) => (
              <PokemonCard
                card={entry}
                showTypes
                typeLabels={typeLabels()}
              />
            )}
          </For>
        </ul>

        <nav class="pagination" aria-label="Pagination">
          <Show when={currentPage() > 1}>
            <A href={hrefForPage(currentPage() - 1)}>Previous page</A>
          </Show>
          <span>
            Page {currentPage()} of {totalPages()}
          </span>
          <Show when={currentPage() < totalPages()}>
            <A href={hrefForPage(currentPage() + 1)}>Next page</A>
          </Show>
        </nav>
      </Show>
    </main>
  );
}
