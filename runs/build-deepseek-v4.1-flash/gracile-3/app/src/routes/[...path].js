import { html } from '@gracile/gracile/server-html';
import { defineRoute } from '@gracile/gracile/route';

import { document } from '../document.js';

export default defineRoute({
  document: (context) => document({ ...context, title: 'Pokédex' }),
  handler: {
    GET: () => ({
      apiBase: (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, ''),
    }),
  },
  template: ({ props }) => html`
    <main>
      <pokedex-app data-api=${props.GET.apiBase}></pokedex-app>
    </main>
  `,
});
