import { getAllTypes, buildPokemonTypeMap, getGenerations, getSpeciesList } from '../data.js';
import { escapeHtml, humanize } from '../utils.js';
import { pokemonCard } from '../components.js';

const PAGE_SIZE = 48;

function pageHref(state, page) {
  const params = new URLSearchParams();
  const query = state.q.trim();
  if (query) params.set('q', query);
  if (state.type) params.set('type', state.type);
  if (state.generation) params.set('generation', state.generation);
  if (page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `/?${search}` : '/';
}

export async function renderHome(main) {
  document.title = 'Pokédex';

  const [species, generations, types] = await Promise.all([
    getSpeciesList(),
    getGenerations(),
    getAllTypes(),
  ]);

  const typeMap = buildPokemonTypeMap(types);
  const typeNames = new Set(types.map((type) => type.name));
  const generationNames = new Set(generations.map((generation) => generation.name));
  const generationBySpecies = new Map();
  for (const generation of generations) {
    for (const id of generation.speciesIds) generationBySpecies.set(id, generation);
  }

  const params = new URLSearchParams(location.search);
  const requestedType = params.get('type') ?? '';
  const requestedGeneration = params.get('generation') ?? '';
  const requestedPage = Number.parseInt(params.get('page') ?? '1', 10);

  const state = {
    q: params.get('q') ?? '',
    type: typeNames.has(requestedType) ? requestedType : '',
    generation: generationNames.has(requestedGeneration) ? requestedGeneration : '',
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };

  main.innerHTML = `
    <h1>Pokémon</h1>
    <div class="filters">
      <div class="field search-field">
        <label for="search">Search</label>
        <input id="search" name="search" type="search" value="${escapeHtml(state.q)}" autocomplete="off">
      </div>
      <div class="field">
        <label for="type-select">Type</label>
        <select id="type-select" name="type">
          <option value="">All types</option>
          ${types.map((type) => `<option value="${escapeHtml(type.name)}"${type.name === state.type ? ' selected' : ''}>${escapeHtml(type.label ?? humanize(type.name))}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="generation-select">Generation</label>
        <select id="generation-select" name="generation">
          <option value="">All generations</option>
          ${generations.map((generation) => `<option value="${escapeHtml(generation.name)}"${generation.name === state.generation ? ' selected' : ''}>${escapeHtml(generation.label)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="home-results"></div>
  `;

  const resultsEl = main.querySelector('#home-results');
  const searchInput = main.querySelector('#search');
  const typeSelect = main.querySelector('#type-select');
  const generationSelect = main.querySelector('#generation-select');

  function filteredSpecies() {
    const query = state.q.trim().toLowerCase();
    return species.filter((entry) => {
      if (query && !humanize(entry.name).toLowerCase().includes(query)) return false;

      if (state.type) {
        const entryTypes = typeMap.get(entry.id) ?? [];
        if (!entryTypes.some((type) => type.name === state.type)) return false;
      }

      if (state.generation) {
        const generation = generationBySpecies.get(entry.id);
        if (!generation || generation.name !== state.generation) return false;
      }

      return true;
    });
  }

  function renderResults() {
    const matches = filteredSpecies();
    const count = matches.length;
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), totalPages);

    const start = (state.page - 1) * PAGE_SIZE;
    const pageEntries = matches.slice(start, start + PAGE_SIZE);

    let html = `<p class="count">${count} Pokémon</p>`;

    if (!count) {
      html += '<p class="empty">No Pokémon found</p>';
    } else {
      html += `<ul class="card-grid">${pageEntries.map((entry) => pokemonCard({
        id: entry.id,
        name: entry.name,
        types: (typeMap.get(entry.id) ?? []).map((type) => type.name),
        showTypes: true,
      })).join('')}</ul>`;

      html += '<div class="pagination">';
      html += `<span>Page ${state.page} of ${totalPages}</span>`;
      if (state.page > 1) {
        html += `<a href="${pageHref(state, state.page - 1)}">Previous page</a>`;
      }
      if (state.page < totalPages) {
        html += `<a href="${pageHref(state, state.page + 1)}">Next page</a>`;
      }
      html += '</div>';
    }

    resultsEl.innerHTML = html;
  }

  function syncUrl() {
    const href = pageHref(state, state.page);
    if (`${location.pathname}${location.search}` !== href) {
      history.replaceState(null, '', href);
    }
  }

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput.value;
      state.page = 1;
      renderResults();
      syncUrl();
    }, 150);
  });

  typeSelect.addEventListener('change', () => {
    state.type = typeSelect.value;
    state.page = 1;
    renderResults();
    syncUrl();
  });

  generationSelect.addEventListener('change', () => {
    state.generation = generationSelect.value;
    state.page = 1;
    renderResults();
    syncUrl();
  });

  renderResults();
  syncUrl();
}
