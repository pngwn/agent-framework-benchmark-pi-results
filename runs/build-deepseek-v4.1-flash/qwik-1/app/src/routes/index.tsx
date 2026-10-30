import { $, component$, isBrowser, useSignal, useTask$ } from '@builder.io/qwik';
import {
  routeLoader$,
  useLocation,
  useNavigate,
  type DocumentHead,
} from '@builder.io/qwik-city';
import { PokemonCard } from '../components/pokemon-card';
import { getPokemonListData, type PokemonListData } from '../lib/api';

export const usePokemonList = routeLoader$(({ url }) => getPokemonListData(url));

function listUrl(
  q: string,
  type: string,
  generation: string,
  page: number,
): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export default component$(() => {
  const data = usePokemonList();
  const location = useLocation();
  const navigate = useNavigate();
  const search = useSignal(data.value.q);
  const selectedType = useSignal(data.value.type);
  const selectedGeneration = useSignal(data.value.generation);
  const searchDirty = useSignal(false);

  useTask$(({ track }) => {
    const value = track(() => data.value) as PokemonListData;
    search.value = value.q;
    selectedType.value = value.type;
    selectedGeneration.value = value.generation;
  });

  useTask$(({ track, cleanup }) => {
    const value = track(() => search.value);
    const dirty = track(() => searchDirty.value);
    if (!isBrowser || !dirty) return;
    const timer = setTimeout(() => {
      searchDirty.value = false;
      const params = new URLSearchParams(location.url.searchParams);
      if (value) params.set('q', value);
      else params.delete('q');
      params.delete('page');
      const query = params.toString();
      navigate(query ? `/?${query}` : '/', { replaceState: true });
    }, 250);
    cleanup(() => clearTimeout(timer));
  });

  const onSearch$ = $((event: Event, element: HTMLInputElement) => {
    search.value = element.value;
    searchDirty.value = true;
  });

  const onTypeChange$ = $((event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    selectedType.value = value;
    searchDirty.value = false;
    const params = new URLSearchParams(location.url.searchParams);
    if (search.value) params.set('q', search.value);
    else params.delete('q');
    if (value) params.set('type', value);
    else params.delete('type');
    params.delete('page');
    const query = params.toString();
    navigate(query ? `/?${query}` : '/');
  });

  const onGenerationChange$ = $((event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    selectedGeneration.value = value;
    searchDirty.value = false;
    const params = new URLSearchParams(location.url.searchParams);
    if (search.value) params.set('q', search.value);
    else params.delete('q');
    if (value) params.set('generation', value);
    else params.delete('generation');
    params.delete('page');
    const query = params.toString();
    navigate(query ? `/?${query}` : '/');
  });

  return (
    <div class="home-page">
      <h1>Pokémon</h1>

      <div class="filter-controls">
        <div class="field field-search">
          <label for="pokemon-search">Search</label>
          <input
            id="pokemon-search"
            type="search"
            value={search.value}
            onInput$={onSearch$}
          />
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select id="type-filter" value={selectedType.value} onChange$={onTypeChange$}>
            <option value="">All types</option>
            {data.value.typeRefs.map((type) => (
              <option value={type.name} selected={selectedType.value === type.name} key={type.name}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation-filter">Generation</label>
          <select
            id="generation-filter"
            value={selectedGeneration.value}
            onChange$={onGenerationChange$}
          >
            <option value="">All generations</option>
            {data.value.generationRefs.map((generation) => (
              <option
                value={generation.name}
                selected={selectedGeneration.value === generation.name}
                key={generation.name}
              >
                {generation.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p class="result-count">{data.value.count} Pokémon</p>

      {data.value.cards.length ? (
        <ul class="pokemon-grid">
          {data.value.cards.map((card) => (
            <PokemonCard card={card} showTypes={true} key={card.id} />
          ))}
        </ul>
      ) : (
        <p class="no-results">No Pokémon found</p>
      )}

      {data.value.count ? (
        <div class="pagination">
          <span>
            Page {data.value.page} of {data.value.totalPages}
          </span>
          {data.value.page > 1 ? (
            <a
              href={listUrl(
                data.value.q,
                data.value.type,
                data.value.generation,
                data.value.page - 1,
              )}
            >
              Previous page
            </a>
          ) : null}
          {data.value.page < data.value.totalPages ? (
            <a
              href={listUrl(
                data.value.q,
                data.value.type,
                data.value.generation,
                data.value.page + 1,
              )}
            >
              Next page
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Pokédex',
};
