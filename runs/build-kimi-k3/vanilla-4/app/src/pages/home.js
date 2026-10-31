// `/` — the filterable, paginated Pokémon list.

import { loadCatalog } from '../catalog.js';
import { cardListHtml, pokemonCardHtml } from '../components.js';
import { esc } from '../util.js';

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 200;

export async function renderHome(main, url, ctx) {
  document.title = 'Pokédex';

  const state = {
    q: url.searchParams.get('q') ?? '',
    type: url.searchParams.get('type') ?? '',
    generation: url.searchParams.get('generation') ?? '',
    page: Math.max(1, parseInt(url.searchParams.get('page') ?? '', 10) || 1),
  };

  main.innerHTML = `
    <h1>Pokémon</h1>
    <form class="controls" action="/" method="get">
      <div class="field">
        <label for="filter-search">Search</label>
        <input type="search" id="filter-search" name="q" value="${esc(state.q)}" autocomplete="off" />
      </div>
      <div class="field">
        <label for="filter-type">Type</label>
        <select id="filter-type" name="type"><option value="">All types</option></select>
      </div>
      <div class="field">
        <label for="filter-generation">Generation</label>
        <select id="filter-generation" name="generation"><option value="">All generations</option></select>
      </div>
    </form>
    <div id="results"><p class="status-text">Loading…</p></div>`;

  const catalog = await loadCatalog();
  if (ctx.stale()) return;

  // Drop filter values the API doesn't know about.
  if (state.type && !catalog.typeEn.has(state.type)) state.type = '';
  if (state.generation && !catalog.generations.some((g) => g.name === state.generation)) state.generation = '';

  const typeSelect = main.querySelector('#filter-type');
  const generationSelect = main.querySelector('#filter-generation');
  const searchInput = main.querySelector('#filter-search');
  const results = main.querySelector('#results');

  for (const type of catalog.types) {
    typeSelect.insertAdjacentHTML('beforeend', `<option value="${esc(type.name)}">${esc(type.en)}</option>`);
  }
  for (const generation of catalog.generations) {
    generationSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${esc(generation.name)}">${esc(generation.en)}</option>`,
    );
  }
  typeSelect.value = state.type;
  generationSelect.value = state.generation;

  function syncUrl({ replace = false } = {}) {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.type) params.set('type', state.type);
    if (state.generation) params.set('generation', state.generation);
    if (state.page > 1) params.set('page', String(state.page));
    const query = params.toString();
    const next = `/${query ? `?${query}` : ''}`;
    if (replace) history.replaceState(null, '', next);
    else history.pushState(null, '', next);
  }

  function matchingSpecies() {
    let list = catalog.species;
    if (state.q) {
      const needle = state.q.toLowerCase();
      list = list.filter((s) => s.human.toLowerCase().includes(needle));
    }
    if (state.type) list = list.filter((s) => s.types.includes(state.type));
    if (state.generation) list = list.filter((s) => s.generation === state.generation);
    return list;
  }

  function renderResults() {
    const list = matchingSpecies();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const page = Math.min(state.page, totalPages);
    state.page = page;
    const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const count = `<p class="count">${list.length} Pokémon</p>`;
    const body = list.length
      ? cardListHtml(
          slice.map((s) =>
            pokemonCardHtml({
              id: s.id,
              speciesName: s.name,
              label: s.human,
              types: s.types.map((name) => ({ name, en: catalog.typeEn.get(name) ?? name })),
            }),
          ),
        )
      : '<p class="status-text">No Pokémon found</p>';

    const pageLinks = [];
    if (page > 1) pageLinks.push(`<a href="${pageUrl(state, page - 1)}">Previous page</a>`);
    if (page < totalPages) pageLinks.push(`<a href="${pageUrl(state, page + 1)}">Next page</a>`);
    const pagination = `<nav class="pagination" aria-label="Pagination">
      <span>Page ${page} of ${totalPages}</span>${pageLinks.join('')}
    </nav>`;

    results.innerHTML = count + body + pagination;
  }

  function pageUrl(current, page) {
    const params = new URLSearchParams();
    if (current.q) params.set('q', current.q);
    if (current.type) params.set('type', current.type);
    if (current.generation) params.set('generation', current.generation);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return `/${query ? `?${query}` : ''}`;
  }

  let debounce = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (ctx.stale()) return;
      state.q = searchInput.value;
      state.page = 1;
      syncUrl({ replace: true });
      renderResults();
    }, SEARCH_DEBOUNCE_MS);
  });

  typeSelect.addEventListener('change', () => {
    state.type = typeSelect.value;
    state.page = 1;
    syncUrl();
    renderResults();
  });

  generationSelect.addEventListener('change', () => {
    state.generation = generationSelect.value;
    state.page = 1;
    syncUrl();
    renderResults();
  });

  renderResults();
}
