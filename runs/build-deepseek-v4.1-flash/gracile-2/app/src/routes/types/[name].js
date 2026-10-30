import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import {
  getSpeciesIndex,
  getTypeCollection,
  humanize,
  uniqueSpeciesFromPokemonReferences,
} from '../../lib/api.js';
import { pokemonCardList, typeBadgeLink } from '../../lib/components.js';

const BUILDING = () => process.env.GRACILE_BUILD === '1';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

function relationTypes(type, typesByName, key) {
  return (type.data.damage_relations?.[key] ?? [])
    .map((entry) => typesByName.get(entry.name))
    .filter(Boolean);
}

export default defineRoute({
  handler: {
    GET: async ({ params, responseInit }) => {
      if (BUILDING()) return {};

      try {
        const [types, speciesIndex] = await Promise.all([
          getTypeCollection(),
          getSpeciesIndex(),
        ]);
        const type = types.find((entry) => entry.name === params.name);

        if (!type) {
          responseInit.status = 404;
          return { pageTitle: 'Not found – Pokédex', notFound: true };
        }

        const typesByName = new Map(types.map((entry) => [entry.name, entry]));
        const pokemonEntries = (type.data.pokemon ?? []).map((entry) => ({
          pokemon: entry.pokemon,
        }));
        const pokemon = uniqueSpeciesFromPokemonReferences(pokemonEntries, speciesIndex);
        const moves = [...(type.data.moves ?? [])]
          .map((move) => ({ name: move.name, label: humanize(move.name) }))
          .sort((a, b) => a.label.localeCompare(b.label));

        return {
          pageTitle: `${type.englishName} – Pokédex`,
          name: type.englishName,
          relations: RELATIONS.map(([label, key]) => ({
            label,
            types: relationTypes(type, typesByName, key).map((entry) => ({
              name: entry.name,
              englishName: entry.englishName,
            })),
          })),
          pokemon,
          moves,
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

      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations">
          ${data.relations.map(
            (relation) => html`
              <div>
                <dt>${relation.label}</dt>
                <dd>
                  ${relation.types.length
                    ? relation.types.map((type) => typeBadgeLink(type))
                    : 'None'}
                </dd>
              </div>
            `,
          )}
        </dl>
      </section>

      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count-line">${data.pokemon.length} Pokémon</p>
        ${pokemonCardList(data.pokemon)}
      </section>

      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count-line">${data.moves.length} moves</p>
        <ul class="link-grid">
          ${data.moves.map(
            (move) => html`<li><a href="/moves/${move.name}">${move.label}</a></li>`,
          )}
        </ul>
      </section>
    `;
  },
});
