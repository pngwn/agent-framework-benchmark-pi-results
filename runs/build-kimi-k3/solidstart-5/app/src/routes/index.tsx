import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import PokemonCard from "~/components/PokemonCard";
import { humanize } from "~/lib/format";
import { getIndex } from "~/lib/queries";

const PAGE_SIZE = 48;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const index = createAsync(() => getIndex());

  const q = () => (searchParams.q as string) ?? "";
  const type = () => (searchParams.type as string) ?? "";
  const generation = () => (searchParams.generation as string) ?? "";
  const page = () => Math.max(1, parseInt((searchParams.page as string) ?? "", 10) || 1);

  const filtered = createMemo(() => {
    const list = index()?.species ?? [];
    const query = q().trim().toLowerCase();
    return list.filter(
      (s) =>
        (!query || humanize(s.name).toLowerCase().includes(query)) &&
        (!type() || s.types.some((t) => t.name === type())) &&
        (!generation() || s.generation === generation()),
    );
  });

  const totalPages = () => Math.max(1, Math.ceil(filtered().length / PAGE_SIZE));
  const currentPage = () => Math.min(page(), totalPages());
  const pageItems = () =>
    filtered().slice((currentPage() - 1) * PAGE_SIZE, currentPage() * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q()) params.set("q", q());
    if (type()) params.set("type", type());
    if (generation()) params.set("generation", generation());
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <main class="container">
      <Title>Pokédex</Title>
      <h1>Pokémon</h1>
      <Show when={index()}>
        {(data) => (
          <>
            <div class="filters">
              <div class="field">
                <label for="search">Search</label>
                <input
                  id="search"
                  type="search"
                  value={q()}
                  onInput={(e) =>
                    setSearchParams(
                      { q: e.currentTarget.value || undefined, page: undefined },
                      { replace: true },
                    )
                  }
                />
              </div>
              <div class="field">
                <label for="type-filter">Type</label>
                <select
                  id="type-filter"
                  onChange={(e) =>
                    setSearchParams({ type: e.currentTarget.value || undefined, page: undefined })
                  }
                >
                  <option value="" selected={type() === ""}>
                    All types
                  </option>
                  <For each={data().types}>
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
                    setSearchParams({
                      generation: e.currentTarget.value || undefined,
                      page: undefined,
                    })
                  }
                >
                  <option value="" selected={generation() === ""}>
                    All generations
                  </option>
                  <For each={data().generations}>
                    {(g) => (
                      <option value={g.name} selected={generation() === g.name}>
                        {g.en}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </div>
            <p class="count">{filtered().length} Pokémon</p>
            <Show when={filtered().length > 0} fallback={<p class="empty">No Pokémon found</p>}>
              <ul class="cards">
                <For each={pageItems()}>
                  {(s) => <PokemonCard id={s.id} name={s.name} types={s.types} />}
                </For>
              </ul>
              <nav class="pagination" aria-label="Pagination">
                <Show when={currentPage() > 1}>
                  <A href={pageHref(currentPage() - 1)}>Previous page</A>
                </Show>
                <span class="page-status">
                  Page {currentPage()} of {totalPages()}
                </span>
                <Show when={currentPage() < totalPages()}>
                  <A href={pageHref(currentPage() + 1)}>Next page</A>
                </Show>
              </nav>
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}
