import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { getTypes } from '../../lib/data.js';
import { englishName } from '../../lib/util.js';

export default defineRoute({
	handler: {
		GET: async () => {
			const types = await getTypes();
			return {
				types: types.map((t) => ({ name: t.name, label: englishName(t) })),
			};
		},
	},

	document: (context) => document({ ...context, title: 'Types – Pokédex' }),

	template: (context) => {
		const p = context.props.GET;
		return html`
			<h1>Types</h1>
			<ul class="type-list">
				${p.types.map(
					(t) => html`<li>
						<a class="badge badge-large type-${t.name}" href="/types/${t.name}"
							>${t.label}</a
						>
					</li>`,
				)}
			</ul>
		`;
	},
});
