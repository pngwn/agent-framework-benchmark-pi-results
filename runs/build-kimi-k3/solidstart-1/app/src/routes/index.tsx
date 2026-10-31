import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import PokemonCard from "~/components/PokemonCard";
import { getHomeData } from "~/lib/queries";
import { humanize } from "~/lib/util";

export const route = {
  preload: () => getHomeData(),
} satisfies RouteDefinition;

const PAGE_SIZE = 48;

export default function Home() {
  const data = createAsync(() => getHomeData());
  const [searchParams, setSearchParams] = useSearchParams();

  const param = (key: string) => {
    const v = searchParams[key];
    return typeof v === "string" ? v : "";
  };
  const q = () => param("q");
  const type = () => param("type");
  const generation = () => param("generation");
  const page = () => {
    const n = parseInt(param("page"), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const [qInput, setQInput] = createSignal(q());
  createEffect(() => setQInput(q()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  const onSearchInput = (e: InputEvent) => {
    const v = (e.currentTarget as HTMLInputElement).value;
    setQInput(v);
    clearTimeout(timer);
    timer = setTimeout(() => {
      setSearchParams({ q: v.trim() ? v : undefined, page: undefined });
    }, 150);
  };

  const filtered = createMemo(() => {
    const d = data();
    if (!d) return [];
    const query = q().trim().toLowerCase();
    return d.species.filter((s: any) => {
      if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
      if (type() && !(s.types as any[]).some((t) => t.name === type())) return false;
      if (generation() && s.generation !== generation()) return false;
      return true;
    });
  });
  const totalPages = createMemo(() => Math.max(1, Math.ceil(filtered().length / PAGE_SIZE)));
  const currentPage = createMemo(() => Math.min(page(), totalPages()));
  const pageItems = createMemo(() =>
    filtered().slice((currentPage() - 1) * PAGE_SIZE, currentPage() * PAGE_SIZE),
  );

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (q()) params.set("q", q());
    if (type()) params.set("type", type());
    if (generation()) params.set("generation", generation());
    if (n > 1) params.set("page", String(n));
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <Title>Pokédex</Title>
      <h1>Pokémon</h1>
      <div class="controls">
        <div class="control">
          <label for="search-input">Search</label>
          <input
            id="search-input"
            type="search"
            value={qInput()}
            onInput={onSearchInput}
            autocomplete="off"
          />
        </div>
        <div class="control">
          <label for="type-select">Type</label>
          <select
            id="type-select"
            value={type()}
            onChange={(e) =>
              setSearchParams({ type: e.currentTarget.value || undefined, page: undefined })
            }
          >
            <option value="" selected={type() === ""}>
              All types
            </option>
            <For each={data()?.types ?? []}>
              {(t: any) => (
                <option value={t.name} selected={type() === t.name}>
                  {t.en}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="control">
          <label for="generation-select">Generation</label>
          <select
            id="generation-select"
            value={generation()}
            onChange={(e) =>
              setSearchParams({ generation: e.currentTarget.value || undefined, page: undefined })
            }
          >
            <option value="" selected={generation() === ""}>
              All generations
            </option>
            <For each={data()?.generations ?? []}>
              {(g: any) => (
                <option value={g.name} selected={generation() === g.name}>
                  {g.en}
                </option>
              )}
            </For>
          </select>
        </div>
      </div>
      <Show when={data()}>
        <p class="count">{filtered().length} Pokémon</p>
        <Show when={filtered().length > 0} fallback={<p>No Pokémon found</p>}>
          <ul class="card-grid">
            <For each={pageItems()}>
              {(s: any) => <PokemonCard id={s.id} name={s.name} sprite={s.sprite} types={s.types} />}
            </For>
          </ul>
          <p class="pagination">
            <span>
              Page {currentPage()} of {totalPages()}
            </span>
            <Show when={currentPage() > 1}>
              <A href={pageHref(currentPage() - 1)}>Previous page</A>
            </Show>
            <Show when={currentPage() < totalPages()}>
              <A href={pageHref(currentPage() + 1)}>Next page</A>
            </Show>
          </p>
        </Show>
      </Show>
    </>
  );
}
