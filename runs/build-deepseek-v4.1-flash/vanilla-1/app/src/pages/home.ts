import { getHomeData, humanize } from '../api';
import { escapeHtml, pokemonCardList } from '../components';

interface HomeState {
  q: string;
  type: string;
  generation: string;
  page: number;
}

const PAGE_SIZE = 48;

function buildUrl(state: HomeState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type) params.set('type', state.type);
  if (state.generation) params.set('generation', state.generation);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return `/${query ? `?${query}` : ''}`;
}

export async function renderHome(
  main: HTMLElement,
  url: URL,
  isActive: () => boolean,
): Promise<void> {
  const data = await getHomeData();
  if (!isActive()) return;

  const typeNames = new Set(data.types.map((type) => type.name));
  const generationNames = new Set(data.generations.map((generation) => generation.name));
  const requestedType = url.searchParams.get('type') ?? '';
  const requestedGeneration = url.searchParams.get('generation') ?? '';
  const requestedPage = Number(url.searchParams.get('page') ?? '1');

  const state: HomeState = {
    q: url.searchParams.get('q') ?? '',
    type: typeNames.has(requestedType) ? requestedType : '',
    generation: generationNames.has(requestedGeneration) ? requestedGeneration : '',
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1,
  };

  const typeOptions = data.types
    .map(
      (type) =>
        `<option value="${escapeHtml(type.name)}"${type.name === state.type ? ' selected' : ''}>${escapeHtml(type.englishName)}</option>`,
    )
    .join('');
  const generationOptions = data.generations
    .map(
      (generation) =>
        `<option value="${escapeHtml(generation.name)}"${generation.name === state.generation ? ' selected' : ''}>${escapeHtml(generation.englishName)}</option>`,
    )
    .join('');

  main.innerHTML = `
    <div class="page home-page">
      <h1>Pokémon</h1>
      <div class="filter-bar">
        <div class="field search-field">
          <label for="search">Search</label>
          <input id="search" name="q" type="search" autocomplete="off" value="${escapeHtml(state.q)}">
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select id="type-filter" name="type">
            <option value="">All types</option>
            ${typeOptions}
          </select>
        </div>
        <div class="field">
          <label for="generation-filter">Generation</label>
          <select id="generation-filter" name="generation">
            <option value="">All generations</option>
            ${generationOptions}
          </select>
        </div>
      </div>
      <div id="home-results" aria-live="polite"></div>
    </div>`;

  document.title = 'Pokédex';

  const results = main.querySelector<HTMLElement>('#home-results');
  const search = main.querySelector<HTMLInputElement>('#search');
  const typeSelect = main.querySelector<HTMLSelectElement>('#type-filter');
  const generationSelect = main.querySelector<HTMLSelectElement>('#generation-filter');
  if (!results || !search || !typeSelect || !generationSelect) return;

  const update = (): void => {
    const q = state.q.trim().toLowerCase();
    const filtered = data.species.filter((species) => {
      if (q && !humanize(species.name).toLowerCase().includes(q)) return false;
      if (state.type && !species.types.some((type) => type.name === state.type)) return false;
      if (state.generation && data.generationBySpecies.get(species.id) !== state.generation) return false;
      return true;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (totalPages > 0 && state.page > totalPages) state.page = totalPages;
    if (totalPages === 0) state.page = 1;

    if (filtered.length === 0) {
      results.innerHTML = `<p class="count">0 Pokémon</p><p class="empty-results">No Pokémon found</p>`;
      return;
    }

    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    const previous =
      state.page > 1
        ? `<a class="page-link" href="${buildUrl({ ...state, page: state.page - 1 })}">Previous page</a>`
        : '';
    const next =
      state.page < totalPages
        ? `<a class="page-link" href="${buildUrl({ ...state, page: state.page + 1 })}">Next page</a>`
        : '';

    results.innerHTML = `
      <p class="count">${filtered.length} Pokémon</p>
      ${pokemonCardList(pageItems, { showTypes: true })}
      <div class="pagination">
        <span>Page ${state.page} of ${totalPages}</span>
        ${previous}
        ${next}
      </div>`;
  };

  search.addEventListener('input', () => {
    state.q = search.value;
    state.page = 1;
    history.replaceState(null, '', buildUrl(state));
    update();
  });

  typeSelect.addEventListener('change', () => {
    state.type = typeSelect.value;
    state.page = 1;
    history.pushState(null, '', buildUrl(state));
    update();
  });

  generationSelect.addEventListener('change', () => {
    state.generation = generationSelect.value;
    state.page = 1;
    history.pushState(null, '', buildUrl(state));
    update();
  });

  update();
}
