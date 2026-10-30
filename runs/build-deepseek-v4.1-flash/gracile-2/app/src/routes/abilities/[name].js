import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import {
  englishEffect,
  englishName,
  getAbility,
  getSpeciesIndex,
  idFromUrl,
  uniqueSpeciesFromPokemonReferences,
} from '../../lib/api.js';
import { pokemonCardList } from '../../lib/components.js';

const BUILDING = () => process.env.GRACILE_BUILD === '1';

export default defineRoute({
  handler: {
    GET: async ({ params, responseInit }) => {
      if (BUILDING()) return {};

      try {
        const [ability, speciesIndex] = await Promise.all([
          getAbility(params.name),
          getSpeciesIndex(),
        ]);

        const hiddenIds = new Set(
          (ability.pokemon ?? [])
            .filter((entry) => entry.is_hidden)
            .map((entry) => idFromUrl(entry.pokemon?.url ?? '')),
        );
        const pokemon = uniqueSpeciesFromPokemonReferences(ability.pokemon, speciesIndex).map(
          (species) => ({ ...species, hidden: hiddenIds.has(species.id) }),
        );

        return {
          pageTitle: `${englishName(ability, ability.name)} – Pokédex`,
          name: englishName(ability, ability.name),
          effect: englishEffect(ability) || '—',
          pokemon,
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

      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>${data.effect}</p>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count-line">${data.pokemon.length} Pokémon</p>
        ${pokemonCardList(data.pokemon, { hidden: (species) => species.hidden })}
      </section>
    `;
  },
});
