import { mapLimit } from '../api';
import { cardList } from '../cards';
import { h } from '../dom';
import {
  loadAllTypes,
  loadGenerations,
  loadPokemonTypeNames,
  loadSpeciesList,
  parseIdFromRef,
  type GenerationInfo,
  type SpeciesRef,
  type TypeInfo,
} from '../data';
import { humanize } from '../format';
import type { PageContext } from '../types';

const PAGE_SIZE = 48;

interface HomeState {
  q: string;
  type: string;
  generation: string;
  page: number;
}

function stateFromUrl(params: URLSearchParams): HomeState {
  const page = Number(params.get('page') ?? '1');
  return {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

function homeHref(state: HomeState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type) params.set('type', state.type);
  if (state.generation) params.set('generation', state.generation);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

function generationSpeciesIds(generation: GenerationInfo | undefined): Set<number> {
  const ids = new Set<number>();
  for (const ref of generation?.data.pokemon_species ?? []) {
    const id = parseIdFromRef(ref);
    if (id !== null && id <= 10000) ids.add(id);
  }
  return ids;
}

function typeSpeciesIds(type: TypeInfo | undefined): Set<number> {
  const ids = new Set<number>();
  for (const entry of type?.data.pokemon ?? []) {
    const id = parseIdFromRef(entry.pokemon);
    if (id !== null && id <= 10000) ids.add(id);
  }
  return ids;
}

export async function renderHome(ctx: PageContext): Promise<void> {
  const [species, generations, types] = await Promise.all([
    loadSpeciesList(),
    loadGenerations(),
    loadAllTypes(),
  ]);
  if (!ctx.isCurrent()) return;

  ctx.setTitle('Pokédex');
  const state = stateFromUrl(ctx.params);
  const selectedType = types.find((entry) => entry.name === state.type);
  const selectedGeneration = generations.find((entry) => entry.name === state.generation);

  let activeTypeIds: Set<number> | null = state.type
    ? selectedType
      ? typeSpeciesIds(selectedType)
      : new Set<number>()
    : null;
  let activeGenerationIds: Set<number> | null = state.generation
    ? selectedGeneration
      ? generationSpeciesIds(selectedGeneration)
      : new Set<number>()
    : null;

  const searchInput = h('input', {
    id: 'search',
    type: 'search',
    name: 'q',
    value: state.q,
    autocomplete: 'off',
  });

  const typeSelect = h(
    'select',
    { id: 'type-filter', name: 'type' },
    h('option', { value: '' }, 'All types'),
    ...types.map((entry) => h('option', { value: entry.name }, entry.englishName)),
  );
  typeSelect.value = selectedType?.name ?? '';

  const generationSelect = h(
    'select',
    { id: 'generation-filter', name: 'generation' },
    h('option', { value: '' }, 'All generations'),
    ...generations.map((entry) => h('option', { value: entry.name }, entry.englishName)),
  );
  generationSelect.value = selectedGeneration?.name ?? '';

  const countLine = h('p', { class: 'result-count' });
  const results = h('div', { class: 'home-results' });
  const pagination = h('div', { class: 'pagination' });

  ctx.main.replaceChildren(
    h(
      'div',
      { class: 'container page' },
      h('h1', {}, 'Pokémon'),
      h(
        'div',
        { class: 'filters' },
        h('div', { class: 'field field-search' }, h('label', { for: 'search' }, 'Search'), searchInput),
        h('div', { class: 'field' }, h('label', { for: 'type-filter' }, 'Type'), typeSelect),
        h(
          'div',
          { class: 'field' },
          h('label', { for: 'generation-filter' }, 'Generation'),
          generationSelect,
        ),
      ),
      countLine,
      results,
      pagination,
    ),
  );

  let resultVersion = 0;
  let searchTimer: number | undefined;

  const filteredSpecies = (): SpeciesRef[] => {
    const query = state.q.toLowerCase();
    return species.filter((entry) => {
      if (query && !humanize(entry.name).toLowerCase().includes(query)) return false;
      if (activeGenerationIds && !activeGenerationIds.has(entry.id)) return false;
      if (activeTypeIds && !activeTypeIds.has(entry.id)) return false;
      return true;
    });
  };

  const updateUrl = (mode: 'push' | 'replace'): void => {
    const href = homeHref(state);
    if (mode === 'push') history.pushState(null, '', href);
    else history.replaceState(null, '', href);
  };

  const goToPage = (target: number): void => {
    state.page = target;
    updateUrl('push');
    void renderResults();
    window.scrollTo({ top: 0 });
  };

  const renderResults = async (): Promise<void> => {
    const version = ++resultVersion;
    const matches = filteredSpecies();
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), totalPages);

    countLine.textContent = `${matches.length} Pokémon`;

    if (matches.length === 0) {
      results.replaceChildren(h('p', { class: 'empty-state' }, 'No Pokémon found'));
      pagination.replaceChildren();
      return;
    }

    const start = (state.page - 1) * PAGE_SIZE;
    const pageSpecies = matches.slice(start, start + PAGE_SIZE);
    const typeLists = await mapLimit(pageSpecies, 12, (entry) => loadPokemonTypeNames(entry.id));
    if (version !== resultVersion || !ctx.isCurrent()) return;

    const typeById = new Map<number, string[]>();
    pageSpecies.forEach((entry, index) => typeById.set(entry.id, typeLists[index]));

    results.replaceChildren(
      cardList(pageSpecies, (entry) => ({ types: typeById.get(entry.id) ?? [] })),
    );

    const previous =
      state.page > 1
        ? h(
            'a',
            {
              href: homeHref({ ...state, page: state.page - 1 }),
              onclick: (event: Event) => {
                event.preventDefault();
                goToPage(state.page - 1);
              },
            },
            'Previous page',
          )
        : null;
    const next =
      state.page < totalPages
        ? h(
            'a',
            {
              href: homeHref({ ...state, page: state.page + 1 }),
              onclick: (event: Event) => {
                event.preventDefault();
                goToPage(state.page + 1);
              },
            },
            'Next page',
          )
        : null;

    pagination.replaceChildren(
      previous ?? '',
      h('p', { class: 'page-status' }, `Page ${state.page} of ${totalPages}`),
      next ?? '',
    );
  };

  searchInput.addEventListener('input', () => {
    state.q = searchInput.value;
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      if (!ctx.isCurrent()) return;
      state.page = 1;
      updateUrl('replace');
      void renderResults();
    }, 200);
  });

  typeSelect.addEventListener('change', () => {
    state.type = typeSelect.value;
    state.page = 1;
    activeTypeIds = state.type ? typeSpeciesIds(types.find((entry) => entry.name === state.type)) : null;
    updateUrl('push');
    void renderResults();
  });

  generationSelect.addEventListener('change', () => {
    state.generation = generationSelect.value;
    state.page = 1;
    activeGenerationIds = state.generation
      ? generationSpeciesIds(generations.find((entry) => entry.name === state.generation))
      : null;
    updateUrl('push');
    void renderResults();
  });

  await renderResults();
}
