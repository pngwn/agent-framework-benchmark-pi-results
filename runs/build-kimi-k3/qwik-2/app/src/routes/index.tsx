import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { routeLoader$, useLocation, type DocumentHead } from '@builder.io/qwik-city';
import { PokemonCardList, type CardData } from '~/components/pokemon-card';
import { getDexEntries, getGenerations, getTypeList } from '~/lib/data';
import { englishName } from '~/lib/format';

const PAGE_SIZE = 48;

export const useDex = routeLoader$(async () => {
  const [entries, typeList, generations] = await Promise.all([
    getDexEntries(),
    getTypeList(),
    getGenerations(),
  ]);
  return {
    entries,
    typeList,
    generations: generations.map((g) => ({
      name: g.name as string,
      english: englishName(g.names, g.name),
    })),
  };
});

export const head: DocumentHead = {
  title: 'Pokédex',
};

function pageUrl(q: string, type: string, generation: string, page: number): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default component$(() => {
  const data = useDex();
  const loc = useLocation();

  const q = useSignal(loc.url.searchParams.get('q') ?? '');
  const type = useSignal(loc.url.searchParams.get('type') ?? '');
  const generation = useSignal(loc.url.searchParams.get('generation') ?? '');
  const page = useSignal(
    Math.max(1, parseInt(loc.url.searchParams.get('page') ?? '1', 10) || 1),
  );

  const filtered = useComputed$(() => {
    const query = q.value.trim().toLowerCase();
    return data.value.entries.filter(
      (e) =>
        (!query || e.human.toLowerCase().includes(query)) &&
        (!type.value || e.types.includes(type.value)) &&
        (!generation.value || e.generation === generation.value),
    );
  });

  const totalPages = useComputed$(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));
  const currentPage = useComputed$(() => Math.min(page.value, totalPages.value));
  const pageEntries = useComputed$(() =>
    filtered.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE),
  );

  const updateUrl = $(() => {
    window.history.replaceState(null, '', pageUrl(q.value, type.value, generation.value, page.value));
  });

  const cards = useComputed$<CardData[]>(() =>
    pageEntries.value.map((e) => ({
      id: e.id,
      name: e.name,
      human: e.human,
      sprite: e.sprite,
      types: e.types,
    })),
  );

  return (
    <>
      <h1>Pokémon</h1>
      <div class="controls">
        <div class="control control-search">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            value={q.value}
            onInput$={(_, el) => {
              q.value = el.value;
              page.value = 1;
              updateUrl();
            }}
          />
        </div>
        <div class="control">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            onChange$={(_, el) => {
              type.value = el.value;
              page.value = 1;
              updateUrl();
            }}
          >
            <option value="" selected={type.value === ''}>
              All types
            </option>
            {data.value.typeList.map((t) => (
              <option key={t.name} value={t.name} selected={type.value === t.name}>
                {t.english}
              </option>
            ))}
          </select>
        </div>
        <div class="control">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            onChange$={(_, el) => {
              generation.value = el.value;
              page.value = 1;
              updateUrl();
            }}
          >
            <option value="" selected={generation.value === ''}>
              All generations
            </option>
            {data.value.generations.map((g) => (
              <option key={g.name} value={g.name} selected={generation.value === g.name}>
                {g.english}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="count">{filtered.value.length} Pokémon</p>

      {filtered.value.length === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <>
          <PokemonCardList cards={cards.value} typeList={data.value.typeList} />
          <div class="pagination">
            {currentPage.value > 1 && (
              <a
                href={pageUrl(q.value, type.value, generation.value, currentPage.value - 1)}
                onClick$={(e) => {
                  e.preventDefault();
                  page.value = currentPage.value - 1;
                  updateUrl();
                }}
              >
                Previous page
              </a>
            )}
            <span>
              Page {currentPage.value} of {totalPages.value}
            </span>
            {currentPage.value < totalPages.value && (
              <a
                href={pageUrl(q.value, type.value, generation.value, currentPage.value + 1)}
                onClick$={(e) => {
                  e.preventDefault();
                  page.value = currentPage.value + 1;
                  updateUrl();
                }}
              >
                Next page
              </a>
            )}
          </div>
        </>
      )}
    </>
  );
});
