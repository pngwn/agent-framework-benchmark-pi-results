import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { getTypes } from '../../lib/data.js';

export default defineRoute({
  handler: {
    GET: async () => ({ types: await getTypes() }),
  },

  document: () => document({ title: 'Types – Pokédex' }),

  template: (context) => html`
    <main class="page">
      <h1>Types</h1>
      <ul class="types-grid">
        ${context.props.GET.types.map(
          (type) => html`
            <li>
              <a class=${`type-tile type-${type.name}`} href=${`/types/${type.name}`}>${type.label}</a>
            </li>
          `,
        )}
      </ul>
    </main>
  `,
});
