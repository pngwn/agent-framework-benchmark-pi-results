import { defineRoute } from '@gracile/gracile/route';

import { notFound } from '../components/partials.js';
import { document } from '../document.js';

export default defineRoute({
	document: () => document({ title: 'Not found' }),

	template: () => notFound(),
});
