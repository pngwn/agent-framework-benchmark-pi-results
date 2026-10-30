import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams } from "@solidjs/router";
import { For, Show, createEffect, createSignal, on, onCleanup } from "solid-js";
import PokemonGrid from "~/components/PokemonGrid";
import { homeQuery } from "~/lib/queries";

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = createSignal(params.q ?? "");
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  createEffect(
    on(
      () => params.q,
      (next) => setSearch(next ?? ""),
    ),
  );

  onCleanup(() => clearTimeout(searchTimer));

  const pageNumber = () => {
    const parsed = Number(params.page ?? 1);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
  };

  const data = createAsync(() =>
    homeQuery({
      q: params.q ?? "",
      type: params.type ?? "",
      generation: params.generation ?? "",
      page: pageNumber(),
    }),
  );

  const updateSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      setParams(
        {
          q: value.trim() ? value : undefined,
          page: undefined,
        },
        { replace: true },
      );
    }, 180);
  };

  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.type) query.set("type", params.type);
    if (params.generation) query.set("generation", params.generation);
    if (page > 1) query.set("page", String(page));
    const searchString = query.toString();
    return searchString ? `/?${searchString}` : "/";
  };

  return (
    <>
      <Title>Pokédex</Title>
      <main class="page">
        <h1>Pokémon</h1>

        <div class="filters">
          <div class="field search-field">
            <label for="search-input">Search</label>
            <input
              id="search-input"
              type="search"
              value={search()}
              onInput={(event) => updateSearch(event.currentTarget.value)}
            />
          </div>
          <div class="field">
            <label for="type-filter">Type</label>
            <select
              id="type-filter"
              value={params.type ?? ""}
              onChange={(event) =>
                setParams({
                  type: event.currentTarget.value || undefined,
                  page: undefined,
                })
              }
            >
              <option value="">All types</option>
              <For each={data()?.types ?? []}>
                {(type) => (
                  <option value={type.name} selected={params.type === type.name}>
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
              value={params.generation ?? ""}
              onChange={(event) =>
                setParams({
                  generation: event.currentTarget.value || undefined,
                  page: undefined,
                })
              }
            >
              <option value="">All generations</option>
              <For each={data()?.generations ?? []}>
                {(generation) => (
                  <option
                    value={generation.name}
                    selected={params.generation === generation.name}
                  >
                    {generation.label}
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        <Show when={data()}>
          {(home) => (
            <>
              <p class="result-count">{home().count} Pokémon</p>
              <Show
                when={home().count > 0}
                fallback={<p class="empty-message">No Pokémon found</p>}
              >
                <PokemonGrid cards={home().cards} showTypes />
                <div class="pagination">
                  <span>
                    Page {home().page} of {home().totalPages}
                  </span>
                  <Show when={home().page > 1}>
                    <A href={pageHref(home().page - 1)}>Previous page</A>
                  </Show>
                  <Show when={home().page < home().totalPages}>
                    <A href={pageHref(home().page + 1)}>Next page</A>
                  </Show>
                </div>
              </Show>
            </>
          )}
        </Show>
      </main>
    </>
  );
}
