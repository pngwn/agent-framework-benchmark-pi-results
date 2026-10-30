import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { isBrowser } from "@builder.io/qwik/build";
import { Link, routeLoader$, useLocation, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { CardList } from "~/components/ui";
import { homePage, type HomeFilters } from "~/lib/data";

export const useHome = routeLoader$(({ url }) => homePage(url.searchParams));

/** Home URL for a set of filters; empty and default values are left out. */
function homeHref(filters: Partial<HomeFilters>) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

const SEARCH_DELAY_MS = 200;

export default component$(() => {
  const home = useHome();
  const nav = useNavigate();
  const loc = useLocation();
  const query = useSignal(home.value.filters.q);
  const timer = useSignal<number | undefined>(undefined);

  // Keep the search box in sync when the URL changes from elsewhere (back/forward, links).
  useTask$(({ track }) => {
    const search = track(() => loc.url.search);
    if (!isBrowser) return;
    const q = new URLSearchParams(search).get("q") ?? "";
    if (document.activeElement?.id !== "search" && q.trim() !== query.value.trim()) query.value = q;
  });

  // Typing replaces the history entry; picking a filter adds one.
  const applyFilters = $((change: Partial<HomeFilters>, replaceState = false) => {
    clearTimeout(timer.value);
    const { type, generation } = home.value.filters;
    nav(homeHref({ q: query.value.trim(), type, generation, ...change, page: 1 }), { replaceState, scroll: false });
  });

  const { filters, count, totalPages, cards, typeOptions, generationOptions } = home.value;

  return (
    <>
      <h1>Pokémon</h1>
      <form class="filters" preventdefault:submit onSubmit$={() => applyFilters({})} role="search">
        <div class="field field-search">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            name="q"
            autocomplete="off"
            value={query.value}
            onInput$={(_, el) => {
              query.value = el.value;
              clearTimeout(timer.value);
              timer.value = window.setTimeout(() => applyFilters({}, true), SEARCH_DELAY_MS);
            }}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type" onChange$={(_, el) => applyFilters({ type: el.value })}>
            <option value="" selected={!filters.type}>
              All types
            </option>
            {typeOptions.map((t) => (
              <option key={t.name} value={t.name} selected={t.name === filters.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation" onChange$={(_, el) => applyFilters({ generation: el.value })}>
            <option value="" selected={!filters.generation}>
              All generations
            </option>
            {generationOptions.map((g) => (
              <option key={g.name} value={g.name} selected={g.name === filters.generation}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {count > 0 ? (
        <>
          <p class="count">{count} Pokémon</p>
          <CardList cards={cards} />
          <nav class="pagination" aria-label="Pagination">
            {filters.page > 1 && <Link href={homeHref({ ...filters, page: filters.page - 1 })}>Previous page</Link>}
            <span>
              Page {filters.page} of {totalPages}
            </span>
            {filters.page < totalPages && <Link href={homeHref({ ...filters, page: filters.page + 1 })}>Next page</Link>}
          </nav>
        </>
      ) : (
        <p class="empty">No Pokémon found</p>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Pokédex" };
