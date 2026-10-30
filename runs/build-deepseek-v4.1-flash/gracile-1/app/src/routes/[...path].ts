import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../document.js';

export default defineRoute({
  document: (context) => document({ ...context, title: 'Not found – Pokédex' }),
  template: () => html`
    <main class="page">
      <h1>Not found</h1>
      <p><a href="/">Back to Pokédex</a></p>
    </main>
  `,
});
