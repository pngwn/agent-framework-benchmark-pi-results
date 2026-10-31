import { component$, useSignal } from '@builder.io/qwik';
import { routeLoader$, useNavigate, type DocumentHead } from '@builder.io/qwik-city';
import { CardGrid } from '../components/pokemon-card';
import {
  cardForSpecies,
  getGenerations,
  getSpeciesGenerationMap,
  getSpeciesList,
  getSpeciesTypeMap,
  getTypes,
} from '../lib/data';
import { humanize } from '../lib/util';

const PAGE_SIZE = 48;

export const useHomeData = routeLoader$(async (ev) => {
  const params = ev.url.searchParams;
  const q = (params.get('q') ?? '').trim();
  const type = params.get('type') ?? '';
  const generation = params.get('generation') ?? '';
  const pageParam = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [species, types, generations, typeMap, genMap] = await Promise.all([
    getSpeciesList(),
    getTypes(),
    getGenerations(),
    getSpeciesTypeMap(),
    getSpeciesGenerationMap(),
  ]);

  const ql = q.toLowerCase();
  const matches = species.filter((s) => {
    if (ql && !humanize(s.name).toLowerCase().includes(ql)) return false;
    if (type && !(typeMap.get(s.id) ?? []).some((t) => t.name === type)) return false;
    if (generation && genMap.get(s.name) !== generation) return false;
    return true;
  });

  const total = matches.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageParam, totalPages);
  const cards = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((s) => cardForSpecies(s.id, s.name, typeMap.get(s.id) ?? []));

  return { q, type, generation, page, total, totalPages, cards, types, generations };
});

export const head: DocumentHead = {
  title: 'Pokédex',
};

function homeUrl(f: { q?: string; type?: string; generation?: string; page?: number }): string {
  const p = new URLSearchParams();
  const q = f.q?.trim();
  if (q) p.set('q', q);
  if (f.type) p.set('type', f.type);
  if (f.generation) p.set('generation', f.generation);
  if (f.page && f.page > 1) p.set('page', String(f.page));
  const s = p.toString();
  return s ? `/?${s}` : '/';
}

export default component$(() => {
  const data = useHomeData();
  const nav = useNavigate();
  const timer = useSignal<ReturnType<typeof setTimeout> | null>(null);
  // Frozen initial value: never updated, so re-renders never rewrite the input.
  const initialQuery = useSignal(data.value.q);

  const d = data.value;

  return (
    <>
      <h1>Pokémon</h1>
      <div class="controls">
        <div class="control">
          <label for="pokemon-search">Search</label>
          <input
            id="pokemon-search"
            type="search"
            autoComplete="off"
            value={initialQuery.value}
            onInput$={(_, el) => {
              // Uncontrolled after the initial render: don't write the value
              // back, or fast typing races with re-renders and loses keystrokes.
              if (timer.value) clearTimeout(timer.value);
              const cur = data.value;
              timer.value = setTimeout(() => {
                nav(homeUrl({ q: el.value, type: cur.type, generation: cur.generation }));
              }, 200);
            }}
          />
        </div>
        <div class="control">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            onChange$={(_, el) => {
              const cur = data.value;
              nav(homeUrl({ q: cur.q, type: el.value, generation: cur.generation }));
            }}
          >
            <option value="" selected={d.type === ''}>
              All types
            </option>
            {d.types.map((t) => (
              <option key={t.name} value={t.name} selected={d.type === t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="control">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            onChange$={(_, el) => {
              const cur = data.value;
              nav(homeUrl({ q: cur.q, type: cur.type, generation: el.value }));
            }}
          >
            <option value="" selected={d.generation === ''}>
              All generations
            </option>
            {d.generations.map((g) => (
              <option key={g.name} value={g.name} selected={d.generation === g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="count">{d.total} Pokémon</p>

      {d.total === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <CardGrid cards={d.cards} showTypes />
      )}

      <div class="pagination">
        <span>
          Page {d.page} of {d.totalPages}
        </span>
        {d.page > 1 && (
          <a href={homeUrl({ q: d.q, type: d.type, generation: d.generation, page: d.page - 1 })}>Previous page</a>
        )}
        {d.page < d.totalPages && (
          <a href={homeUrl({ q: d.q, type: d.type, generation: d.generation, page: d.page + 1 })}>Next page</a>
        )}
      </div>
    </>
  );
});
