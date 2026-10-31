import { Title } from "@solidjs/meta";
import { A, createAsync, useLocation, useNavigate } from "@solidjs/router";
import { For, Show } from "solid-js";
import { CardList } from "../components/Card.jsx";
import { getHomeData } from "../lib/data.js";

export const route = {
  preload: ({ location }) => getHomeData(location.search),
};

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = createAsync(() => getHomeData(location.search));

  const updateParams = (patch, options) => {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : "/", options);
  };

  let searchTimer;
  const onSearchInput = (event) => {
    const value = event.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => updateParams({ q: value || null, page: null }, { replace: true }), 250);
  };

  const pageHref = (n) => {
    const params = new URLSearchParams(location.search);
    if (n <= 1) params.delete("page");
    else params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <main class="container">
      <Title>Pokédex</Title>
      <h1>Pokémon</h1>
      <Show when={data()}>
        {(d) => (
          <>
            <form class="controls" onSubmit={(e) => e.preventDefault()}>
              <div class="field">
                <label for="search-input">Search</label>
                <input
                  id="search-input"
                  type="search"
                  value={d().q}
                  onInput={onSearchInput}
                  autocomplete="off"
                />
              </div>
              <div class="field">
                <label for="type-filter">Type</label>
                <select
                  id="type-filter"
                  onChange={(e) => updateParams({ type: e.currentTarget.value || null, page: null })}
                >
                  <option value="" selected={d().type === ""}>
                    All types
                  </option>
                  <For each={d().types}>{(t) => <option value={t.name} selected={t.name === d().type}>{t.en}</option>}</For>
                </select>
              </div>
              <div class="field">
                <label for="generation-filter">Generation</label>
                <select
                  id="generation-filter"
                  onChange={(e) => updateParams({ generation: e.currentTarget.value || null, page: null })}
                >
                  <option value="" selected={d().generation === ""}>
                    All generations
                  </option>
                  <For each={d().generations}>{(g) => <option value={g.name} selected={g.name === d().generation}>{g.en}</option>}</For>
                </select>
              </div>
            </form>
            <p class="result-count">{d().count} Pokémon</p>
            <Show when={d().cards.length > 0} fallback={<p class="no-results">No Pokémon found</p>}>
              <CardList cards={d().cards} />
            </Show>
            <Show when={d().count > 0}>
              <div class="pagination">
                <p class="page-status">
                  Page {d().page} of {d().totalPages}
                </p>
                <div class="page-links">
                  <Show when={d().page > 1}>
                    <A href={pageHref(d().page - 1)}>Previous page</A>
                  </Show>
                  <Show when={d().page < d().totalPages}>
                    <A href={pageHref(d().page + 1)}>Next page</A>
                  </Show>
                </div>
              </div>
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}
