import { html } from 'lit';
import { defineRoute } from '@gracile/gracile/route';
import { document } from '../../document.js';
import { getTypes, getTypeEnglishNames, pokemonRefsToSpecies } from '../../lib/data.js';
import { humanize, englishName } from '../../lib/format.js';
import { pokemonCard, notFoundTemplate, NOT_FOUND_TITLE } from '../../lib/views.js';

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export default defineRoute({
  handler: async (context) => {
    const [types, typeEn] = await Promise.all([getTypes(), getTypeEnglishNames()]);
    const type = types.find((entry) => entry.name === context.params.name);
    if (!type) {
      context.responseInit.status = 404;
      return { notFound: true, title: NOT_FOUND_TITLE };
    }

    const pokemon = await pokemonRefsToSpecies(type.pokemon ?? []);

    const relations = RELATIONS.map(([label, key]) => ({
      label,
      types: (type.damage_relations?.[key] ?? []).map((ref) => ref.name),
    }));

    const moves = [...(type.moves ?? [])]
      .map((ref) => ref.name)
      .sort((a, b) => humanize(a).localeCompare(humanize(b)));

    const displayName = englishName(type) ?? humanize(type.name);

    return {
      title: `${displayName} – Pokédex`,
      displayName,
      relations,
      typeEn,
      pokemon,
      moves,
    };
  },

  document: (context) => document({ ...context, ...(context.props ?? {}) }),

  template: (context) => {
    const props = context.props;
    if (props?.notFound) return notFoundTemplate();

    return html`
      <h1>${props.displayName}</h1>

      <section class="section" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="damage-relations">
          ${props.relations.map(
            (relation) => html`<div>
              <dt>${relation.label}</dt>
              <dd>
                ${relation.types.length
                  ? relation.types.map(
                      (type) =>
                        html`<a class="badge type-${type}" href="/types/${type}"
                          >${props.typeEn[type] ?? humanize(type)}</a
                        >`,
                    )
                  : 'None'}
              </dd>
            </div>`,
          )}
        </dl>
      </section>

      <section class="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">${props.pokemon.length} Pokémon</p>
        <ul class="card-grid">
          ${props.pokemon.map((entry) => pokemonCard({ id: entry.id, speciesName: entry.speciesName }))}
        </ul>
      </section>

      <section class="section" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">${props.moves.length} moves</p>
        <ul class="move-list">
          ${props.moves.map(
            (move) => html`<li><a href="/moves/${move}">${humanize(move)}</a></li>`,
          )}
        </ul>
      </section>
    `;
  },
});
