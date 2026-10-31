import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../document.js';
import { notFoundTemplate } from '../features/partials.js';

export default defineRoute({
	document: (context) => document({ ...context, title: 'Not found – Pokédex' }),

	template: () => html`<main class="wrap">${notFoundTemplate}</main>`,
});
