import { filterSpecies, paginate, homePageUrl, cardHTML, PAGE_SIZE } from '../lib/shared.js';

const data = JSON.parse(document.getElementById('home-data').dataset.json);

const searchInput = document.getElementById('search');
const typeSelect = document.getElementById('type-filter');
const generationSelect = document.getElementById('generation-filter');
const countEl = document.getElementById('count');
const listEl = document.getElementById('results');
const emptyEl = document.getElementById('empty');

const state = { ...data.query };

function paginationHTML() {
  const { q, type, generation, page } = state;
  const filtered = filterSpecies(data.species, state);
  const { totalPages } = paginate(filtered, page);
  const parts = [];
  if (page > 1) parts.push(`<a href="${homePageUrl({ q, type, generation, page: page - 1 })}">Previous page</a>`);
  parts.push(`<span>Page ${page} of ${totalPages}</span>`);
  if (page < totalPages) parts.push(`<a href="${homePageUrl({ q, type, generation, page: page + 1 })}">Next page</a>`);
  return parts.join('');
}

let paginationEl = document.getElementById('pagination');

function render() {
  const filtered = filterSpecies(data.species, state);
  const { current, pageItems } = paginate(filtered, state.page);
  state.page = current;

  countEl.textContent = `${filtered.length} Pokémon`;
  listEl.hidden = filtered.length === 0;
  emptyEl.hidden = filtered.length !== 0;
  listEl.innerHTML = pageItems.map((species) => cardHTML(species, data.typeEn, data.apiBaseUrl)).join('');

  if (filtered.length === 0) {
    paginationEl?.remove();
    paginationEl = null;
  } else {
    if (!paginationEl) {
      paginationEl = document.createElement('p');
      paginationEl.className = 'pagination';
      paginationEl.id = 'pagination';
      emptyEl.after(paginationEl);
    }
    paginationEl.innerHTML = paginationHTML();
  }

  const url = homePageUrl(state) + window.location.hash;
  window.history.replaceState(null, '', url || '/');
}

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.q = searchInput.value.trim();
    state.page = 1;
    render();
  }, 250);
});

typeSelect.addEventListener('change', () => {
  state.type = typeSelect.value;
  state.page = 1;
  render();
});

generationSelect.addEventListener('change', () => {
  state.generation = generationSelect.value;
  state.page = 1;
  render();
});
