import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { api } from '../../lib/api.js';
import { cardList, notFoundTemplate, section } from '../../lib/components.js';
import { englishName, humanize, pageTitle } from '../../lib/format.js';
import { speciesCards } from '../../lib/species-cards.js';

const RELATIONS: Array<[string, string]> = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from'],
];

export default defineRoute({
	handler: {
		GET: async ({ params, url, responseInit }) => {
			const name = params.name ?? '';
			// Build-time stub render (server mode renders at request time).
			if (url.hostname === 'gracile-static' || !name)
				return { notFound: true as const };
			let type: any;
			try {
				type = await api(`/type/${encodeURIComponent(name)}/`);
			} catch {
				responseInit.status = 404;
				return { notFound: true as const };
			}

			const cards = await speciesCards(type.pokemon ?? []);
			const moves = (type.moves ?? [])
				.map((m: { name: string }) => m.name)
				.sort((a: string, b: string) => humanize(a).localeCompare(humanize(b)));

			return { notFound: false as const, type, cards, moves };
		},
	},

	document: (context) => {
		const props = context.props.GET as any;
		const h1 = props?.notFound
			? 'Not found'
			: englishName(props?.type?.names, props?.type?.name ?? '');
		return document({ ...context, title: pageTitle(h1) });
	},

	template: (context) => {
		const props = context.props.GET as any;
		if (props.notFound) return notFoundTemplate();

		const { type, cards, moves } = props;
		const displayName = englishName(type.names, type.name);

		return html`
			<main class="container">
				<h1>${displayName}</h1>

				${section(
					'damage-relations',
					'Damage relations',
					html`<dl class="damage-relations">
						${RELATIONS.map(([term, key]) => {
							const related = type.damage_relations?.[key] ?? [];
							return html`<div>
								<dt>${term}</dt>
								<dd>
									${related.length === 0
										? 'None'
										: related.map(
												(t: { name: string }, index: number) =>
													html`${index > 0 ? ' ' : ''}<a
															class="type-badge type-${t.name}"
															href="/types/${t.name}"
															>${humanize(t.name)}</a
														>`,
											)}
								</dd>
							</div>`;
						})}
					</dl>`,
				)}
				${section(
					'pokemon',
					'Pokémon',
					html`<p class="result-count">${cards.length} Pokémon</p>
						${cardList(cards)}`,
				)}
				${section(
					'moves',
					'Moves',
					html`<p class="result-count">${moves.length} moves</p>
						<ul class="type-moves">
							${moves.map(
								(name: string) => html`<li>
									<a href="/moves/${name}">${humanize(name)}</a>
								</li>`,
							)}
						</ul>`,
				)}
			</main>
		`;
	},
});
