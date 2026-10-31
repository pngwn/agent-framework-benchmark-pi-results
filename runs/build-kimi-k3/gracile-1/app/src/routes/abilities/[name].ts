import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { api } from '../../lib/api.js';
import { cardList, notFoundTemplate, section } from '../../lib/components.js';
import {
	englishName,
	englishShortEffect,
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
			let ability: any;
			try {
				ability = await api(`/ability/${encodeURIComponent(name)}/`);
			} catch {
				responseInit.status = 404;
				return { notFound: true as const };
			}

			const entries = await speciesCards(ability.pokemon ?? []);
			const cards = entries.map((card) => ({
				...card,
				hiddenAbility: Boolean(card.entry.is_hidden),
			}));
			const effect = englishShortEffect(ability.effect_entries) ?? '—';

			return { notFound: false as const, ability, cards, effect };
		},
	},

	document: (context) => {
		const props = context.props.GET as any;
		const h1 = props?.notFound
			? 'Not found'
			: englishName(props?.ability?.names, props?.ability?.name ?? '');
		return document({ ...context, title: pageTitle(h1) });
	},

	template: (context) => {
		const props = context.props.GET as any;
		if (props.notFound) return notFoundTemplate();

		const { ability, cards, effect } = props;
		const displayName = englishName(ability.names, ability.name);

		return html`
			<main class="container">
				<h1>${displayName}</h1>

				${section('effect', 'Effect', html`<p>${effect}</p>`)}
				${section(
					'pokemon',
					'Pokémon',
					html`<p class="result-count">${cards.length} Pokémon</p>
						${cardList(cards)}`,
				)}
			</main>
		`;
	},
});
