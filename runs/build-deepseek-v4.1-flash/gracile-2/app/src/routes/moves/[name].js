import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import {
  displayValue,
  englishEffect,
  englishName,
  getMove,
  getSpeciesIndex,
  getTypeInfo,
  humanize,
  latestEnglishFlavorText,
  uniqueSpeciesFromPokemonReferences,
} from '../../lib/api.js';
import { pokemonCardList, typeBadgeLink } from '../../lib/components.js';

const BUILDING = () => process.env.GRACILE_BUILD === '1';

export default defineRoute({
  handler: {
    GET: async ({ params, responseInit }) => {
      if (BUILDING()) return {};

      try {
        const [move, speciesIndex] = await Promise.all([
          getMove(params.name),
          getSpeciesIndex(),
        ]);
        const type = await getTypeInfo(move.type.name);
        const learnedBy = uniqueSpeciesFromPokemonReferences(move.learned_by_pokemon, speciesIndex);
        const effect = englishEffect(move) || latestEnglishFlavorText(move) || '—';

        return {
          pageTitle: `${englishName(move, move.name)} – Pokédex`,
          name: englishName(move, move.name),
          type: { name: type.name, englishName: type.englishName },
          category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
          power: displayValue(move.power),
          accuracy: displayValue(move.accuracy),
          pp: displayValue(move.pp),
          effect,
          learnedBy,
        };
      } catch (error) {
        if (error?.status !== 404) console.error(error);
        responseInit.status = 404;
        return { pageTitle: 'Not found – Pokédex', notFound: true };
      }
    },
  },

  document: (context) => document(context),

  template: (context) => {
    const data = context.props?.GET ?? {};

    if (data.notFound || !data.name) {
      return html`
        <h1>Not found</h1>
        <p><a href="/">Back to the Pokédex</a></p>
      `;
    }

    return html`
      <h1>${data.name}</h1>

      <dl class="move-summary panel">
        <div><dt>Type</dt><dd>${typeBadgeLink(data.type)}</dd></div>
        <div><dt>Category</dt><dd>${data.category}</dd></div>
        <div><dt>Power</dt><dd>${data.power}</dd></div>
        <div><dt>Accuracy</dt><dd>${data.accuracy}</dd></div>
        <div><dt>PP</dt><dd>${data.pp}</dd></div>
      </dl>

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>${data.effect}</p>
      </section>

      <section class="panel" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count-line">${data.learnedBy.length} Pokémon</p>
        ${pokemonCardList(data.learnedBy)}
      </section>
    `;
  },
});
