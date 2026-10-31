import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { api } from '../../lib/api.js';
import {
	cardList,
	notFoundTemplate,
	section,
	typeBadge,
} from '../../lib/components.js';
import {
	MISSING,
	englishName,
	englishShortEffect,
	humanize,
	latestFlavorText,
	orMissing,
	pageTitle,
} from '../../lib/format.js';
import { speciesCards } from '../../lib/species-cards.js';

export default defineRoute({
	handler: {
		GET: async ({ params, url, responseInit }) => {
			const name = params.name ?? '';
			// Build-time stub render (server mode renders at request time).
			if (url.hostname === 'gracile-static' || !name)
				return { notFound: true as const };
			let move: any;
			try {
				move = await api(`/move/${encodeURIComponent(name)}/`);
			} catch {
				responseInit.status = 404;
				return { notFound: true as const };
			}

			const cards = await speciesCards(move.learned_by_pokemon ?? []);

			const effect =
				englishShortEffect(move.effect_entries) ??
				latestFlavorText(move.flavor_text_entries) ??
				MISSING;

			return { notFound: false as const, move, cards, effect };
		},
	},

	document: (context) => {
		const props = context.props.GET as any;
		const h1 = props?.notFound
			? 'Not found'
			: englishName(props?.move?.names, props?.move?.name ?? '');
		return document({ ...context, title: pageTitle(h1) });
	},

	template: (context) => {
		const props = context.props.GET as any;
		if (props.notFound) return notFoundTemplate();

		const { move, cards, effect } = props;
		const displayName = englishName(move.names, move.name);

		return html`
			<main class="container">
				<h1>${displayName}</h1>

				<dl class="move-facts">
					<div>
						<dt>Type</dt>
						<dd>${typeBadge(move.type.name, true)}</dd>
					</div>
					<div>
						<dt>Category</dt>
						<dd>${humanize(move.damage_class?.name ?? '') || MISSING}</dd>
					</div>
					<div>
						<dt>Power</dt>
						<dd>${orMissing(move.power)}</dd>
					</div>
					<div>
						<dt>Accuracy</dt>
						<dd>${orMissing(move.accuracy)}</dd>
					</div>
					<div>
						<dt>PP</dt>
						<dd>${orMissing(move.pp)}</dd>
					</div>
				</dl>

				${section('effect', 'Effect', html`<p>${effect}</p>`)}
				${section(
					'learned-by',
					'Learned by',
					html`<p class="result-count">${cards.length} Pokémon</p>
						${cardList(cards)}`,
				)}
			</main>
		`;
	},
});
