// Client-side interactivity: live home-page filtering, sortable move tables
// and the game selector on Pokémon pages.
import './styles.css';
import { homeResultsHtml, normalizeFilters } from './shared/home.js';

/* ---------------- Home page: live filtering ---------------- */

function initHome() {
  const dataEl = document.getElementById('home-data');
  const results = document.getElementById('results');
  const form = document.getElementById('filters');
  if (!dataEl || !results || !form) return;

  const data = JSON.parse(dataEl.textContent);
  const search = form.querySelector('#filter-q');
  const type = form.querySelector('#filter-type');
  const generation = form.querySelector('#filter-gen');

  const filtersFromControls = () =>
    normalizeFilters({
      q: search.value,
      type: type.value,
      generation: generation.value,
      page: currentPage(),
    });
  const currentPage = () => {
    const p = new URLSearchParams(window.location.search).get('page');
    return Math.max(1, parseInt(p, 10) || 1);
  };

  const render = (filters, { push = false } = {}) => {
    results.innerHTML = homeResultsHtml(data, filters);
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type) params.set('type', filters.type);
    if (filters.generation) params.set('generation', filters.generation);
    if (filters.page > 1) params.set('page', String(filters.page));
    const url = params.toString() ? `/?${params}` : '/';
    if (push) window.history.pushState({}, '', url);
    else window.history.replaceState({}, '', url);
  };

  form.addEventListener('submit', (e) => e.preventDefault());

  let debounce;
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      render({ ...filtersFromControls(), page: 1 });
    }, 150);
  });

  const onSelect = () => render({ ...filtersFromControls(), page: 1 }, { push: true });
  type.addEventListener('change', onSelect);
  generation.addEventListener('change', onSelect);

  results.addEventListener('click', (e) => {
    const link = e.target.closest('a.page-link');
    if (!link) return;
    e.preventDefault();
    const page = Number(link.dataset.page) || 1;
    render({ ...filtersFromControls(), page }, { push: true });
  });

  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    search.value = params.get('q') ?? '';
    type.value = params.get('type') ?? '';
    generation.value = params.get('generation') ?? '';
    render(filtersFromControls());
  });
}

/* ---------------- Sortable tables ---------------- */

function cellValue(row, index, type) {
  const cell = row.cells[index];
  if (!cell) return null;
  const text = cell.textContent.replace(/\s+/g, ' ').trim();
  if (text === '' || text === '—') return null;
  if (type === 'num') {
    const n = Number(text);
    return Number.isNaN(n) ? null : n;
  }
  return text;
}

function initSortableTables() {
  for (const table of document.querySelectorAll('table[data-sortable]')) {
    const headers = [...table.querySelectorAll('thead th')];
    headers.forEach((th, index) => {
      const button = th.querySelector('button');
      const activate = () => {
        const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        for (const other of headers) other.removeAttribute('aria-sort');
        th.setAttribute('aria-sort', direction);
        const type = th.dataset.sortType ?? 'text';
        const tbody = table.tBodies[0];
        const rows = [...tbody.rows].map((row, i) => ({ row, i, value: cellValue(row, index, type) }));
        rows.sort((a, b) => {
          if (a.value === null || b.value === null) {
            if (a.value === null && b.value === null) return a.i - b.i;
            return a.value === null ? 1 : -1; // missing values last in both directions
          }
          const cmp = type === 'num' ? a.value - b.value : String(a.value).localeCompare(String(b.value));
          if (cmp === 0) return a.i - b.i;
          return direction === 'ascending' ? cmp : -cmp;
        });
        for (const { row } of rows) tbody.appendChild(row);
      };
      if (button) button.addEventListener('click', activate);
      else th.addEventListener('click', activate);
    });
  }
}

/* ---------------- Game selector on Pokémon pages ---------------- */

function initGameSelect() {
  const select = document.getElementById('game-select');
  if (!select) return;
  select.addEventListener('change', () => {
    const name = select.dataset.pokemon;
    window.location.href = `/pokemon/${encodeURIComponent(name)}?game=${encodeURIComponent(select.value)}#moves`;
  });
}

initHome();
initSortableTables();
initGameSelect();
