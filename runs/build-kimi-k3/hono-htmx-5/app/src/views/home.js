import { html } from 'hono/html';
import { cardList } from './components.js';

export const PAGE_SIZE = 48;

// Query string for the list pages, omitting empty/default parameters.
const pageUrl = ({ q, type, generation, page }) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/?${s}` : '/';
};

// The swappable results area: count, card list and pagination.
export const resultsFragment = ({ q, type, generation, page, totalPages, count, cards }) => html`
  <div id="results">
    <p class="count">${count} Pokémon</p>
    ${count === 0
      ? html`<p class="empty">No Pokémon found</p>`
      : html`
          ${cardList(cards)}
          <div class="pagination">
            ${page > 1 ? html`<a href="${pageUrl({ q, type, generation, page: page - 1 })}">Previous page</a>` : ''}
            <span>Page ${page} of ${totalPages}</span>
            ${page < totalPages ? html`<a href="${pageUrl({ q, type, generation, page: page + 1 })}">Next page</a>` : ''}
          </div>`}
  </div>`;

export const homePage = ({ q, type, generation, page, totalPages, count, cards, types, generations }) => html`
  <h1>Pokémon</h1>
  <form
    id="filters"
    action="/"
    method="get"
    hx-get="/"
    hx-target="#results"
    hx-swap="outerHTML"
    hx-push-url="true"
    hx-trigger="submit, input changed delay:250ms from:#q, search from:#q, change from:select"
  >
    <div class="field field-search">
      <label for="q">Search</label>
      <input id="q" type="search" name="q" value="${q}">
    </div>
    <div class="field">
      <label for="filter-type">Type</label>
      <select id="filter-type" name="type">
        <option value="">All types</option>
        ${types.map((t) => html`<option value="${t.name}"${t.name === type ? html` selected` : ''}>${t.label}</option>`)}
      </select>
    </div>
    <div class="field">
      <label for="filter-generation">Generation</label>
      <select id="filter-generation" name="generation">
        <option value="">All generations</option>
        ${generations.map((g) => html`<option value="${g.name}"${g.name === generation ? html` selected` : ''}>${g.label}</option>`)}
      </select>
    </div>
  </form>
  ${resultsFragment({ q, type, generation, page, totalPages, count, cards })}
`;
