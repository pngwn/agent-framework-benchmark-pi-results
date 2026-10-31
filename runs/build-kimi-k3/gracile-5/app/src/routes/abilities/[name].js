import { html } from 'lit';
import { defineRoute } from '@gracile/gracile/route';
import { document } from '../../document.js';
import { apiGet } from '../../lib/api.js';
import { pokemonRefsToSpecies } from '../../lib/data.js';
import { humanize, englishName, englishShortEffect } from '../../lib/format.js';
import { pokemonCard, section, notFoundTemplate, NOT_FOUND_TITLE } from '../../lib/views.js';

export default defineRoute({
  handler: async (context) => {
    const ability = await apiGet(`/ability/${encodeURIComponent(context.params.name)}/`);
    if (!ability) {
      context.responseInit.status = 404;
      return { notFound: true, title: NOT_FOUND_TITLE };
    }

    const pokemon = await pokemonRefsToSpecies(ability.pokemon ?? [], (ref, existing) => ({
      hiddenAbility: Boolean(ref.is_hidden) || Boolean(existing?.hiddenAbility),
    }));

    const effect = englishShortEffect(ability.effect_entries) ?? '—';
    const displayName = englishName(ability) ?? humanize(ability.name);

    return {
      title: `${displayName} – Pokédex`,
      displayName,
      effect,
      pokemon,
    };
  },

  document: (context) => document({ ...context, ...(context.props ?? {}) }),

  template: (context) => {
    const props = context.props;
    if (props?.notFound) return notFoundTemplate();

    return html`
      <h1>${props.displayName}</h1>
      ${section('effect-heading', 'Effect', html`<p>${props.effect}</p>`)}
      <section class="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">${props.pokemon.length} Pokémon</p>
        <ul class="card-grid">
          ${props.pokemon.map((entry) =>
            pokemonCard({ id: entry.id, speciesName: entry.speciesName, hiddenAbility: entry.hiddenAbility }),
          )}
        </ul>
      </section>
    `;
  },
});
