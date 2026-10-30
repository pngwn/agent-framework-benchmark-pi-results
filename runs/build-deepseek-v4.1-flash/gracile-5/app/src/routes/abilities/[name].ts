import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { pokemonGrid } from '../../lib/components.js';
import { getAbilityPage } from '../../lib/data.js';

export default defineRoute({
  handler: {
    GET: async ({ params, responseInit }) => {
      const name = decodeURIComponent(params.name ?? '').toLowerCase();
      if (!name) {
        responseInit.status = 404;
        return { notFound: true };
      }
      const data = await getAbilityPage(name).catch(() => null);
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

        <section class="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>${data.effect}</p>
        </section>

        <section class="panel" aria-labelledby="pokemon-heading">
          <h2 id="pokemon-heading">Pokémon</h2>
          <p class="count">${data.cards.length} Pokémon</p>
          ${pokemonGrid(data.cards)}
        </section>
      </main>
    `;
  },
});
