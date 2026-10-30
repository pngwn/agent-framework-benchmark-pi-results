import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../document.js';
import {
  getGenerationCollection,
  getGenerationForSpecies,
  getPokemonTypeMap,
  getSpeciesIndex,
  getTypeCollection,
} from '../lib/api.js';
import { pokemonCardList } from '../lib/components.js';

const PAGE_SIZE = 48;
const BUILDING = () => process.env.GRACILE_BUILD === '1';

function positiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function homeHref({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page && page > 1) params.set('page', String(page));

  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export default defineRoute({
  handler: {
    GET: async ({ url, responseInit }) => {
      if (BUILDING()) return {};

      try {
        const [speciesIndex, types, generations, typeMap, generationForSpecies] = await Promise.all([
          getSpeciesIndex(),
          getTypeCollection(),
          getGenerationCollection(),
          getPokemonTypeMap(),
          getGenerationForSpecies(),
        ]);

        const q = (url.searchParams.get('q') ?? '').trim();
        const requestedType = url.searchParams.get('type') ?? '';
        const requestedGeneration = url.searchParams.get('generation') ?? '';
        const type = types.some((entry) => entry.name === requestedType) ? requestedType : '';
        const generation = generations.some((entry) => entry.name === requestedGeneration)
          ? requestedGeneration
          : '';

        let filtered = speciesIndex.items;

        if (generation) {
          filtered = filtered.filter((entry) => generationForSpecies.get(entry.id) === generation);
        }

        if (type) {
          filtered = filtered.filter((entry) =>
            (typeMap.get(entry.id) ?? []).some((entryType) => entryType.name === type),
          );
        }

        if (q) {
          const needle = q.toLocaleLowerCase();
          filtered = filtered.filter((entry) =>
            entry.humanizedName.toLocaleLowerCase().includes(needle),
          );
        }

        const count = filtered.length;
        const totalPages = count === 0 ? 0 : Math.ceil(count / PAGE_SIZE);
        const page = totalPages === 0 ? 1 : Math.min(positiveInteger(url.searchParams.get('page')), totalPages);
        const start = (page - 1) * PAGE_SIZE;

        const pageItems = filtered.slice(start, start + PAGE_SIZE).map((entry) => ({
          ...entry,
          types: typeMap.get(entry.id) ?? [],
        }));

        return {
          pageTitle: 'Pokédex',
          q,
          type,
          generation,
          page,
          count,
          totalPages,
          pageItems,
          types: types.map((entry) => ({ name: entry.name, englishName: entry.englishName })),
          generations: generations.map((entry) => ({
            name: entry.name,
            englishName: entry.englishName,
          })),
        };
      } catch (error) {
        console.error(error);
        responseInit.status = 500;
        return {
          pageTitle: 'Pokédex',
          q: '',
          type: '',
          generation: '',
          page: 1,
          count: 0,
          totalPages: 0,
          pageItems: [],
          types: [],
          generations: [],
        };
      }
    },
  },

  document: (context) => document(context),

  template: (context) => {
    const data = context.props?.GET ?? {};
    const {
      q = '',
      type = '',
      generation = '',
      page = 1,
      count = 0,
      totalPages = 0,
      pageItems = [],
      types = [],
      generations = [],
    } = data;

    const previousHref = homeHref({ q, type, generation, page: page - 1 });
    const nextHref = homeHref({ q, type, generation, page: page + 1 });

    return html`
      <h1>Pokémon</h1>

      <div class="filters">
        <div class="field">
          <label for="home-search">Search</label>
          <input id="home-search" name="q" type="search" value=${q} autocomplete="off" />
        </div>
        <div class="field">
          <label for="home-type">Type</label>
          <select id="home-type" name="type">
            <option value="" ?selected=${type === ''}>All types</option>
            ${types.map(
              (entry) => html`<option value=${entry.name} ?selected=${entry.name === type}>${entry.englishName}</option>`,
            )}
          </select>
        </div>
        <div class="field">
          <label for="home-generation">Generation</label>
          <select id="home-generation" name="generation">
            <option value="" ?selected=${generation === ''}>All generations</option>
            ${generations.map(
              (entry) => html`<option value=${entry.name} ?selected=${entry.name === generation}>${entry.englishName}</option>`,
            )}
          </select>
        </div>
      </div>

      <div id="home-results">
        <p class="result-count">${count} Pokémon</p>

        ${count === 0
          ? html`<p class="empty">No Pokémon found</p>`
          : html`
              ${pokemonCardList(pageItems, { showTypes: true })}

              <div class="pagination">
                ${page > 1 ? html`<a href=${previousHref}>Previous page</a>` : ''}
                <span>Page ${page} of ${totalPages}</span>
                ${page < totalPages ? html`<a href=${nextHref}>Next page</a>` : ''}
              </div>
            `}
      </div>
    `;
  },
});
