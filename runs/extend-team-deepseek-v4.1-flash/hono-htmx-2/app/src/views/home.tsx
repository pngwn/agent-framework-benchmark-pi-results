import { allSpecies, generations, humanize, mainTypes, typesByPokemonId, type Card } from '../data';
import { CardList, Count } from './components';

export const PAGE_SIZE = 48;

export type HomeQuery = { q: string; type: string; generation: string; page: number };

export function parseHomeQuery(query: Record<string, string | undefined>): HomeQuery {
  const page = Number.parseInt(query.page ?? '', 10);
  return {
    q: (query.q ?? '').trim(),
    type: query.type ?? '',
    generation: query.generation ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Canonical URL for a filter state: empty and default parameters left out. */
export function homeUrl({ q, type, generation, page }: HomeQuery) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export async function loadHome(query: HomeQuery) {
  const [species, types, gens, typesById] = await Promise.all([allSpecies(), mainTypes(), generations(), typesByPokemonId()]);
  const needle = query.q.toLowerCase();
  const gen = gens.find((g) => g.name === query.generation);
  const type = types.find((t) => t.name === query.type);
  const matches = species.filter(
    (s) =>
      (!needle || humanize(s.name).toLowerCase().includes(needle)) &&
      (!gen || gen.speciesIds.has(s.id)) &&
      (!type || typesById.get(s.id)?.some((t) => t.name === type.name)),
  );
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const cards: Card[] = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((s) => ({ ...s, types: typesById.get(s.id) ?? [] }));
  return { query: { ...query, page }, types, gens, cards, count: matches.length, totalPages };
}

type HomeData = Awaited<ReturnType<typeof loadHome>>;

export const Results = ({ data }: { data: HomeData }) => {
  const { query, count, cards, totalPages } = data;
  return (
    <div id="results" aria-live="polite">
      {count ? <Count n={count} /> : <p class="count">No Pokémon found</p>}
      {count > 0 && <CardList cards={cards} />}
      {count > 0 && (
        <nav class="pagination" aria-label="Pagination">
          {query.page > 1 && <a href={homeUrl({ ...query, page: query.page - 1 })}>Previous page</a>}
          <span>
            Page {query.page} of {totalPages}
          </span>
          {query.page < totalPages && <a href={homeUrl({ ...query, page: query.page + 1 })}>Next page</a>}
        </nav>
      )}
    </div>
  );
};

export const HomePage = ({ data }: { data: HomeData }) => {
  const { query, types, gens } = data;
  return (
    <>
      <h1>Pokémon</h1>
      <form
        class="filters"
        action="/"
        method="get"
        role="search"
        hx-get="/"
        hx-target="#results"
        hx-swap="outerHTML"
        hx-sync="this:replace"
      >
        <div class="field field-search">
          <label for="q">Search</label>
          <input
            id="q"
            type="search"
            name="q"
            value={query.q}
            autocomplete="off"
            hx-get="/"
            hx-trigger="input changed delay:200ms, search"
            hx-include="closest form" hx-sync="closest form:replace"
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type" hx-get="/" hx-trigger="change" hx-include="closest form" hx-sync="closest form:replace">
            <option value="">All types</option>
            {types.map((t) => (
              <option value={t.name} selected={t.name === query.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation" hx-get="/" hx-trigger="change" hx-include="closest form" hx-sync="closest form:replace">
            <option value="">All generations</option>
            {gens.map((g) => (
              <option value={g.name} selected={g.name === query.generation}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>
      <Results data={data} />
    </>
  );
};
