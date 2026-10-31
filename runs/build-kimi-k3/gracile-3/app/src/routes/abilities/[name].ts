import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { notFoundTemplate, pokemonCardList } from '../../features/partials.js';
import { api, idFromUrl } from '../../lib/api.js';
import {
	ALT_FORM_ID_THRESHOLD,
	englishShortEffect,
	getSpeciesList,
	labelOf,
	type CardEntry,
} from '../../lib/data.js';
import { EM_DASH } from '../../lib/format.js';

export default defineRoute({
	handler: {
		GET: async ({ params }) => {
			const name = params.name?.toLowerCase();
			if (!name) return { notFound: true };
			const ability = await api(`ability/${name}/`);
			if (!ability) return { notFound: true };

			const byId = new Map<number, boolean>();
			for (const entry of ability.pokemon as any[]) {
				const id = idFromUrl(entry.pokemon.url);
				if (id >= ALT_FORM_ID_THRESHOLD) continue;
				byId.set(id, (byId.get(id) ?? false) || Boolean(entry.is_hidden));
			}
			const speciesList = await getSpeciesList();
			const nameOf = new Map(speciesList.map((species) => [species.id, species.name]));
			const cards: CardEntry[] = [...byId.keys()]
				.sort((a, b) => a - b)
				.map((id) => ({ id, name: nameOf.get(id)!, hidden: byId.get(id) }))
				.filter((card) => Boolean(card.name));

			return {
				notFound: false,
				cards,
				displayName: labelOf(ability),
				effect: englishShortEffect(ability.effect_entries) ?? EM_DASH,
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

		const { cards, displayName, effect } = props;

		return html`
			<main class="wrap">
				<h1>${displayName}</h1>

				<section class="section" aria-labelledby="effect-heading">
					<h2 id="effect-heading">Effect</h2>
					<p>${effect}</p>
				</section>

				<section class="section" aria-labelledby="pokemon-heading">
					<h2 id="pokemon-heading">Pokémon</h2>
					<p class="count">${cards.length} Pokémon</p>
					${pokemonCardList(cards)}
				</section>
			</main>
		`;
	},
});
