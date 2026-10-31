import { humanize, escapeHtml } from './format.js';
import { cardGridHtml } from './cards.js';

// Isomorphic home-page logic: filtering, pagination and results rendering.
// Used by the server for the initial render and by the client for live filtering.

export const PAGE_SIZE = 48;

export function filterSpecies(species, { q, type, generation }) {
  const needle = (q ?? '').trim().toLowerCase();
  return species.filter((s) => {
    if (needle && !humanize(s.name).toLowerCase().includes(needle)) return false;
    if (type && !(s.types ?? []).includes(type)) return false;
    if (generation && s.generation !== generation) return false;
    return true;
  });
}

export const pageCount = (total) => Math.max(1, Math.ceil(total / PAGE_SIZE));

// Canonical home URL for a filter state. Empty/default parameters are omitted.
export function homeUrl(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type) params.set('type', state.type);
  if (state.generation) params.set('generation', state.generation);
  if (state.page && state.page !== 1) params.set('page', String(state.page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export const normalizeState = (state, total) => {
  const page = Math.min(Math.max(1, state.page || 1), pageCount(total));
  return { q: state.q ?? '', type: state.type ?? '', generation: state.generation ?? '', page };
};

// Renders count text, the card list (or the empty message) and pagination.
export function resultsHtml(state, data) {
  const matches = filterSpecies(data.species, state);
  const { page } = normalizeState(state, matches.length);
  const pages = pageCount(matches.length);
  const slice = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const count = `<p class="result-count">${matches.length} Pokémon</p>`;
  const cards = slice.map((s) => ({
    speciesName: s.name,
    speciesId: s.id,
    sprite: s.sprite,
    types: s.types,
  }));
  const list = matches.length
    ? cardGridHtml(cards, { showTypes: true, typeNames: data.typeNames })
    : '<p class="no-results">No Pokémon found</p>';

  const base = { q: state.q, type: state.type, generation: state.generation };
  const prev =
    page > 1 ? `<a class="page-prev" href="${escapeHtml(homeUrl({ ...base, page: page - 1 }))}">Previous page</a>` : '';
  const next =
    page < pages
      ? `<a class="page-next" href="${escapeHtml(homeUrl({ ...base, page: page + 1 }))}">Next page</a>`
      : '';
  const pagination = `<div class="pagination">${prev}<span class="page-status">Page ${page} of ${pages}</span>${next}</div>`;

  return count + list + pagination;
}
