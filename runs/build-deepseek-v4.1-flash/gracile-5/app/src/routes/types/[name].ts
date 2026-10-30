import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { pokemonGrid, typePill } from '../../lib/components.js';
import { getTypePage } from '../../lib/data.js';

export default defineRoute({
  handler: {
    GET: async ({ params, responseInit }) => {
      const name = decodeURIComponent(params.name ?? '').toLowerCase();
      const data = name ? await getTypePage(name) : null;
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

        <section class="panel" aria-labelledby="damage-relations-heading">
          <h2 id="damage-relations-heading">Damage relations</h2>
          <dl class="damage-relations">
            ${data.relations.map(
              (relation: any) => html`
                <div class="relation">
                  <dt>${relation.label}</dt>
                  <dd>
                    ${relation.types.length
                      ? relation.types.map((type: any) =>
                          typePill(type.name, type.label, `/types/${type.name}`),
                        )
                      : html`<span>None</span>`}
                  </dd>
                </div>
              `,
            )}
          </dl>
        </section>

        <section class="panel" aria-labelledby="pokemon-heading">
          <h2 id="pokemon-heading">Pokémon</h2>
          <p class="count">${data.cards.length} Pokémon</p>
          ${pokemonGrid(data.cards)}
        </section>

        <section class="panel" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>
          <p class="count">${data.moves.length} moves</p>
          <ul class="move-links">
            ${data.moves.map(
              (move: any) => html`
                <li><a href=${`/moves/${move.name}`}>${move.label}</a></li>
              `,
            )}
          </ul>
        </section>
      </main>
    `;
  },
});
