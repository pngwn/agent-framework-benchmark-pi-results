import {
  englishName,
  getAllGenerations,
  getAllTypes,
  getSpeciesMaps,
  humanize,
  hydrateSprites,
} from '../api.js';
import { el, heading, pokemonCard, pokemonGrid } from '../ui.js';

const PAGE_SIZE = 48;

let homeDataPromise;

function loadHomeData() {
  if (!homeDataPromise) {
    homeDataPromise = Promise.all([getSpeciesMaps(), getAllTypes(), getAllGenerations()]).then(
      ([maps, typeDetails, generationDetails]) => {
        const typeOptions = typeDetails.map((type) => ({
          slug: type.name,
          label: englishName(type),
        }));
        const generationOptions = generationDetails.map((generation) => ({
          name: generation.name,
          label: englishName(generation),
        }));

        const pokemonTypes = new Map();
        for (const type of typeDetails) {
          const typeInfo = { slug: type.name, label: englishName(type) };
          for (const entry of type.pokemon ?? []) {
            const id = Number(entry.pokemon?.url?.match(/\/(\d+)\/?$/)?.[1]);
            if (!Number.isFinite(id) || id > 10000) continue;
            if (!pokemonTypes.has(id)) pokemonTypes.set(id, []);
            pokemonTypes.get(id).push({ ...typeInfo, slot: entry.slot ?? 0 });
          }
        }
        for (const types of pokemonTypes.values()) {
          types.sort((a, b) => a.slot - b.slot || a.slug.localeCompare(b.slug));
        }

        const generationBySpecies = new Map();
        for (const generation of generationDetails) {
          const generationInfo = { name: generation.name, label: englishName(generation) };
          for (const species of generation.pokemon_species ?? []) {
            const id = Number(species.url?.match(/\/(\d+)\/?$/)?.[1]);
            if (Number.isFinite(id)) generationBySpecies.set(id, generationInfo);
          }
        }

        const species = maps.list.map((item) => ({
          id: item.id,
          slug: item.name,
          label: humanize(item.name),
          types: pokemonTypes.get(item.id) ?? [],
          generation: generationBySpecies.get(item.id)?.name ?? '',
        }));

        return {
          species,
          typeOptions,
          generationOptions,
          typeBySlug: new Map(typeOptions.map((type) => [type.slug, type])),
        };
      },
    ).catch((error) => {
      homeDataPromise = undefined;
      throw error;
    });
  }
  return homeDataPromise;
}

function parseState(searchParams) {
  return {
    q: searchParams.get('q') ?? '',
    type: searchParams.get('type') ?? '',
    generation: searchParams.get('generation') ?? '',
    page: Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1),
  };
}

function homeUrl(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type) params.set('type', state.type);
  if (state.generation) params.set('generation', state.generation);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

function filteredSpecies(data, state) {
  const query = state.q.toLowerCase();
  return data.species.filter((species) => {
    if (query && !species.label.toLowerCase().includes(query)) return false;
    if (state.type && !species.types.some((type) => type.slug === state.type)) return false;
    if (state.generation && species.generation !== state.generation) return false;
    return true;
  });
}

function paginationLink(label, page, className) {
  const params = new URLSearchParams();
  const current = new URLSearchParams(location.search);
  for (const key of ['q', 'type', 'generation']) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return el('a', {
    class: className,
    href: query ? `/?${query}` : '/',
    text: label,
  });
}

function fillResults(host, data, state) {
  const matches = filteredSpecies(data, state);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = matches.slice(start, start + PAGE_SIZE);

  const children = [
    el('p', { class: 'count-text', text: `${matches.length} Pokémon` }),
  ];

  if (!matches.length) {
    children.push(el('p', { class: 'empty-message', text: 'No Pokémon found' }));
  } else {
    children.push(
      pokemonGrid(
        pageItems.map((species) =>
          pokemonCard(species, {
            showTypes: true,
          }),
        ),
      ),
    );

    const pager = el(
      'div',
      { class: 'pagination' },
      el('span', { class: 'page-indicator', text: `Page ${page} of ${totalPages}` }),
    );
    if (page > 1) pager.append(paginationLink('Previous page', page - 1, 'page-link'));
    if (page < totalPages) pager.append(paginationLink('Next page', page + 1, 'page-link'));
    children.push(pager);
  }

  host.replaceChildren(...children);
  hydrateSprites(
    pageItems.map((species) => species.id),
    host,
  );
}

export async function renderHome(_main, searchParams, isCurrent) {
  const data = await loadHomeData();
  if (!isCurrent()) return null;

  const state = parseState(searchParams);

  const search = el('input', {
    id: 'search-input',
    type: 'search',
    value: state.q,
    autocomplete: 'off',
  });
  const typeSelect = el(
    'select',
    { id: 'type-select' },
    el('option', { value: '', text: 'All types' }),
    data.typeOptions.map((type) =>
      el('option', {
        value: type.slug,
        text: type.label,
        selected: type.slug === state.type,
      }),
    ),
  );
  const generationSelect = el(
    'select',
    { id: 'generation-select' },
    el('option', { value: '', text: 'All generations' }),
    data.generationOptions.map((generation) =>
      el('option', {
        value: generation.name,
        text: generation.label,
        selected: generation.name === state.generation,
      }),
    ),
  );

  typeSelect.value = state.type;
  generationSelect.value = state.generation;

  const controls = el(
    'div',
    { class: 'filter-controls' },
    el(
      'div',
      { class: 'field field-search' },
      el('label', { for: 'search-input', text: 'Search' }),
      search,
    ),
    el(
      'div',
      { class: 'field' },
      el('label', { for: 'type-select', text: 'Type' }),
      typeSelect,
    ),
    el(
      'div',
      { class: 'field' },
      el('label', { for: 'generation-select', text: 'Generation' }),
      generationSelect,
    ),
  );

  const resultsHost = el('div', { class: 'home-results' });
  fillResults(resultsHost, data, state);

  search.addEventListener('input', () => {
    state.q = search.value;
    state.page = 1;
    history.replaceState(history.state, '', homeUrl(state));
    fillResults(resultsHost, data, state);
  });

  typeSelect.addEventListener('change', () => {
    state.type = typeSelect.value;
    state.page = 1;
    history.pushState({}, '', homeUrl(state));
    fillResults(resultsHost, data, state);
  });

  generationSelect.addEventListener('change', () => {
    state.generation = generationSelect.value;
    state.page = 1;
    history.pushState({}, '', homeUrl(state));
    fillResults(resultsHost, data, state);
  });

  return {
    title: 'Pokédex',
    content: el(
      'div',
      { class: 'home-page' },
      heading(1, 'Pokémon'),
      controls,
      resultsHost,
    ),
  };
}
