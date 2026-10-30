import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { getTypes } from '../../lib/api.js';
import { document } from '../../document.js';

export default defineRoute({
  handler: async ({ url }) => {
    if (url.hostname === 'gracile-static') return { types: [] };
    const types = await getTypes();
    return { types };
  },

  document: (context) => document({ ...context, title: 'Types – Pokédex' }),

  template: ({ props }) => html`
    <main class="page types-page">
      <h1>Types</h1>
      <ul class="type-grid">
        ${props.types.map(
          (type) => html`
            <li>
              <a class="type-tile type-${type.name}" href="/types/${type.name}">${type.english}</a>
            </li>
          `,
        )}
      </ul>
    </main>
  `,
});
