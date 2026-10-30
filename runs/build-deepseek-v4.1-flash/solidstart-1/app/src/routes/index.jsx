import { Title } from "@solidjs/meta";
import { A, createAsync, query, useSearchParams } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";
import PokemonCard from "~/components/PokemonCard";
import { loadHomeData } from "~/server/data";

const getHomeData = query(loadHomeData, "home-data");
const PAGE_SIZE = 48;

function cleanParams(params) {
  const next = {};
  for (const key of ["q", "type", "generation", "page"]) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") next[key] = String(value);
  }
  return next;
}

function pageHref(params, page) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  if (params.generation) search.set("generation", params.generation);
  if (page > 1) search.set("page", String(page));
  const queryString = search.toString();
  return queryString ? `/?${queryString}` : "/";
}

export default function Home() {
  const data = createAsync(() => getHomeData());
  const [searchParams, setSearchParams] = useSearchParams();

  const q = () => searchParams.q ?? "";
  const type = () => searchParams.type ?? "";
  const generation = () => searchParams.generation ?? "";

  const filtered = createMemo(() => {
    const all = data()?.species ?? [];
    const needle = q().trim().toLowerCase();
    return all.filter((pokemon) => {
      if (needle && !pokemon.displayName.toLowerCase().includes(needle)) return false;
      if (type() && !pokemon.types?.some((item) => item.name === type())) return false;
      if (generation() && pokemon.generation !== generation()) return false;
      return true;
    });
  });

  const totalPages = () => Math.max(1, Math.ceil(filtered().length / PAGE_SIZE));
  const requestedPage = () => {
    const value = Number.parseInt(searchParams.page ?? "1", 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
  };
  const page = () => Math.min(requestedPage(), totalPages());
  const pageItems = () =>
    filtered().slice((page() - 1) * PAGE_SIZE, page() * PAGE_SIZE);

  const update = (patch, resetPage = true) => {
    const next = { ...cleanParams(searchParams), ...patch };
    if (resetPage) next.page = "";
    for (const key of ["q", "type", "generation", "page"]) {
      if (!(key in next)) next[key] = "";
    }
    setSearchParams(next, { replace: true });
  };

  const typeValue = () => {
    const selected = type();
    return data()?.types.some((item) => item.name === selected) ? selected : "";
  };
  const generationValue = () => {
    const selected = generation();
    return data()?.generations.some((item) => item.name === selected) ? selected : "";
  };

  return (
    <Show when={data()} fallback={<main class="container"><p>Loading…</p></main>}>
      <Title>Pokédex</Title>
      <main class="container">
        <h1>Pokémon</h1>

        <div class="filter-grid">
          <div class="control control-search">
            <label for="pokemon-search">Search</label>
            <input
              id="pokemon-search"
              type="search"
              value={q()}
              onInput={(event) => {
                const value = event.currentTarget.value;
                update({ q: value.trim() ? value.toLowerCase() : "" });
              }}
            />
          </div>
          <div class="control">
            <label for="pokemon-type">Type</label>
            <select
              id="pokemon-type"
              value={typeValue()}
              onChange={(event) => update({ type: event.currentTarget.value })}
            >
              <option value="" selected={typeValue() === ""}>All types</option>
              <For each={data().types}>
                {(item) => (
                  <option value={item.name} selected={typeValue() === item.name}>
                    {item.label}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="control">
            <label for="pokemon-generation">Generation</label>
            <select
              id="pokemon-generation"
              value={generationValue()}
              onChange={(event) => update({ generation: event.currentTarget.value })}
            >
              <option value="" selected={generationValue() === ""}>All generations</option>
              <For each={data().generations}>
                {(item) => (
                  <option value={item.name} selected={generationValue() === item.name}>
                    {item.label}
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        <p class="count">{filtered().length} Pokémon</p>

        <Show
          when={filtered().length > 0}
          fallback={<p class="empty">No Pokémon found</p>}
        >
          <ul class="card-grid">
            <For each={pageItems()}>
              {(pokemon) => <PokemonCard pokemon={pokemon} showTypes />}
            </For>
          </ul>
        </Show>

        <div class="pagination">
          <span>Page {page()} of {totalPages()}</span>
          <Show when={page() > 1}>
            <A href={pageHref(cleanParams(searchParams), page() - 1)}>Previous page</A>
          </Show>
          <Show when={page() < totalPages()}>
            <A href={pageHref(cleanParams(searchParams), page() + 1)}>Next page</A>
          </Show>
        </div>
      </main>
    </Show>
  );
}
