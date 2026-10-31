import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { getTypes } from '../../lib/data.js';

export default defineRoute({
	handler: {
		GET: async () => {
			let types: Awaited<ReturnType<typeof getTypes>> = [];
			try {
				types = await getTypes();
			} catch {
				// The API may be unreachable when Gracile probes routes at build time.
			}
			return { types };
		},
	},

	document: (context) => document({ ...context, title: 'Types – Pokédex' }),

	template: (context) => html`
		<main class="wrap">
			<h1>Types</h1>
			<ul class="type-list">
				${context.props.GET.types.map(
					(type) => html`
						<li>
							<a class="type-${type.name}" href="/types/${type.name}">${type.label}</a>
						</li>
					`,
				)}
			</ul>
		</main>
	`,
});
