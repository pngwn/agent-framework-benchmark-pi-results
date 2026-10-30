import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import {
  getMoveCardData,
  getMoveRecord,
  mapPokemonRefsToSpecies,
} from '../../lib/api.js';
import {
  humanize,
  latestEnglishFlavor,
  shortEffect,
  valueOrDash,
} from '../../lib/text.js';
import { cardGrid, countLine, section } from '../../lib/view.js';
import { document } from '../../document.js';

function notFoundPage() {
  return html`<main class="page"><h1>Not found</h1><p><a href="/">Back to Pokédex</a></p></main>`;
}

export default defineRoute({
  handler: async ({ params, url }) => {
    if (url.hostname === 'gracile-static') return { found: false };
    try {
      const record = await getMoveRecord(params.name);
      const [move, learnedBy] = await Promise.all([
        getMoveCardData(record),
        mapPokemonRefsToSpecies(record.learned_by_pokemon ?? []),
      ]);
      return { found: true, move, learnedBy };
    } catch (error) {
      if (error.status === 404) return { found: false };
      throw error;
    }
  },

  document: (context) =>
    document({
      ...context,
      title: context.props.found ? `${context.props.move.displayName} – Pokédex` : 'Not found – Pokédex',
    }),

  template: ({ props }) => {
    if (!props.found) return notFoundPage();
    const { move, learnedBy } = props;
    const effect =
      shortEffect(move) ?? latestEnglishFlavor(move.flavor_text_entries) ?? '—';
    return html`
      <main class="page move-page">
        <h1>${move.displayName}</h1>
        <dl class="facts">
          <div><dt>Type</dt><dd><a class="type-pill type-${move.type?.name}" href="/types/${move.type?.name}">${move.typeEnglish}</a></dd></div>
          <div><dt>Category</dt><dd>${humanize(move.damage_class?.name ?? '') || '—'}</dd></div>
          <div><dt>Power</dt><dd>${valueOrDash(move.power)}</dd></div>
          <div><dt>Accuracy</dt><dd>${valueOrDash(move.accuracy)}</dd></div>
          <div><dt>PP</dt><dd>${valueOrDash(move.pp)}</dd></div>
        </dl>

        ${section('effect-heading', 'Effect', html`<p>${effect}</p>`)}
        ${section(
          'learned-by-heading',
          'Learned by',
          html`
            ${countLine(learnedBy.length)} ${cardGrid(learnedBy)}
          `,
        )}
      </main>
    `;
  },
});
