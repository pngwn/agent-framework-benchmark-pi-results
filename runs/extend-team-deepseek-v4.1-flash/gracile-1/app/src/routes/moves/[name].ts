import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { cardList, count, notFound, section, typeLink } from '../../components/partials.js';
import { document } from '../../document.js';
import { isBuildRender } from '../../lib/api.js';
import { cardsForPokemon, getMove, getTypeLabels } from '../../lib/data.js';
import {
	DASH,
	englishName,
	englishShortEffect,
	humanize,
	latestEnglishFlavor,
	orDash,
} from '../../lib/format.js';

async function load(name: string) {
	const move = await getMove(name);
	if (!move || move.name !== name.toLowerCase()) return null;
	const [typeLabels, learnedBy] = await Promise.all([
		getTypeLabels(),
		cardsForPokemon(move.learned_by_pokemon, (p) => p),
	]);
	const effect = englishShortEffect(move.effect_entries)?.replaceAll(
		'$effect_chance',
		String(move.effect_chance ?? ''),
	);
	return {
		title: englishName(move),
		type: {
			name: move.type.name,
			label: typeLabels.get(move.type.name) ?? humanize(move.type.name),
		},
		category: move.damage_class ? humanize(move.damage_class.name) : null,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect: effect ?? latestEnglishFlavor(move.flavor_text_entries) ?? DASH,
		learnedBy,
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

	template: ({ props: { data: m } }) => {
		if (!m) return notFound();
		return html`
			<h1 class="page-title">${m.title}</h1>
			<dl class="panel facts facts--move">
				<div><dt>Type</dt><dd>${typeLink(m.type)}</dd></div>
				<div><dt>Category</dt><dd>${orDash(m.category)}</dd></div>
				<div><dt>Power</dt><dd>${orDash(m.power)}</dd></div>
				<div><dt>Accuracy</dt><dd>${orDash(m.accuracy)}</dd></div>
				<div><dt>PP</dt><dd>${orDash(m.pp)}</dd></div>
			</dl>
			${section('effect', 'Effect', html`<p>${m.effect}</p>`)}
			${section(
				'learned-by',
				'Learned by',
				html`${count(m.learnedBy.length)} ${cardList(m.learnedBy)}`,
			)}
		`;
	},
});
