import { Title } from "@solidjs/meta";
import { A, useSearchParams } from "@solidjs/router";
import { Show, createEffect, createMemo, createResource, createSignal, on, onCleanup } from "solid-js";
import PokemonCard from "~/components/PokemonCard";
import { getHomeData } from "~/lib/data";

const PAGE_SIZE = 48;

function queryHref(values: { q: string; type: string; generation: string; page: number }) {
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.type) params.set("type", values.type);
  if (values.generation) params.set("generation", values.generation);
  if (values.page > 1) params.set("page", String(values.page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [data] = createResource(() => getHomeData());
  const [search, setSearch] = createSignal(String(params.q ?? ""));
  let timer: ReturnType<typeof setTimeout> | undefined;

  createEffect(
    on(
      () => String(params.q ?? ""),
      (value) => {
        setSearch(value);
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  const updateSearch = (value: string) => {
    setSearch(value);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      setParams({ q: value.trim() || null, page: null }, { replace: true });
    }, 200);
  };

  const matches = createMemo(() => {
    const all = data()?.items ?? [];
    const q = search().trim().toLowerCase();
    const type = String(params.type ?? "");
    const generation = String(params.generation ?? "");
    return all.filter((item) => {
      if (q && !item.label.toLowerCase().includes(q)) return false;
      if (type && !item.types.includes(type)) return false;
      if (generation && item.generation !== generation) return false;
      return true;
    });
  });

  const totalPages = () => Math.max(1, Math.ceil(matches().length / PAGE_SIZE));
  const currentPage = () => {
    const wanted = Number(params.page ?? 1) || 1;
    return Math.min(Math.max(1, wanted), totalPages());
  };
  const pageItems = () => {
    const start = (currentPage() - 1) * PAGE_SIZE;
    return matches().slice(start, start + PAGE_SIZE);
  };

  const q = () => String(params.q ?? "");
  const type = () => String(params.type ?? "");
  const generation = () => String(params.generation ?? "");

  const onTypeChange = (value: string) => {
    setParams({ type: value || null, page: null });
  };
  const onGenerationChange = (value: string) => {
    setParams({ generation: value || null, page: null });
  };

  return (
    <Show when={data()} fallback={<main class="container"><h1>Pokémon</h1></main>}>
      <Title>Pokédex</Title>
      <main class="container home-page">
        <h1>Pokémon</h1>

        <div class="filters">
          <div class="field search-field">
            <label for="search">Search</label>
            <input
              id="search"
              type="search"
              value={search()}
              onInput={(event) => updateSearch(event.currentTarget.value)}
            />
          </div>
          <div class="field">
            <label for="type-filter">Type</label>
            <select
              id="type-filter"
              value={type()}
              onChange={(event) => onTypeChange(event.currentTarget.value)}
            >
              <option value="">All types</option>
              {data()!.types.map((entry) => (
                <option value={entry.name}>{entry.label}</option>
              ))}
            </select>
          </div>
          <div class="field">
            <label for="generation-filter">Generation</label>
            <select
              id="generation-filter"
              value={generation()}
              onChange={(event) => onGenerationChange(event.currentTarget.value)}
            >
              <option value="">All generations</option>
              {data()!.generations.map((entry) => (
                <option value={entry.name}>{entry.label}</option>
              ))}
            </select>
          </div>
        </div>

        <p class="result-count">{matches().length} Pokémon</p>

        <Show
          when={matches().length > 0}
          fallback={<p class="empty-state">No Pokémon found</p>}
        >
          <ul class="pokemon-grid">
            {pageItems().map((item) => (
              <PokemonCard card={item} showTypes />
            ))}
          </ul>
        </Show>

        <div class="pagination">
          <span>
            Page {currentPage()} of {totalPages()}
          </span>
          <Show when={currentPage() > 1}>
            <A
              href={queryHref({
                q: q(),
                type: type(),
                generation: generation(),
                page: currentPage() - 1,
              })}
            >
              Previous page
            </A>
          </Show>
          <Show when={currentPage() < totalPages()}>
            <A
              href={queryHref({
                q: q(),
                type: type(),
                generation: generation(),
                page: currentPage() + 1,
              })}
            >
              Next page
            </A>
          </Show>
        </div>
      </main>
    </Show>
  );
}
