import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';
import { document } from '../document.js';
import {
  englishName,
  getAllSpecies,
  getGenerations,
  getGenerationSpeciesMap,
  getPokemon,
  getTypeDetails,
  getTypePokemonIds,
  getTypeNameMap,
  humanize,
  mediaSprite,
} from '../lib/api.js';
import { cardGrid } from '../lib/views.js';

const PAGE_SIZE = 48;

function isBuild(context: any): boolean {
  return context.url.hostname === 'gracile-static';
}

function queryHref(values: {
  q: string;
  type: string;
  generation: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (values.q) params.set('q', values.q);
  if (values.type) params.set('type', values.type);
  if (values.generation) params.set('generation', values.generation);
  if (values.page > 1) params.set('page', String(values.page));
  const query = params.toString();
  return `/${query ? `?${query}` : ''}`;
}

export default defineRoute({
  handler: async (context: any) => {
    if (isBuild(context)) return { title: 'Pokédex', build: true };

    const searchParams = context.url.searchParams;
    const q = (searchParams.get('q') ?? '').trim();
    const typeParam = searchParams.get('type') ?? '';
    const generationParam = searchParams.get('generation') ?? '';
    const requestedPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

    const [allSpecies, typeDetails, generations, generationSpecies, typeNames] = await Promise.all([
      getAllSpecies(),
      getTypeDetails(),
      getGenerations(),
      getGenerationSpeciesMap(),
      getTypeNameMap(),
    ]);

    const validType = typeDetails.some((type) => type.name === typeParam) ? typeParam : '';
    const validGeneration = generations.some(
      (generation) => generation.name === generationParam,
    )
      ? generationParam
      : '';

    const activeTypeIds = validType ? await getTypePokemonIds(validType) : null;

    let species = allSpecies;
    if (q) {
      const needle = q.toLowerCase();
      species = species.filter((entry) => humanize(entry.name).toLowerCase().includes(needle));
    }
    if (validGeneration) {
      species = species.filter((entry) => generationSpecies.get(entry.id) === validGeneration);
    }
    if (activeTypeIds) {
      species = species.filter((entry) => activeTypeIds.has(entry.id));
    }

    const count = species.length;
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const pageSpecies = species.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const items = await Promise.all(
      pageSpecies.map(async (entry) => {
        const pokemon = await getPokemon(entry.id);
        const types = [...(pokemon.types ?? [])]
          .sort((a, b) => a.slot - b.slot)
          .map((slot: any) => ({
            name: slot.type.name,
            label: typeNames.get(slot.type.name) ?? humanize(slot.type.name),
          }));
        return {
          id: entry.id,
          name: entry.name,
          sprite: pokemon.sprites?.front_default ?? mediaSprite(entry.id),
          types,
        };
      }),
    );

    const typeOptions = typeDetails.map((type) => ({
      name: type.name,
      label: englishName(type, type.name),
    }));
    const generationOptions = generations.map((generation) => ({
      name: generation.name,
      label: englishName(generation, generation.name),
    }));

    const base = { q, type: validType, generation: validGeneration };
    return {
      title: 'Pokédex',
      h1: 'Pokémon',
      q,
      type: validType,
      generation: validGeneration,
      count,
      page,
      totalPages,
      items,
      typeOptions,
      generationOptions,
      previousHref: page > 1 ? queryHref({ ...base, page: page - 1 }) : null,
      nextHref: page < totalPages ? queryHref({ ...base, page: page + 1 }) : null,
    };
  },

  document: (context: any) =>
    document({ ...context, title: context.props?.title ?? 'Pokédex' }),

  template: (context: any) => {
    const data = context.props;
    return html`
      <main class="page home-page">
        <h1>${data.h1}</h1>

        <form class="filters" data-home-filters role="search">
          <div class="field field-search">
            <label for="home-search">Search</label>
            <input
              id="home-search"
              type="search"
              name="q"
              value=${data.q}
              data-home-search
              autocomplete="off"
              spellcheck="false"
            />
          </div>

          <div class="field">
            <label for="home-type">Type</label>
            <select id="home-type" name="type" data-home-type>
              <option value="" ?selected=${!data.type}>All types</option>
              ${data.typeOptions.map(
                (type: any) => html`
                  <option value=${type.name} ?selected=${data.type === type.name}>
                    ${type.label}
                  </option>
                `,
              )}
            </select>
          </div>

          <div class="field">
            <label for="home-generation">Generation</label>
            <select id="home-generation" name="generation" data-home-generation>
              <option value="" ?selected=${!data.generation}>All generations</option>
              ${data.generationOptions.map(
                (generation: any) => html`
                  <option
                    value=${generation.name}
                    ?selected=${data.generation === generation.name}
                  >
                    ${generation.label}
                  </option>
                `,
              )}
            </select>
          </div>
        </form>

        <p class="result-count">${data.count} Pokémon</p>

        ${data.count
          ? cardGrid(data.items)
          : html`<p class="empty-message">No Pokémon found</p>`}

        ${data.count
          ? html`
              <nav class="pagination" aria-label="Pagination">
                ${data.previousHref
                  ? html`<a href=${data.previousHref}>Previous page</a>`
                  : html``}
                <span>Page ${data.page} of ${data.totalPages}</span>
                ${data.nextHref ? html`<a href=${data.nextHref}>Next page</a>` : html``}
              </nav>
            `
          : html``}
      </main>
    `;
  },
});
