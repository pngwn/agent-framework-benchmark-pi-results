import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { isBuildRender } from '../../lib/api.js';
import { getTypes } from '../../lib/data.js';

export default defineRoute({
	handler: async ({ url }) => ({
		types: isBuildRender(url)
			? []
			: (await getTypes()).map((t) => ({ name: t.name, label: t.label })),
	}),

	document: () => document({ title: 'Types' }),

	template: ({ props }) => html`
		<h1 class="page-title">Types</h1>
		<ul class="type-grid">
			${props.types.map(
				(t) =>
					html`<li>
						<a
							class="type-tile"
							style=${`--type-color: var(--type-${t.name}, var(--color-text-muted))`}
							href=${`/types/${t.name}`}
							>${t.label}</a
						>
					</li>`,
			)}
		</ul>
	`,
});
