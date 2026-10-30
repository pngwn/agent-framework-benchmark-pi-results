import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import {
  getAbilityCardData,
  getAbilityRecord,
  mapPokemonRefsToSpecies,
} from '../../lib/api.js';
import { cardGrid, countLine, section } from '../../lib/view.js';
import { document } from '../../document.js';

function notFoundPage() {
  return html`<main class="page"><h1>Not found</h1><p><a href="/">Back to Pokédex</a></p></main>`;
}

export default defineRoute({
  handler: async ({ params, url }) => {
    if (url.hostname === 'gracile-static') return { found: false };
    try {
      const record = await getAbilityRecord(params.name);
      const [ability, pokemon] = await Promise.all([
        getAbilityCardData(record),
        mapPokemonRefsToSpecies(record.pokemon ?? [], { hidden: true }),
      ]);
      return { found: true, ability, pokemon };
    } catch (error) {
      if (error.status === 404) return { found: false };
      throw error;
    }
  },

  document: (context) =>
    document({
      ...context,
      title: context.props.found ? `${context.props.ability.displayName} – Pokédex` : 'Not found – Pokédex',
    }),

  template: ({ props }) => {
    if (!props.found) return notFoundPage();
    const { ability, pokemon } = props;
    return html`
      <main class="page ability-page">
        <h1>${ability.displayName}</h1>
        ${section('effect-heading', 'Effect', html`<p>${ability.effect}</p>`)}
        ${section(
          'pokemon-heading',
          'Pokémon',
          html`
            ${countLine(pokemon.length)} ${cardGrid(pokemon)}
          `,
        )}
      </main>
    `;
  },
});
