import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, useLocation, type DocumentHead } from '@builder.io/qwik-city';
import { getHomeIndex } from '~/lib/api';
import { humanize } from '~/lib/format';
import { HomeCards } from '~/components/ui';

export const useHomeData = routeLoader$(async () => getHomeIndex());

const PAGE_SIZE = 48;

function buildHomeUrl(q: string, type: string, generation: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export default component$(() => {
  const data = useHomeData();
  const location = useLocation();

  const q = useSignal(location.url.searchParams.get('q') ?? '');
  const selectedType = useSignal(location.url.searchParams.get('type') ?? '');
  const selectedGeneration = useSignal(location.url.searchParams.get('generation') ?? '');
  const page = useSignal(Math.max(1, Number(location.url.searchParams.get('page')) || 1));

  // Keep the controls in sync with browser back/forward navigation.
  useVisibleTask$(({ cleanup }) => {
    const sync = () => {
      const params = new URL(location.url.href).searchParams;
      q.value = params.get('q') ?? '';
      selectedType.value = params.get('type') ?? '';
      selectedGeneration.value = params.get('generation') ?? '';
      page.value = Math.max(1, Number(params.get('page')) || 1);
    };
    window.addEventListener('popstate', sync);
    cleanup(() => window.removeEventListener('popstate', sync));
  });

  const query = q.value.trim().toLowerCase();
  const filtered = data.value.cards.filter((card) => {
    if (selectedType.value && !card.types.includes(selectedType.value)) return false;
    if (selectedGeneration.value && card.generation !== selectedGeneration.value) return false;
    if (query && !humanize(card.name).toLowerCase().includes(query)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page.value), totalPages);
  const pageCards = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <h1>Pokémon</h1>

      <div class="filters">
        <div class="field field--search">
          <label for="pokemon-search">Search</label>
          <input
            id="pokemon-search"
            type="search"
            value={q.value}
            onInput$={(event) => {
              const value = (event.target as HTMLInputElement).value;
              q.value = value;
              page.value = 1;
              window.history.replaceState(
                window.history.state,
                '',
                buildHomeUrl(value, selectedType.value, selectedGeneration.value, 1),
              );
            }}
          />
        </div>
        <div class="field">
          <label for="pokemon-type">Type</label>
          <select
            id="pokemon-type"
            value={selectedType.value}
            onChange$={(event) => {
              const value = (event.target as HTMLSelectElement).value;
              selectedType.value = value;
              page.value = 1;
              window.history.pushState(
                window.history.state,
                '',
                buildHomeUrl(q.value, value, selectedGeneration.value, 1),
              );
            }}
          >
            <option value="" selected={selectedType.value === ''}>All types</option>
            {data.value.types.map((type) => (
              <option key={type.name} value={type.name} selected={selectedType.value === type.name}>{type.label}</option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="pokemon-generation">Generation</label>
          <select
            id="pokemon-generation"
            value={selectedGeneration.value}
            onChange$={(event) => {
              const value = (event.target as HTMLSelectElement).value;
              selectedGeneration.value = value;
              page.value = 1;
              window.history.pushState(
                window.history.state,
                '',
                buildHomeUrl(q.value, selectedType.value, value, 1),
              );
            }}
          >
            <option value="" selected={selectedGeneration.value === ''}>All generations</option>
            {data.value.generations.map((generation) => (
              <option key={generation.name} value={generation.name} selected={selectedGeneration.value === generation.name}>{generation.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p class="result-count">{filtered.length} Pokémon</p>

      {filtered.length === 0 ? (
        <p class="empty-state">No Pokémon found</p>
      ) : (
        <HomeCards cards={pageCards} />
      )}

      {filtered.length > 0 && (
        <nav class="pagination" aria-label="Pagination">
          <span>Page {currentPage} of {totalPages}</span>
          {currentPage > 1 && (
            <a
              href={buildHomeUrl(q.value, selectedType.value, selectedGeneration.value, currentPage - 1)}
              rel="prev"
              onClick$={(event) => {
                event.preventDefault();
                page.value = currentPage - 1;
                window.history.pushState(
                  window.history.state,
                  '',
                  buildHomeUrl(q.value, selectedType.value, selectedGeneration.value, currentPage - 1),
                );
              }}
            >
              Previous page
            </a>
          )}
          {currentPage < totalPages && (
            <a
              href={buildHomeUrl(q.value, selectedType.value, selectedGeneration.value, currentPage + 1)}
              rel="next"
              onClick$={(event) => {
                event.preventDefault();
                page.value = currentPage + 1;
                window.history.pushState(
                  window.history.state,
                  '',
                  buildHomeUrl(q.value, selectedType.value, selectedGeneration.value, currentPage + 1),
                );
              }}
            >
              Next page
            </a>
          )}
        </nav>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Pokédex',
};
