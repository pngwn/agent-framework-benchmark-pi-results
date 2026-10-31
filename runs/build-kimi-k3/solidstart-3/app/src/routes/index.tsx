import { createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, createAsync, useNavigate, useSearchParams } from "@solidjs/router";
import { homeQuery } from "~/lib/queries";
import { one } from "~/lib/format";
import PokemonCards from "~/components/PokemonCards";

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = () => one(searchParams.q) ?? "";
  const type = () => one(searchParams.type) ?? "";
  const generation = () => one(searchParams.generation) ?? "";
  const page = () => {
    const n = Number(one(searchParams.page) ?? "1");
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  };

  const data = createAsync(() =>
    homeQuery(
      JSON.stringify({
        q: q() || undefined,
        type: type() || undefined,
        generation: generation() || undefined,
        page: page(),
      }),
    ),
  );

  const buildUrl = (overrides: { q?: string; type?: string; generation?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nq = overrides.q ?? q();
    const nt = overrides.type ?? type();
    const ng = overrides.generation ?? generation();
    const np = overrides.page ?? page();
    if (nq) params.set("q", nq);
    if (nt) params.set("type", nt);
    if (ng) params.set("generation", ng);
    if (np > 1) params.set("page", String(np));
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  // Local state for the search box; the URL updates on a debounce as you type.
  const [term, setTerm] = createSignal(q());
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const onSearchInput = (value: string) => {
    setTerm(value);
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      navigate(buildUrl({ q: value, page: 1 }), { replace: true, scroll: false });
    }, 250);
  };

  return (
    <main class="container">
      <Title>Pokédex</Title>
      <h1>Pokémon</h1>
      <form class="filters" onSubmit={(e) => e.preventDefault()}>
        <div class="field">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            value={term()}
            onInput={(e) => onSearchInput(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            onChange={(e) =>
              navigate(buildUrl({ type: e.currentTarget.value, page: 1 }), { scroll: false })
            }
          >
            <option value="" selected={type() === ""}>
              All types
            </option>
            <For each={data()?.types ?? []}>
              {(t) => (
                <option value={t.name} selected={type() === t.name}>
                  {t.en}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="field">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            onChange={(e) =>
              navigate(buildUrl({ generation: e.currentTarget.value, page: 1 }), { scroll: false })
            }
          >
            <option value="" selected={generation() === ""}>
              All generations
            </option>
            <For each={data()?.generations ?? []}>
              {(g) => (
                <option value={g.name} selected={generation() === g.name}>
                  {g.en}
                </option>
              )}
            </For>
          </select>
        </div>
      </form>
      <Show when={data()}>
        {(d) => (
          <>
            <p class="count">{d().total} Pokémon</p>
            <Show
              when={d().items.length > 0}
              fallback={<p class="empty">No Pokémon found</p>}
            >
              <PokemonCards cards={d().items} showTypes />
            </Show>
            <p class="pagination">
              <Show when={d().page > 1}>
                <A href={buildUrl({ page: d().page - 1 })}>Previous page</A>
              </Show>
              <span>
                Page {d().page} of {d().totalPages}
              </span>
              <Show when={d().page < d().totalPages}>
                <A href={buildUrl({ page: d().page + 1 })}>Next page</A>
              </Show>
            </p>
          </>
        )}
      </Show>
    </main>
  );
}
