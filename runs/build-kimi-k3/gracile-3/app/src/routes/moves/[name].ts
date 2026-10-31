import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { notFoundTemplate, pokemonCardList } from '../../features/partials.js';
import { api } from '../../lib/api.js';
import {
	cardsFromPokemonRefs,
	englishShortEffect,
	labelOf,
	latestEnglishFlavor,
	typeLabel,
} from '../../lib/data.js';
import { EM_DASH, humanize, valueOrDash } from '../../lib/format.js';

export default defineRoute({
	handler: {
		GET: async ({ params }) => {
			const name = params.name?.toLowerCase();
			if (!name) return { notFound: true };
			const move = await api(`move/${name}/`);
			if (!move) return { notFound: true };
			const cards = await cardsFromPokemonRefs(move.learned_by_pokemon ?? []);
			return {
				notFound: false,
				move,
				cards,
				displayName: labelOf(move),
				moveTypeLabel: await typeLabel(move.type?.name ?? ''),
				effect:
					englishShortEffect(move.effect_entries) ??
					latestEnglishFlavor(move.flavor_text_entries) ??
					EM_DASH,
			};
		},
	},

	document: (context) => {
		const props = context.props.GET;
		return document({
			...context,
			title: props.notFound
				? 'Not found – Pokédex'
				: `${props.displayName} – Pokédex`,
		});
	},

	template: (context) => {
		const props = context.props.GET;
		if (props.notFound) return html`<main class="wrap">${notFoundTemplate}</main>`;

		const { move, cards, displayName, moveTypeLabel, effect } = props;

		return html`
			<main class="wrap">
				<h1>${displayName}</h1>

				<div class="section">
					<dl class="facts">
						<div>
							<dt>Type</dt>
							<dd>
								<a class="type-badge type-${move.type.name}" href="/types/${move.type.name}"
									>${moveTypeLabel}</a
								>
							</dd>
						</div>
						<div>
							<dt>Category</dt>
							<dd>${humanize(move.damage_class.name)}</dd>
						</div>
						<div>
							<dt>Power</dt>
							<dd>${valueOrDash(move.power)}</dd>
						</div>
						<div>
							<dt>Accuracy</dt>
							<dd>${valueOrDash(move.accuracy)}</dd>
						</div>
						<div>
							<dt>PP</dt>
							<dd>${valueOrDash(move.pp)}</dd>
						</div>
					</dl>
				</div>

				<section class="section" aria-labelledby="effect-heading">
					<h2 id="effect-heading">Effect</h2>
					<p>${effect}</p>
				</section>

				<section class="section" aria-labelledby="learned-by-heading">
					<h2 id="learned-by-heading">Learned by</h2>
					<p class="count">${cards.length} Pokémon</p>
					${pokemonCardList(cards)}
				</section>
			</main>
		`;
	},
});
