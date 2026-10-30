import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import PokemonCards, { CountText } from "~/components/PokemonCards";
import { getHomeFilters, getHomeList } from "~/lib/queries";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

const SEARCH_DEBOUNCE_MS = 150;

export const route = {
  preload: ({ location }) => {
    const query = new URLSearchParams(location.search);
    getHomeFilters();
    getHomeList(query.get("q") ?? "", query.get("type") ?? "", query.get("generation") ?? "", Number(query.get("page")) || 1);
  },
} satisfies RouteDefinition;

export default function Home() {
  const [params, setParams] = useSearchParams();
  const q = () => first(params.q);
  const type = () => first(params.type);
  const generation = () => first(params.generation);
  const page = () => Number(first(params.page)) || 1;

  const filters = createAsync(() => getHomeFilters());
  const list = createAsync(() => getHomeList(q(), type(), generation(), page()));

  // The search box keeps its own text so typing stays smooth; the URL follows after a short pause.
  const [text, setText] = createSignal(q());
  let timer: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on(
      q,
      (value) => {
        if (timer === undefined) setText(value);
      },
      { defer: true },
    ),
  );
  onCleanup(() => clearTimeout(timer));

  const flushSearch = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const onSearch = (value: string) => {
    setText(value);
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      setParams({ q: value.trim() ? value : undefined, page: undefined }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
  };

  const setFilter = (key: "type" | "generation", value: string) => {
    flushSearch();
    setParams({ q: text().trim() ? text() : undefined, [key]: value || undefined, page: undefined });
  };

  const pageHref = (n: number) => {
    const query = new URLSearchParams();
    if (q()) query.set("q", q());
    if (type()) query.set("type", type());
    if (generation()) query.set("generation", generation());
    if (n > 1) query.set("page", String(n));
    const search = query.toString();
    return search ? `/?${search}` : "/";
  };

  return (
    <>
      <Title>Pokédex</Title>
      <h1 class="page-title">Pokémon</h1>
      <form class="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div class="field field--search">
          <label for="filter-search">Search</label>
          <input
            id="filter-search"
            type="search"
            autocomplete="off"
            value={text()}
            onInput={(e) => onSearch(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="filter-type">Type</label>
          <select id="filter-type" onChange={(e) => setFilter("type", e.currentTarget.value)}>
            <option value="" selected={!type()}>
              All types
            </option>
            <For each={filters()?.types}>
              {(t) => (
                <option value={t.name} selected={type() === t.name}>
                  {t.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="field">
          <label for="filter-generation">Generation</label>
          <select id="filter-generation" onChange={(e) => setFilter("generation", e.currentTarget.value)}>
            <option value="" selected={!generation()}>
              All generations
            </option>
            <For each={filters()?.generations}>
              {(g) => (
                <option value={g.name} selected={generation() === g.name}>
                  {g.label}
                </option>
              )}
            </For>
          </select>
        </div>
      </form>

      <Show when={list()}>
        {(result) => (
          <Show when={result().count > 0} fallback={<p class="count">No Pokémon found</p>}>
            <CountText count={result().count} />
            <PokemonCards cards={result().items} />
            <nav class="pagination" aria-label="Pagination">
              <Show when={result().page > 1}>
                <A href={pageHref(result().page - 1)}>Previous page</A>
              </Show>
              <span>{`Page ${result().page} of ${result().pages}`}</span>
              <Show when={result().page < result().pages}>
                <A href={pageHref(result().page + 1)}>Next page</A>
              </Show>
            </nav>
          </Show>
        )}
      </Show>
    </>
  );
}
