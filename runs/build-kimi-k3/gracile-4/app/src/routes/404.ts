import { defineRoute } from '@gracile/gracile/route';

import { document } from '../document.js';
import { notFoundMain } from '../lib/views.js';

export default defineRoute({
	document: (context) =>
		document({ url: context.url, title: 'Not found' }),

	template: () => notFoundMain(),
});
