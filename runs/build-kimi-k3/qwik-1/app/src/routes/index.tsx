import { component$, useSignal } from '@builder.io/qwik';
import { routeLoader$, useNavigate, type DocumentHead } from '@builder.io/qwik-city';
import { idFromUrl, spriteUrl } from '../lib/api';
import { getGenerations, getSpecies, getTypes } from '../lib/data';
import { humanize } from '../lib/format';
import { homeUrl } from '../lib/urls';
import { CardGrid, type CardItem } from '../components/card-grid';

const PAGE_SIZE = 48;

export const useHomeData = routeLoader$(async ({ query }) => {
  const [species, types, generations] = await Promise.all([
    getSpecies(),
    getTypes(),
    getGenerations(),
  ]);

  // Types of each species' default Pokémon (default Pokémon id == species id).
  const typesOfSpecies = new Map<number, Array<{ slot: number; api: string; en: string }>>();
  for (const t of types) {
    for (const p of t.record.pokemon) {
      const pid = idFromUrl(p.pokemon.url);
      if (!Number.isFinite(pid) || pid >= 10000) continue;
      const arr = typesOfSpecies.get(pid) ?? [];
      arr.push({ slot: p.slot, api: t.name, en: t.en });
      typesOfSpecies.set(pid, arr);
    }
  }

  // Generation each species was introduced in.
  const generationOf = new Map<string, string>();
  for (const g of generations) {
    for (const s of g.record.pokemon_species) generationOf.set(s.name, g.name);
  }

  const all = species.map((s) => ({
    id: s.id,
    speciesName: s.name,
    human: humanize(s.name),
    types: (typesOfSpecies.get(s.id) ?? []).sort((a, b) => a.slot - b.slot),
    generation: generationOf.get(s.name) ?? '',
  }));

  const q = (query.get('q') ?? '').trim();
  const type = query.get('type') ?? '';
  const generation = query.get('generation') ?? '';

  let filtered = all;
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((e) => e.human.toLowerCase().includes(needle));
  }
  if (type) filtered = filtered.filter((e) => e.types.some((t) => t.api === type));
  if (generation) filtered = filtered.filter((e) => e.generation === generation);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rawPage = parseInt(query.get('page') ?? '1', 10);
  const page = Math.min(Math.max(1, Number.isFinite(rawPage) ? rawPage : 1), totalPages);

  const cards: CardItem[] = filtered
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((e) => ({
      id: e.id,
      speciesName: e.speciesName,
      human: e.human,
      sprite: spriteUrl(e.id),
      types: e.types.map((t) => ({ api: t.api, en: t.en })),
    }));

  return {
    q,
    type,
    generation,
    page,
    totalPages,
    total,
    cards,
    typeOptions: types.map((t) => ({ api: t.name, en: t.en })),
    generationOptions: generations.map((g) => ({ api: g.name, en: g.en })),
  };
});

export default component$(() => {
  const data = useHomeData();
  const nav = useNavigate();
  const timer = useSignal<ReturnType<typeof setTimeout> | undefined>();

  const d = data.value;

  return (
    <>
      <h1>Pokémon</h1>

      <div class="filters">
        <div class="field">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            value={d.q}
            onInput$={(_, el) => {
              if (timer.value) clearTimeout(timer.value);
              const value = el.value;
              timer.value = setTimeout(() => {
                nav(homeUrl({ q: value, type: d.type, generation: d.generation }));
              }, 250);
            }}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select
            id="type"
            onChange$={(_, el) => {
              nav(homeUrl({ q: d.q, type: el.value, generation: d.generation }));
            }}
          >
            <option value="" selected={!d.type}>
              All types
            </option>
            {d.typeOptions.map((t) => (
              <option key={t.api} value={t.api} selected={d.type === t.api}>
                {t.en}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select
            id="generation"
            onChange$={(_, el) => {
              nav(homeUrl({ q: d.q, type: d.type, generation: el.value }));
            }}
          >
            <option value="" selected={!d.generation}>
              All generations
            </option>
            {d.generationOptions.map((g) => (
              <option key={g.api} value={g.api} selected={d.generation === g.api}>
                {g.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="count">{d.total} Pokémon</p>

      {d.cards.length === 0 ? (
        <p>No Pokémon found</p>
      ) : (
        <>
          <CardGrid cards={d.cards} />
          <div class="pagination">
            {d.page > 1 && (
              <a href={homeUrl({ q: d.q, type: d.type, generation: d.generation, page: d.page - 1 })}>
                Previous page
              </a>
            )}
            <span>
              Page {d.page} of {d.totalPages}
            </span>
            {d.page < d.totalPages && (
              <a href={homeUrl({ q: d.q, type: d.type, generation: d.generation, page: d.page + 1 })}>
                Next page
              </a>
            )}
          </div>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Pokédex',
};
