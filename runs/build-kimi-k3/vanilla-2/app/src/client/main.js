// Client-side interactivity: home page filtering, sortable move tables and the
// game selector on Pokémon pages. Pages are server-rendered; this script only
// layers behavior on top.
import './styles.css';
import {
  filterSummaries,
  homeResultsHtml,
  homeQueryString,
  parseHomeState,
} from '../shared/home-view.js';

// ---------------------------------------------------------------- home page

const dataEl = document.getElementById('species-data');
if (dataEl) initHomePage(JSON.parse(dataEl.textContent));

function initHomePage(summaries) {
  const search = document.getElementById('filter-search');
  const typeSelect = document.getElementById('filter-type');
  const generationSelect = document.getElementById('filter-generation');
  const results = document.getElementById('results');
  if (!search || !typeSelect || !generationSelect || !results) return;

  let state = parseHomeState(new URLSearchParams(location.search));

  const render = () => {
    results.innerHTML = homeResultsHtml(filterSummaries(summaries, state), state);
  };
  const syncUrl = (push) => {
    history[push ? 'pushState' : 'replaceState'](null, '', homeQueryString(state));
  };

  let debounce;
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.q = search.value;
      state.page = 1;
      syncUrl(false);
      render();
    }, 200);
  });

  const onSelect = (key, select) => {
    state[key] = select.value;
    state.page = 1;
    syncUrl(true);
    render();
  };
  typeSelect.addEventListener('change', () => onSelect('type', typeSelect));
  generationSelect.addEventListener('change', () => onSelect('generation', generationSelect));

  window.addEventListener('popstate', () => {
    state = parseHomeState(new URLSearchParams(location.search));
    search.value = state.q;
    typeSelect.value = state.type;
    generationSelect.value = state.generation;
    render();
  });
}

// ------------------------------------------------------------- game select

const gameSelect = document.getElementById('game-select');
gameSelect?.addEventListener('change', () => {
  const url = new URL(location.href);
  url.searchParams.set('game', gameSelect.value);
  url.hash = 'moves';
  location.assign(url);
});

// --------------------------------------------------------- sortable tables

const NUMERIC_COLUMNS = new Set(['level', 'power', 'accuracy', 'pp']);

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('th[data-sort-key] > button');
  if (!button) return;
  const th = button.closest('th');
  const table = th.closest('table');
  const tbody = table.tBodies[0];
  if (!tbody) return;

  const key = th.dataset.sortKey;
  const numeric = NUMERIC_COLUMNS.has(key);
  const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  const column = [...th.parentElement.children].indexOf(th);

  const valueOf = (row) => {
    const text = row.cells[column]?.textContent.trim() ?? '';
    if (text === '' || text === '—') return null; // missing values sort last
    return numeric ? Number(text) : text;
  };

  const rows = [...tbody.rows];
  rows.sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = numeric ? va - vb : String(va).localeCompare(String(vb));
    return direction === 'ascending' ? cmp : -cmp;
  });

  for (const header of table.querySelectorAll('th[aria-sort]')) {
    header.removeAttribute('aria-sort');
  }
  th.setAttribute('aria-sort', direction);
  tbody.append(...rows);
});
