import { escapeHtml, humanize } from './format.js';
import { cardListHtml } from './cards.js';

export const PAGE_SIZE = 48;

// filters: { q, type, generation, page }
export function normalizeFilters(raw) {
  const page = Math.max(1, parseInt(raw.page, 10) || 1);
  return {
    q: (raw.q ?? '').trim(),
    type: raw.type ?? '',
    generation: raw.generation ?? '',
    page,
  };
}

export function filterSpecies(species, filters) {
  const q = filters.q.toLowerCase();
  return species.filter((s) => {
    if (q && !humanize(s.name).toLowerCase().includes(q)) return false;
    if (filters.type && !s.types.includes(filters.type)) return false;
    if (filters.generation && s.generation !== filters.generation) return false;
    return true;
  });
}

export function homeQuery(filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (filters.page > 1) params.set('page', String(filters.page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

// Renders the results region of the home page (count, list, pagination).
// Used by the server for the initial render and by the client when filters change.
export function homeResultsHtml(data, rawFilters) {
  const filters = normalizeFilters(rawFilters);
  const matches = filterSpecies(data.species, filters);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const slice = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  let html = `<p class="result-count">${matches.length} Pokémon</p>`;
  if (!matches.length) {
    html += `<p class="no-results">No Pokémon found</p>`;
  } else {
    html += cardListHtml(
      slice.map((s) => ({ id: s.id, name: s.name, types: s.types })),
      { mediaBase: data.mediaBase, typeEn: data.typeEn },
    );
  }
  const pageFilters = (p) => homeQuery({ ...filters, page: p });
  html += `<p class="pagination"><span class="page-status">Page ${page} of ${totalPages}</span>`;
  if (page > 1) html += `<a class="page-link" data-page="${page - 1}" href="${escapeHtml(pageFilters(page - 1))}">Previous page</a>`;
  if (page < totalPages) html += `<a class="page-link" data-page="${page + 1}" href="${escapeHtml(pageFilters(page + 1))}">Next page</a>`;
  html += `</p>`;
  return html;
}
