import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { pokemonGrid, typePill } from '../../lib/components.js';
import { getMovePageData } from '../../lib/data.js';
import { displayValue } from '../../lib/format.js';

export default defineRoute({
  handler: {
    GET: async ({ params, responseInit }) => {
      const name = decodeURIComponent(params.name ?? '').toLowerCase();
      const data = name ? await getMovePageData(name) : null;
      if (!data) {
        responseInit.status = 404;
        return { notFound: true };
      }
      return { data };
    },
  },

  document: (context) =>
    document({
      title: context.props.GET.notFound
        ? 'Not found – Pokédex'
        : `${context.props.GET.data.title} – Pokédex`,
    }),

  template: (context) => {
    if (context.props.GET.notFound) {
      return html`
        <main class="page">
          <h1>Not found</h1>
          <p><a href="/">Back to the Pokédex</a></p>
        </main>
      `;
    }

    const data = context.props.GET.data;

    return html`
      <main class="page">
        <h1>${data.title}</h1>

        <div class="facts-panel">
          <dl class="facts">
            <div><dt>Type</dt><dd>${typePill(data.typeName, data.typeLabel, `/types/${data.typeName}`)}</dd></div>
            <div><dt>Category</dt><dd>${data.category}</dd></div>
            <div><dt>Power</dt><dd>${displayValue(data.power)}</dd></div>
            <div><dt>Accuracy</dt><dd>${displayValue(data.accuracy)}</dd></div>
            <div><dt>PP</dt><dd>${displayValue(data.pp)}</dd></div>
          </dl>
        </div>

        <section class="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>${data.effect}</p>
        </section>

        <section class="panel" aria-labelledby="learned-by-heading">
          <h2 id="learned-by-heading">Learned by</h2>
          <p class="count">${data.cards.length} Pokémon</p>
          ${pokemonGrid(data.cards)}
        </section>
      </main>
    `;
  },
});
