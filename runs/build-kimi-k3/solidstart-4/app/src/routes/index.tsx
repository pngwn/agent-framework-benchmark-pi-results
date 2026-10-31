import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { PokemonCard } from "~/components/PokemonCard";
import { Select } from "~/components/Select";
import { getHomeData } from "~/lib/api";

const PAGE_SIZE = 48;

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

export default function Home() {
  const data = createAsync(() => getHomeData());
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = createSignal(first(searchParams.q));
  let lastPushed = first(searchParams.q);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const pushQuery = (value: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      lastPushed = value;
      setSearchParams({ q: value || null, page: null }, { replace: true, scroll: false });
    }, 200);
  };
  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  // Adopt query changes coming from elsewhere (e.g. back/forward navigation).
  createEffect(() => {
    const uq = first(searchParams.q);
    if (uq !== lastPushed && uq !== q()) {
      lastPushed = uq;
      setQ(uq);
    }
  });

  const type = () => first(searchParams.type);
  const generation = () => first(searchParams.generation);

  const filtered = createMemo(() => {
    const d = data();
    if (!d) return [];
    const needle = q().trim().toLowerCase();
    const t = type();
    const g = generation();
    return d.species.filter(
      (s) =>
        (!needle || s.human.toLowerCase().includes(needle)) &&
        (!t || s.types.some((x) => x.name === t)) &&
        (!g || s.generation === g),
    );
  });

  const pageCount = createMemo(() => Math.max(1, Math.ceil(filtered().length / PAGE_SIZE)));
  const page = createMemo(() => {
    const p = Number.parseInt(first(searchParams.page), 10);
    if (!Number.isFinite(p) || p < 1) return 1;
    return Math.min(p, pageCount());
  });
  const pageItems = createMemo(() => filtered().slice((page() - 1) * PAGE_SIZE, page() * PAGE_SIZE));

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    const needle = q().trim();
    if (needle) params.set("q", needle);
    if (type()) params.set("type", type());
    if (generation()) params.set("generation", generation());
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <Show when={data()} fallback={<p class="loading">Loading…</p>}>
      {(d) => (
        <>
          <Title>Pokédex</Title>
          <h1>Pokémon</h1>
          <form class="controls" onSubmit={(e) => e.preventDefault()}>
            <div class="control">
              <label for="pokemon-search">Search</label>
              <input
                id="pokemon-search"
                type="search"
                autocomplete="off"
                value={q()}
                onInput={(e) => {
                  const v = e.currentTarget.value;
                  setQ(v);
                  pushQuery(v);
                }}
              />
            </div>
            <div class="control">
              <label for="type-filter">Type</label>
              <Select
                id="type-filter"
                value={type()}
                onChange={(e) => setSearchParams({ type: e.currentTarget.value || null, page: null }, { scroll: false })}
              >
                <option value="">All types</option>
                <For each={d().types}>{(t) => <option value={t.name}>{t.enName}</option>}</For>
              </Select>
            </div>
            <div class="control">
              <label for="generation-filter">Generation</label>
              <Select
                id="generation-filter"
                value={generation()}
                onChange={(e) => setSearchParams({ generation: e.currentTarget.value || null, page: null }, { scroll: false })}
              >
                <option value="">All generations</option>
                <For each={d().generations}>{(g) => <option value={g.name}>{g.enName}</option>}</For>
              </Select>
            </div>
          </form>
          <p class="count">{filtered().length} Pokémon</p>
          <Show when={filtered().length > 0} fallback={<p>No Pokémon found</p>}>
            <ul class="card-grid">
              <For each={pageItems()}>
                {(s) => <PokemonCard id={s.id} name={s.name} human={s.human} sprite={s.sprite} types={s.types} />}
              </For>
            </ul>
            <div class="pagination">
              <span>
                Page {page()} of {pageCount()}
              </span>
              <Show when={page() > 1}>
                <A href={hrefFor(page() - 1)}>Previous page</A>
              </Show>
              <Show when={page() < pageCount()}>
                <A href={hrefFor(page() + 1)}>Next page</A>
              </Show>
            </div>
          </Show>
        </>
      )}
    </Show>
  );
}
