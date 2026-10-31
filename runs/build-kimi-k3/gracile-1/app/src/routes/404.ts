import { defineRoute } from '@gracile/gracile/route';

import { document } from '../document.js';
import { notFoundTemplate } from '../lib/components.js';
import { pageTitle } from '../lib/format.js';

export default defineRoute({
	document: (context) =>
		document({ ...context, title: pageTitle('Not found') }),

	template: () => notFoundTemplate(),
});
