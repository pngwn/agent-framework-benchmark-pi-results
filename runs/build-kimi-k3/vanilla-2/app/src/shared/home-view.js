// Home page filtering/pagination logic and markup, shared by the SSR renderer and
// the client-side interactivity (so both produce identical markup).
import { humanize } from './format.js';
import { speciesCard } from './components.js';

export const PAGE_SIZE = 48;

export function filterSummaries(summaries, state) {
  const query = state.q.trim().toLowerCase();
  return summaries.filter((s) => {
    if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
    if (state.type && !(s.types ?? []).includes(state.type)) return false;
    if (state.generation && s.generation !== state.generation) return false;
    return true;
  });
}

// URL for a filter state, omitting parameters that are empty or at their default.
export function homeQueryString(state) {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set('q', q);
  if (state.type) params.set('type', state.type);
  if (state.generation) params.set('generation', state.generation);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function parseHomeState(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
  return {
    q: searchParams.get('q') ?? '',
    type: searchParams.get('type') ?? '',
    generation: searchParams.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// The count line, the card list (or empty message) and the pagination controls.
export function homeResultsHtml(filtered, state) {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), totalPages);
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const list =
    total === 0
      ? `<p class="empty-message">No Pokémon found</p>`
      : `<ul class="card-grid">${slice.map((s) => speciesCard(s, { showTypes: true })).join('')}</ul>`;
  const prev =
    page > 1
      ? `<a class="page-link" href="${homeQueryString({ ...state, page: page - 1 })}">Previous page</a>`
      : '';
  const next =
    page < totalPages
      ? `<a class="page-link" href="${homeQueryString({ ...state, page: page + 1 })}">Next page</a>`
      : '';
  return (
    `<p class="result-count">${total} Pokémon</p>` +
    list +
    `<div class="pagination">${prev}<span class="page-status">Page ${page} of ${totalPages}</span>${next}</div>`
  );
}
