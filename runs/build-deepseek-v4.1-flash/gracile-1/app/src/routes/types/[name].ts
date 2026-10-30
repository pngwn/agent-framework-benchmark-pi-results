import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { getTypeRecord, getTypes, mapPokemonRefsToSpecies } from '../../lib/api.js';
import { humanize } from '../../lib/text.js';
import { cardGrid, countLine, damageRelations, section } from '../../lib/view.js';
import { document } from '../../document.js';

function notFoundPage() {
  return html`<main class="page"><h1>Not found</h1><p><a href="/">Back to Pokédex</a></p></main>`;
}

export default defineRoute({
  handler: async ({ params, url }) => {
    if (url.hostname === 'gracile-static') return { found: false };
    try {
      const [record, types] = await Promise.all([getTypeRecord(params.name), getTypes()]);
      const pokemon = await mapPokemonRefsToSpecies(record.pokemon ?? []);
      const typeByApiName = new Map(types.map((type) => [type.name, type]));
      const english = typeByApiName.get(record.name)?.english ?? humanize(record.name);
      const moves = (record.moves ?? [])
        .map((move) => ({ ...move, displayName: humanize(move.name) }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      return { found: true, type: { ...record, english }, typeByApiName, pokemon, moves };
    } catch (error) {
      if (error.status === 404) return { found: false };
      throw error;
    }
  },

  document: (context) =>
    document({
      ...context,
      title: context.props.found ? `${context.props.type.english} – Pokédex` : 'Not found – Pokédex',
    }),

  template: ({ props }) => {
    if (!props.found) return notFoundPage();
    const { type, typeByApiName, pokemon, moves } = props;
    return html`
      <main class="page type-page">
        <h1>${type.english}</h1>
        ${section(
          'damage-relations-heading',
          'Damage relations',
          damageRelations(type, typeByApiName),
        )}
        ${section(
          'pokemon-heading',
          'Pokémon',
          html`${countLine(pokemon.length)} ${cardGrid(pokemon)}`,
        )}
        ${section(
          'moves-heading',
          'Moves',
          html`
            ${countLine(moves.length, 'moves')}
            <ul class="move-links">
              ${moves.map(
                (move) => html`<li><a href="/moves/${move.name}">${move.displayName}</a></li>`,
              )}
            </ul>
          `,
        )}
      </main>
    `;
  },
});
