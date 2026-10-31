import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { api } from '../../lib/api.js';
import { EXCLUDED_TYPES, humanize, pageTitle } from '../../lib/format.js';

export default defineRoute({
	handler: {
		GET: async () => {
			const index = await api('/type/?limit=100');
			const types = index.results
				.filter((t: { name: string }) => !EXCLUDED_TYPES.has(t.name))
				.map((t: { name: string }) => t.name);
			return { types };
		},
	},

	document: (context) => document({ ...context, title: pageTitle('Types') }),

	template: (context) => {
		const { types } = context.props.GET as any;
		return html`
			<main class="container">
				<h1>Types</h1>
				<ul class="type-list-grid">
					${types.map(
						(name: string) => html`<li>
							<a class="type-block type-${name}" href="/types/${name}"
								>${humanize(name)}</a
							>
						</li>`,
					)}
				</ul>
			</main>
		`;
	},
});
