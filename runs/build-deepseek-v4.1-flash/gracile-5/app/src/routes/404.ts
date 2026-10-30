import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../document.js';

export default defineRoute({
  document: () => document({ title: 'Not found – Pokédex' }),

  template: () => html`
    <main class="page">
      <h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>
    </main>
  `,
});
