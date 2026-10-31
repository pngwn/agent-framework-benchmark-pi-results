import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { getTypes, type TypeInfo } from '../../lib/data.js';

interface TypesProps {
	kind: 'ok' | 'build';
	types: TypeInfo[];
}

export default defineRoute({
	handler: async (context): Promise<TypesProps> => {
		if (context.url.hostname === 'gracile-static')
			return { kind: 'build', types: [] };
		return { kind: 'ok', types: await getTypes() };
	},

	document: (context) => document({ url: context.url, title: 'Types' }),

	template: (context) => {
		const props = context.props as TypesProps;
		return html`
			<main class="content">
				<h1>Types</h1>
				<ul class="type-list">
					${props.types.map(
						(type) => html`<li>
							<a class="type-link type-${type.name}" href="/types/${type.name}"
								>${type.en}</a
							>
						</li>`,
					)}
				</ul>
			</main>
		`;
	},
});
