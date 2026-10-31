import { resultsHtml, homeUrl } from '../shared/home.js';

// Live filtering for the home page. The full species dataset is embedded in the
// page as JSON; filter changes re-render the results and update the URL query
// without a reload. Pagination links are plain links to the filtered URLs.
export function initHome() {
  const dataEl = document.getElementById('home-data');
  const results = document.getElementById('results');
  const search = document.getElementById('search');
  const typeSelect = document.getElementById('type-select');
  const generationSelect = document.getElementById('generation-select');
  if (!dataEl || !results || !search || !typeSelect || !generationSelect) return;

  const data = JSON.parse(dataEl.textContent);
  const params = new URLSearchParams(window.location.search);
  const state = {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page: Math.max(1, Number.parseInt(params.get('page') ?? '', 10) || 1),
  };

  document.getElementById('controls')?.addEventListener('submit', (event) => event.preventDefault());

  const render = () => {
    results.innerHTML = resultsHtml(state, data);
  };

  const updateUrl = (replace) => {
    const url = homeUrl(state);
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  };

  let debounce = null;
  search.addEventListener('input', () => {
    state.q = search.value;
    state.page = 1;
    render();
    clearTimeout(debounce);
    debounce = setTimeout(() => updateUrl(true), 150);
  });

  const onSelect = () => {
    state.type = typeSelect.value;
    state.generation = generationSelect.value;
    state.page = 1;
    render();
    updateUrl(false);
  };
  typeSelect.addEventListener('change', onSelect);
  generationSelect.addEventListener('change', onSelect);
}
