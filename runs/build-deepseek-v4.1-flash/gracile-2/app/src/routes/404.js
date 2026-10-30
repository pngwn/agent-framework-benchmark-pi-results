import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../document.js';

export default defineRoute({
  handler: {
    GET: () => ({ pageTitle: 'Not found – Pokédex' }),
  },

  document: (context) => document(context),

  template: () => html`
    <h1>Not found</h1>
    <p><a href="/">Back to the Pokédex</a></p>
  `,
});
