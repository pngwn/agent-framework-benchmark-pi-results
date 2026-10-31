import {
  getGenerations,
  getSpeciesGenerations,
  getSpeciesList,
  getSpeciesTypes,
  getTypeRecords,
  type SpeciesRef,
} from '../data';
import { pokemonCard } from '../components';
import { enName, esc, humanize } from '../util';

const PAGE_SIZE = 48;

interface FilterState {
  q: string;
  type: string;
  generation: string;
  page: number;
}

function stateFromParams(params: URLSearchParams): FilterState {
  const page = Math.max(1, parseInt(params.get('page') ?? '', 10) || 1);
  return {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page,
  };
}

function queryFor(state: FilterState): string {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.type) p.set('type', state.type);
  if (state.generation) p.set('generation', state.generation);
  if (state.page > 1) p.set('page', String(state.page));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function renderHome(root: HTMLElement, params: URLSearchParams): Promise<void> {
  document.title = 'Pokédex';

  const [species, typeRecords, generations, speciesTypes, speciesGens] = await Promise.all([
    getSpeciesList(),
    getTypeRecords(),
    getGenerations(),
    getSpeciesTypes(),
    getSpeciesGenerations(),
  ]);

  const typeNames = typeRecords.map((t) => t.name as string);
  const genNames = generations.map((g) => g.name as string);

  let state = stateFromParams(params);
  // Ignore invalid filter values.
  if (!typeNames.includes(state.type)) state = { ...state, type: '' };
  if (!genNames.includes(state.generation)) state = { ...state, generation: '' };

  root.innerHTML = `
    <h1>Pokémon</h1>
    <form class="filters" role="search" aria-label="Filter Pokémon">
      <div class="field field-search">
        <label for="filter-q">Search</label>
        <input type="search" id="filter-q" name="q" value="${esc(state.q)}" autocomplete="off" />
      </div>
      <div class="field">
        <label for="filter-type">Type</label>
        <select id="filter-type" name="type">
          <option value="">All types</option>
          ${typeRecords
            .map(
              (t) =>
                `<option value="${esc(t.name)}"${t.name === state.type ? ' selected' : ''}>${esc(enName(t))}</option>`,
            )
            .join('')}
        </select>
      </div>
      <div class="field">
        <label for="filter-generation">Generation</label>
        <select id="filter-generation" name="generation">
          <option value="">All generations</option>
          ${generations
            .map(
              (g) =>
                `<option value="${esc(g.name)}"${g.name === state.generation ? ' selected' : ''}>${esc(enName(g))}</option>`,
            )
            .join('')}
        </select>
      </div>
    </form>
    <div class="results" id="results"></div>`;

  const form = root.querySelector<HTMLFormElement>('.filters')!;
  const input = root.querySelector<HTMLInputElement>('#filter-q')!;
  const typeSelect = root.querySelector<HTMLSelectElement>('#filter-type')!;
  const genSelect = root.querySelector<HTMLSelectElement>('#filter-generation')!;
  const results = root.querySelector<HTMLElement>('#results')!;

  form.addEventListener('submit', (e) => e.preventDefault());

  function matches(s: SpeciesRef, st: FilterState): boolean {
    if (st.q && !humanize(s.name).toLowerCase().includes(st.q.toLowerCase())) return false;
    if (st.type && !(speciesTypes.get(s.id) ?? []).some((t) => t.name === st.type)) return false;
    if (st.generation && speciesGens.get(s.id) !== st.generation) return false;
    return true;
  }

  function draw(st: FilterState): void {
    const filtered = species.filter((s) => matches(s, st));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(Math.max(1, st.page), totalPages);
    const pageSpecies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const count = `<p class="count">${filtered.length} Pokémon</p>`;
    const list = filtered.length
      ? `<ul class="card-grid">${pageSpecies
          .map((s) => pokemonCard(s, { types: speciesTypes.get(s.id) ?? [] }))
          .join('')}</ul>`
      : '<p class="empty">No Pokémon found</p>';

    const pageHref = (n: number) => `/${queryFor({ ...st, page: n })}`;
    const pagination = `
      <p class="pagination">
        ${page > 1 ? `<a href="${pageHref(page - 1)}">Previous page</a>` : ''}
        <span>Page ${page} of ${totalPages}</span>
        ${page < totalPages ? `<a href="${pageHref(page + 1)}">Next page</a>` : ''}
      </p>`;

    results.innerHTML = count + list + pagination;
  }

  function update(next: FilterState, replace: boolean): void {
    state = next;
    history[replace ? 'replaceState' : 'pushState'](null, '', `/${queryFor(next)}`);
    draw(next);
  }

  let debounce: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      update({ ...state, q: input.value.trim(), page: 1 }, true);
    }, 200);
  });
  typeSelect.addEventListener('change', () => update({ ...state, type: typeSelect.value, page: 1 }, false));
  genSelect.addEventListener('change', () => update({ ...state, generation: genSelect.value, page: 1 }, false));

  draw(state);
}
