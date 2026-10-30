import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { getDex } from '../lib/api.js';
import { filterPokedex, homeUrl } from '../lib/filter.js';
import { cardGrid } from '../lib/view.js';
import { document } from '../document.js';

export default defineRoute({
  handler: async ({ url }) => {
    if (url.hostname === 'gracile-static') {
      return {
        dex: { items: [], types: [], generations: [] },
        result: filterPokedex([], {}),
      };
    }
    const dex = await getDex();
    const params = Object.fromEntries(url.searchParams.entries());
    const result = filterPokedex(dex.items, params);
    return { dex, result };
  },

  document: (context) => document({ ...context, title: 'Pokédex' }),

  template: ({ props }) => {
    const { dex, result } = props;
    const encodedDex = encodeURIComponent(JSON.stringify({ items: dex.items }));
    const pageLink = (page) => homeUrl({ q: result.q, type: result.type, generation: result.generation, page });
    return html`
      <main class="page home-page">
        <h1>Pokémon</h1>
        <div class="filters">
          <div class="field search-field">
            <label for="pokedex-search">Search</label>
            <input
              id="pokedex-search"
              name="q"
              type="search"
              value=${result.q}
              autocomplete="off"
            />
          </div>
          <div class="field">
            <label for="pokedex-type">Type</label>
            <select id="pokedex-type" name="type">
              <option value="">All types</option>
              ${dex.types.map(
                (type) => html`<option value=${type.name} ?selected=${result.type === type.name}>${type.english}</option>`,
              )}
            </select>
          </div>
          <div class="field">
            <label for="pokedex-generation">Generation</label>
            <select id="pokedex-generation" name="generation">
              <option value="">All generations</option>
              ${dex.generations.map(
                (generation) => html`<option
                  value=${generation.name}
                  ?selected=${result.generation === generation.name}
                >${generation.english}</option>`,
              )}
            </select>
          </div>
        </div>

        <pokemon-results data-dex=${encodedDex}>
          <p class="count-line">${result.total} Pokémon</p>
          ${result.total === 0
            ? html`<p class="empty-message">No Pokémon found</p>`
            : cardGrid(result.items, { showTypes: true })}
          ${result.total > 0
            ? html`
                <p class="pagination">
                  ${result.page > 1 ? html`<a href=${pageLink(result.page - 1)}>Previous page</a>` : ''}
                  <span>Page ${result.page} of ${result.totalPages}</span>
                  ${result.page < result.totalPages
                    ? html`<a href=${pageLink(result.page + 1)}>Next page</a>`
                    : ''}
                </p>
              `
            : ''}
        </pokemon-results>
      </main>
    `;
  },
});
