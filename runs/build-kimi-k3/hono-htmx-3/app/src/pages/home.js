import { html, raw } from 'hono/html';
import { getIndex } from '../api.js';
import { humanize } from '../util.js';
import { card, cardGrid, layout, titleFor } from '../views.js';

const PER_PAGE = 48;

function pageUrl({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/?${s}` : '/';
}

function resultsHtml(index, { q, type, generation, page }) {
  const query = q.toLowerCase();
  const filtered = index.species.filter((s) => {
    if (query && !humanize(s.name).toLowerCase().includes(query)) return false;
    if (type) {
      const types = index.pokemonTypes.get(s.id) ?? [];
      if (!types.some((t) => t.type === type)) return false;
    }
    if (generation && index.speciesGen.get(s.name) !== generation) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(Math.max(1, page), totalPages);
  const slice = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return html`<div id="results">
  <p class="count">${filtered.length} Pokémon</p>
  ${
    slice.length
      ? cardGrid(
          slice.map((s) =>
            card(s, { types: index.pokemonTypes.get(s.id) ?? [], typeDisplay: index.typeDisplay }),
          ),
        )
      : html`<p class="no-results">No Pokémon found</p>`
  }
  ${
    filtered.length
      ? html`<nav class="pagination" aria-label="Pagination">
    ${current > 1 ? html`<a href="${pageUrl({ q, type, generation, page: current - 1 })}">Previous page</a>` : ''}
    <span>Page ${current} of ${totalPages}</span>
    ${current < totalPages ? html`<a href="${pageUrl({ q, type, generation, page: current + 1 })}">Next page</a>` : ''}
  </nav>`
      : ''
  }
</div>`;
}

const htmxAttrs =
  'hx-get="/" hx-target="#results" hx-swap="outerHTML" hx-include="closest form" hx-push-url="true"';

export async function homePage(c) {
  const index = await getIndex();
  const q = (c.req.query('q') ?? '').trim();
  const type = c.req.query('type') ?? '';
  const generation = c.req.query('generation') ?? '';
  const page = Math.max(1, parseInt(c.req.query('page') ?? '', 10) || 1);
  const state = { q, type, generation, page };
  const results = resultsHtml(index, state);

  // htmx requests only need the results fragment.
  if (c.req.header('HX-Request') === 'true') {
    return c.html(results);
  }

  const option = (value, label, current) =>
    value === current
      ? html`<option value="${value}" selected>${label}</option>`
      : html`<option value="${value}">${label}</option>`;

  const content = html`<h1>Pokémon</h1>
<form id="filters" action="/" method="get">
  <div class="field field-search">
    <label for="filter-q">Search</label>
    <input type="search" id="filter-q" name="q" value="${q}" ${raw(htmxAttrs)} hx-trigger="input changed delay:200ms">
  </div>
  <div class="field">
    <label for="filter-type">Type</label>
    <select id="filter-type" name="type" ${raw(htmxAttrs)} hx-trigger="change">
      ${option('', 'All types', type)}
      ${index.typeNames.map((t) => option(t, index.typeDisplay.get(t) ?? humanize(t), type))}
    </select>
  </div>
  <div class="field">
    <label for="filter-gen">Generation</label>
    <select id="filter-gen" name="generation" ${raw(htmxAttrs)} hx-trigger="change">
      ${option('', 'All generations', generation)}
      ${index.genNames.map((g) => option(g, index.genDisplay.get(g) ?? humanize(g), generation))}
    </select>
  </div>
</form>
${results}`;

  return c.html(layout(titleFor('Pokédex'), content));
}
