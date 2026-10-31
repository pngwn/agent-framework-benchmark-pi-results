import { html } from 'lit';
import { defineRoute } from '@gracile/gracile/route';
import { document } from '../../document.js';
import { apiGet } from '../../lib/api.js';
import { getTypeEnglishNames, pokemonRefsToSpecies } from '../../lib/data.js';
import { humanize, englishName, englishShortEffect, latestEnglishFlavor } from '../../lib/format.js';
import { pokemonCard, section, notFoundTemplate, NOT_FOUND_TITLE } from '../../lib/views.js';

export default defineRoute({
  handler: async (context) => {
    const move = await apiGet(`/move/${encodeURIComponent(context.params.name)}/`);
    if (!move) {
      context.responseInit.status = 404;
      return { notFound: true, title: NOT_FOUND_TITLE };
    }

    const [typeEn, learners] = await Promise.all([
      getTypeEnglishNames(),
      pokemonRefsToSpecies(move.learned_by_pokemon ?? []),
    ]);

    const effect =
      englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries) ?? '—';

    const displayName = englishName(move) ?? humanize(move.name);

    return {
      title: `${displayName} – Pokédex`,
      displayName,
      type: move.type?.name ?? '',
      typeEn,
      category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
      power: move.power ?? '—',
      accuracy: move.accuracy ?? '—',
      pp: move.pp ?? '—',
      effect,
      learners,
    };
  },

  document: (context) => document({ ...context, ...(context.props ?? {}) }),

  template: (context) => {
    const props = context.props;
    if (props?.notFound) return notFoundTemplate();

    return html`
      <h1>${props.displayName}</h1>
      <div class="detail-card">
        <dl class="dl-row">
          <div>
            <dt>Type</dt>
            <dd>
              <a class="badge type-${props.type}" href="/types/${props.type}"
                >${props.typeEn[props.type] ?? humanize(props.type)}</a
              >
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>${props.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>${props.power}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>${props.accuracy}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>${props.pp}</dd>
          </div>
        </dl>
      </div>
      ${section('effect-heading', 'Effect', html`<p>${props.effect}</p>`)}
      <section class="section" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p class="count">${props.learners.length} Pokémon</p>
        <ul class="card-grid">
          ${props.learners.map((entry) => pokemonCard({ id: entry.id, speciesName: entry.speciesName }))}
        </ul>
      </section>
    `;
  },
});
