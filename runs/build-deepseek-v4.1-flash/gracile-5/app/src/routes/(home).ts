import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../document.js';
import { pokemonGrid } from '../lib/components.js';
import {
  getGenerationSpeciesIds,
  getGenerations,
  getPokemonCards,
  getSpeciesList,
  getType,
  getTypes,
} from '../lib/data.js';
import { humanize } from '../lib/format.js';

const PAGE_SIZE = 48;

const filterParams = (q: string, type: string, generation: string) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  return params;
};

const pageUrl = (params: URLSearchParams, page: number) => {
  const next = new URLSearchParams(params);
  next.delete('page');
  if (page > 1) next.set('page', String(page));
  const query = next.toString();
  return query ? `/?${query}` : '/';
};

export default defineRoute({
  handler: {
    GET: async ({ url }) => {
      const q = url.searchParams.get('q')?.trim() ?? '';
      const typeFilter = url.searchParams.get('type') ?? '';
      const generationFilter = url.searchParams.get('generation') ?? '';
      const requestedPage = Number(url.searchParams.get('page') ?? 1);

      const [species, types, generations] = await Promise.all([
        getSpeciesList(),
        getTypes(),
        getGenerations(),
      ]);

      let matches = species;

      if (q) {
        const needle = q.toLowerCase();
        matches = matches.filter((entry) => humanize(entry.name).toLowerCase().includes(needle));
      }

      if (typeFilter) {
        const type = await getType(typeFilter);
        const typeIds = new Set<number>();
        if (type) {
          for (const entry of type.pokemon ?? []) {
            const match = entry.pokemon?.url?.match(/\/(\d+)\/?$/);
            const id = match ? Number(match[1]) : Number.NaN;
            if (Number.isFinite(id) && id > 0 && id < 10000) typeIds.add(id);
          }
        }
        matches = matches.filter((entry) => typeIds.has(entry.id));
      }

      if (generationFilter) {
        const generationIds = await getGenerationSpeciesIds(generationFilter);
        matches = matches.filter((entry) => generationIds?.has(entry.id) ?? false);
      }

      const count = matches.length;
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      const page = Math.max(
        1,
        Math.min(Number.isFinite(requestedPage) ? requestedPage : 1, totalPages),
      );
      const pageMatches = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const cards = await getPokemonCards(pageMatches.map((entry) => entry.id));

      return {
        q,
        typeFilter,
        generationFilter,
        types,
        generations,
        count,
        page,
        totalPages,
        cards,
        params: filterParams(q, typeFilter, generationFilter).toString(),
      };
    },
  },

  document: () => document({ title: 'Pokédex' }),

  template: (context) => {
    const { q, typeFilter, generationFilter, types, generations, count, page, totalPages, cards } =
      context.props.GET;
    const paginationParams = new URLSearchParams(context.props.GET.params);

    return html`
      <main class="page">
        <h1>Pokémon</h1>

        <form class="filters" data-filters method="get" action="/">
          <div class="field">
            <label for="pokemon-search">Search</label>
            <input
              id="pokemon-search"
              type="search"
              name="q"
              value=${q}
              data-filter="q"
              autocomplete="off"
            />
          </div>

          <div class="field">
            <label for="type-filter">Type</label>
            <select id="type-filter" name="type" data-filter="type">
              <option value="" ?selected=${!typeFilter}>All types</option>
              ${types.map(
                (type) => html`<option value=${type.name} ?selected=${type.name === typeFilter}>${type.label}</option>`,
              )}
            </select>
          </div>

          <div class="field">
            <label for="generation-filter">Generation</label>
            <select id="generation-filter" name="generation" data-filter="generation">
              <option value="" ?selected=${!generationFilter}>All generations</option>
              ${generations.map(
                (generation) => html`<option value=${generation.name} ?selected=${generation.name === generationFilter}>${generation.label}</option>`,
              )}
            </select>
          </div>
        </form>

        <p class="list-summary">${count} Pokémon</p>

        ${count === 0
          ? html`<p class="empty">No Pokémon found</p>`
          : html`
              ${pokemonGrid(cards, { types: true })}
              <nav class="pagination" aria-label="Pagination">
                <span>Page ${page} of ${totalPages}</span>
                ${page > 1 ? html`<a href=${pageUrl(paginationParams, page - 1)}>Previous page</a>` : ''}
                ${page < totalPages ? html`<a href=${pageUrl(paginationParams, page + 1)}>Next page</a>` : ''}
              </nav>
            `}
      </main>
    `;
  },
});
