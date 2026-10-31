import { html } from 'lit';
import { defineRoute } from '@gracile/gracile/route';
import { document } from '../document.js';
import { getSpeciesIndex, getTypes, getGenerations, getTypeEnglishNames } from '../lib/data.js';
import { englishName } from '../lib/format.js';
import { filterSpecies, paginate, homePageUrl } from '../lib/shared.js';
import { API_BASE_URL } from '../lib/api.js';
import { pokemonCard } from '../lib/views.js';

function paginationTemplate({ q, type, generation, page, totalPages }) {
  return html`<p class="pagination" id="pagination">
    ${page > 1 ? html`<a href="${homePageUrl({ q, type, generation, page: page - 1 })}">Previous page</a>` : ''}
    <span>Page ${page} of ${totalPages}</span>
    ${page < totalPages ? html`<a href="${homePageUrl({ q, type, generation, page: page + 1 })}">Next page</a>` : ''}
  </p>`;
}

export default defineRoute({
  handler: async (context) => {
    const [speciesIndex, types, generations, typeEn] = await Promise.all([
      getSpeciesIndex(),
      getTypes(),
      getGenerations(),
      getTypeEnglishNames(),
    ]);

    const params = context.url.searchParams;
    const q = (params.get('q') ?? '').trim();
    const type = params.get('type') ?? '';
    const generation = params.get('generation') ?? '';
    let page = Number(params.get('page') ?? '1');
    if (!Number.isInteger(page) || page < 1) page = 1;

    const filtered = filterSpecies(speciesIndex, { q, type, generation });
    const { current, totalPages, pageItems } = paginate(filtered, page);

    return {
      q,
      type,
      generation,
      page: current,
      totalPages,
      count: filtered.length,
      pageItems,
      typeEn,
      speciesIndex,
      typeOptions: types.map((entry) => ({ name: entry.name, en: englishName(entry) ?? entry.name })),
      generationOptions: generations.map((entry) => ({
        name: entry.name,
        en: englishName(entry) ?? entry.name,
      })),
    };
  },

  document: (context) => document({ ...context, ...(context.props ?? {}) }),

  template: (context) => {
    const props = context.props;
    const clientData = {
      species: props.speciesIndex,
      typeEn: props.typeEn,
      apiBaseUrl: API_BASE_URL,
      query: { q: props.q, type: props.type, generation: props.generation, page: props.page },
    };
    const json = JSON.stringify(clientData).replace(/</g, '\\u003c');

    return html`
      <h1>Pokémon</h1>
      <div class="filters">
        <div class="field">
          <label for="search">Search</label>
          <input id="search" type="search" value="${props.q}" autocomplete="off" />
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select id="type-filter">
            <option value="">All types</option>
            ${props.typeOptions.map(
              (option) => html`<option value="${option.name}" ?selected=${option.name === props.type}>
                ${option.en}
              </option>`,
            )}
          </select>
        </div>
        <div class="field">
          <label for="generation-filter">Generation</label>
          <select id="generation-filter">
            <option value="">All generations</option>
            ${props.generationOptions.map(
              (option) => html`<option value="${option.name}" ?selected=${option.name === props.generation}>
                ${option.en}
              </option>`,
            )}
          </select>
        </div>
      </div>

      <p class="count" id="count">${props.count} Pokémon</p>
      <ul class="card-grid" id="results" ?hidden=${props.count === 0}>
        ${props.pageItems.map((species) =>
          pokemonCard({ id: species.id, speciesName: species.name, types: species.types }, props.typeEn),
        )}
      </ul>
      <p class="empty" id="empty" ?hidden=${props.count !== 0}>No Pokémon found</p>
      ${props.count > 0 ? paginationTemplate(props) : ''}

      <script type="application/json" id="home-data" data-json="${json}"></script>
    `;
  },
});
