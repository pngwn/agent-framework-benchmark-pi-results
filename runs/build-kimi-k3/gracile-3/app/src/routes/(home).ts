import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../document.js';
import '../features/dex-browser.js';
import { apiBase } from '../lib/api.js';
import { getGenerations, getHomeSpecies, getTypes } from '../lib/data.js';

export default defineRoute({
	handler: {
		GET: async ({ url }) => {
			const params = url.searchParams;
			let species: Awaited<ReturnType<typeof getHomeSpecies>> = [];
			let types: Awaited<ReturnType<typeof getTypes>> = [];
			let generations: Awaited<ReturnType<typeof getGenerations>> = [];
			try {
				[species, types, generations] = await Promise.all([
					getHomeSpecies(),
					getTypes(),
					getGenerations(),
				]);
			} catch {
				// The API may be unreachable when Gracile probes routes at build
				// time; real requests re-run this handler at runtime.
			}
			return {
				species,
				types,
				generations,
				q: params.get('q') ?? '',
				type: params.get('type') ?? '',
				generation: params.get('generation') ?? '',
				page: Math.max(1, Number(params.get('page')) || 1),
			};
		},
	},

	document: (context) => document({ ...context, title: 'Pokédex' }),

	template: (context) => {
		const { species, types, generations, q, type, generation, page } =
			context.props.GET;
		return html`
			<main class="wrap">
				<h1>Pokémon</h1>
				<dex-browser
					api-base=${apiBase}
					species=${JSON.stringify(species)}
					types=${JSON.stringify(types)}
					generations=${JSON.stringify(generations)}
					q=${q}
					type=${type}
					generation=${generation}
					page=${page}
				></dex-browser>
			</main>
		`;
	},
});
