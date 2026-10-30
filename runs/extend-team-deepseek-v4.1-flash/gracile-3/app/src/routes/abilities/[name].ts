import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { cardList, count, notFound, section } from '../../components/partials.js';
import { document } from '../../document.js';
import { isBuildRender } from '../../lib/api.js';
import { cardsForPokemon, getAbility } from '../../lib/data.js';
import {
	DASH,
	englishName,
	englishShortEffect,
	latestEnglishFlavor,
} from '../../lib/format.js';

async function load(name: string) {
	const ability = await getAbility(name);
	if (!ability || ability.name !== name.toLowerCase()) return null;
	const pokemon = await cardsForPokemon(
		ability.pokemon,
		(p) => p.pokemon,
		(p) => ({ hidden: p.is_hidden }),
	);
	return {
		title: englishName(ability),
		effect:
			englishShortEffect(ability.effect_entries) ??
			latestEnglishFlavor(ability.flavor_text_entries) ??
			DASH,
		pokemon,
	};
}

export default defineRoute({
	handler: async ({ params, url, responseInit }) => {
		if (isBuildRender(url)) return { data: null };
		const data = await load(params.name ?? '');
		if (!data) responseInit.status = 404;
		return { data };
	},

	document: ({ props }) => document({ title: props.data?.title ?? 'Not found' }),

	template: ({ props: { data: a } }) => {
		if (!a) return notFound();
		return html`
			<h1 class="page-title">${a.title}</h1>
			${section('effect', 'Effect', html`<p>${a.effect}</p>`)}
			${section(
				'pokemon',
				'Pokémon',
				html`${count(a.pokemon.length)} ${cardList(a.pokemon)}`,
			)}
		`;
	},
});
