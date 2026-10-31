import {
  $,
  component$,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  getGenerations,
  getSpeciesList,
  getTypes,
  spriteBase,
} from "../lib/api";
import { dexNumber, humanize, idFromUrl } from "../lib/format";

const PAGE_SIZE = 48;

export const useHomeData = routeLoader$(async () => {
  const [species, types, generations] = await Promise.all([
    getSpeciesList(),
    getTypes(),
    getGenerations(),
  ]);

  // Types of every species' default Pokémon, in slot order.
  const typesBySpecies = new Map<number, { slot: number; type: string }[]>();
  for (const t of types) {
    for (const entry of t.record.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url);
      if (!Number.isFinite(id) || id >= 10000) continue;
      const arr = typesBySpecies.get(id) ?? [];
      arr.push({ slot: entry.slot, type: t.name });
      typesBySpecies.set(id, arr);
    }
  }

  // Generation in which every species was introduced.
  const generationBySpecies = new Map<string, string>();
  for (const g of generations) {
    for (const name of g.species) generationBySpecies.set(name, g.name);
  }

  const list = species.map((s) => ({
    id: s.id,
    name: s.name,
    types: (typesBySpecies.get(s.id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((x) => x.type),
    generation: generationBySpecies.get(s.name) ?? "",
  }));

  return {
    species: list,
    typeLabels: Object.fromEntries(types.map((t) => [t.name, t.label])),
    typeOptions: types.map((t) => ({ value: t.name, label: t.label })),
    generationOptions: generations.map((g) => ({
      value: g.name,
      label: g.label,
    })),
    sprites: spriteBase(),
  };
});

function homeQuery(
  q: string,
  type: string,
  generation: string,
  page: number,
): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (type) params.set("type", type);
  if (generation) params.set("generation", generation);
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `/?${s}` : "/";
}

export default component$(() => {
  const data = useHomeData().value;
  const loc = useLocation();

  const q = useSignal(loc.url.searchParams.get("q") ?? "");
  const type = useSignal(loc.url.searchParams.get("type") ?? "");
  const generation = useSignal(loc.url.searchParams.get("generation") ?? "");
  const page = useSignal(
    Math.max(1, parseInt(loc.url.searchParams.get("page") ?? "", 10) || 1),
  );

  const filtered = useComputed$(() => {
    const needle = q.value.trim().toLowerCase();
    return data.species.filter((s) => {
      if (needle && !humanize(s.name).toLowerCase().includes(needle))
        return false;
      if (type.value && !s.types.includes(type.value)) return false;
      if (generation.value && s.generation !== generation.value) return false;
      return true;
    });
  });
  const totalPages = useComputed$(() =>
    Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)),
  );
  const currentPage = useComputed$(() =>
    Math.min(page.value, totalPages.value),
  );
  const pageItems = useComputed$(() =>
    filtered.value.slice(
      (currentPage.value - 1) * PAGE_SIZE,
      currentPage.value * PAGE_SIZE,
    ),
  );
  const prevHref = useComputed$(() =>
    homeQuery(q.value, type.value, generation.value, currentPage.value - 1),
  );
  const nextHref = useComputed$(() =>
    homeQuery(q.value, type.value, generation.value, currentPage.value + 1),
  );

  const syncUrl = $((push: boolean) => {
    const url = homeQuery(q.value, type.value, generation.value, page.value);
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  });

  // Keep the view in sync with browser back/forward navigation.
  useVisibleTask$(() => {
    const apply = () => {
      const sp = new URLSearchParams(window.location.search);
      q.value = sp.get("q") ?? "";
      type.value = sp.get("type") ?? "";
      generation.value = sp.get("generation") ?? "";
      page.value = Math.max(1, parseInt(sp.get("page") ?? "", 10) || 1);
    };
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  });

  return (
    <>
      <h1>Pokémon</h1>
      <div class="controls">
        <div class="field">
          <label for="filter-q">Search</label>
          <input
            id="filter-q"
            type="search"
            value={q.value}
            onInput$={(_e, el) => {
              q.value = el.value;
              page.value = 1;
              syncUrl(false);
            }}
          />
        </div>
        <div class="field">
          <label for="filter-type">Type</label>
          <select
            id="filter-type"
            onChange$={(_e, el) => {
              type.value = el.value;
              page.value = 1;
              syncUrl(true);
            }}
          >
            <option value="" selected={type.value === ""}>
              All types
            </option>
            {data.typeOptions.map((t) => (
              <option
                key={t.value}
                value={t.value}
                selected={type.value === t.value}
              >
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="filter-generation">Generation</label>
          <select
            id="filter-generation"
            onChange$={(_e, el) => {
              generation.value = el.value;
              page.value = 1;
              syncUrl(true);
            }}
          >
            <option value="" selected={generation.value === ""}>
              All generations
            </option>
            {data.generationOptions.map((g) => (
              <option
                key={g.value}
                value={g.value}
                selected={generation.value === g.value}
              >
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="count">{filtered.value.length} Pokémon</p>

      {pageItems.value.length > 0 ? (
        <ul class="cards">
          {pageItems.value.map((s) => (
            <li class="card" key={s.id}>
              <a href={`/pokemon/${s.name}`}>
                <img
                  src={`${data.sprites}/${s.id}.png`}
                  alt=""
                  width={96}
                  height={96}
                  loading="lazy"
                />
                <span class="card-dex">{dexNumber(s.id)}</span>
                <span class="card-name">{humanize(s.name)}</span>
                {s.types.length > 0 && (
                  <span class="card-badges">
                    {s.types.map((t) => (
                      <span key={t} class={`type-badge t-${t}`}>
                        {data.typeLabels[t] ?? humanize(t)}
                      </span>
                    ))}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p class="empty">No Pokémon found</p>
      )}

      <div class="pagination">
        {currentPage.value > 1 && (
          <a class="page-link" href={prevHref.value}>
            Previous page
          </a>
        )}
        <p class="page-status">
          Page {currentPage.value} of {totalPages.value}
        </p>
        {currentPage.value < totalPages.value && (
          <a class="page-link" href={nextHref.value}>
            Next page
          </a>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Pokédex",
};
