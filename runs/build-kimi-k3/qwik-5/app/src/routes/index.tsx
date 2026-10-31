import { component$, $, useSignal } from '@builder.io/qwik';
import { routeLoader$, useNavigate, type DocumentHead } from '@builder.io/qwik-city';
import { getGenerationIndex, getSpeciesList, getTypeIndex, spriteUrl } from '../lib/api';
import { humanize } from '../lib/format';
import { PokemonCards, type CardData } from '../components/pokemon-cards';

const PAGE_SIZE = 48;

export const useHomeData = routeLoader$(async ({ query }) => {
  const q = (query.get('q') ?? '').trim();
  const type = query.get('type') ?? '';
  const generation = query.get('generation') ?? '';
  let page = Math.max(1, Number.parseInt(query.get('page') ?? '1', 10) || 1);

  const [speciesList, typeIndex, generationIndex] = await Promise.all([
    getSpeciesList(),
    getTypeIndex(),
    getGenerationIndex(),
  ]);

  let filtered = speciesList;
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((s) => humanize(s.name).toLowerCase().includes(needle));
  }
  if (type) {
    filtered = filtered.filter((s) => (typeIndex.pokemonTypes.get(s.id) ?? []).some((t) => t.name === type));
  }
  if (generation) {
    filtered = filtered.filter((s) => generationIndex.bySpecies.get(s.name) === generation);
  }

  const count = filtered.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (page > totalPages) page = totalPages;

  const cards: CardData[] = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
    name: s.name,
    id: s.id,
    sprite: spriteUrl(s.id),
    types: (typeIndex.pokemonTypes.get(s.id) ?? []).map((t) => ({ name: t.name, label: t.label })),
  }));

  return {
    count,
    page,
    totalPages,
    cards,
    filters: { q, type, generation },
    types: typeIndex.list,
    generations: generationIndex.list,
  };
});

function homeUrl(filters: { q: string; type: string; generation: string }, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default component$(() => {
  const data = useHomeData();
  const nav = useNavigate();
  const timer = useSignal<number>();

  const d = data.value;

  const gotoFilters = $((patch: Partial<{ q: string; type: string; generation: string }>) => {
    const cur = data.value.filters;
    // Changing a filter goes back to page 1.
    nav(homeUrl({ q: cur.q, type: cur.type, generation: cur.generation, ...patch }, 1));
  });

  return (
    <>
      <h1>Pokémon</h1>
      <div class="filters">
        <div class="field">
          <label for="search">Search</label>
          <input
            type="search"
            id="search"
            name="q"
            value={d.filters.q}
            autoComplete="off"
            onInput$={(_, el) => {
              const value = el.value;
              clearTimeout(timer.value);
              timer.value = window.setTimeout(() => {
                gotoFilters({ q: value });
              }, 250);
            }}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select
            id="type"
            name="type"
            onChange$={(_, el) => {
              gotoFilters({ type: el.value });
            }}
          >
            <option value="">All types</option>
            {d.types.map((t) => (
              <option key={t.name} value={t.name} selected={d.filters.type === t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select
            id="generation"
            name="generation"
            onChange$={(_, el) => {
              gotoFilters({ generation: el.value });
            }}
          >
            <option value="">All generations</option>
            {d.generations.map((g) => (
              <option key={g.name} value={g.name} selected={d.filters.generation === g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p class="count-text">{d.count} Pokémon</p>
      {d.count === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <>
          <PokemonCards cards={d.cards} />
          <p class="pagination">
            {d.page > 1 && (
              <a href={homeUrl(d.filters, d.page - 1)}>Previous page</a>
            )}
            <span>
              Page {d.page} of {d.totalPages}
            </span>
            {d.page < d.totalPages && (
              <a href={homeUrl(d.filters, d.page + 1)}>Next page</a>
            )}
          </p>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Pokédex',
};
