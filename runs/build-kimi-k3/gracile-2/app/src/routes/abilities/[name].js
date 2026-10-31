import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { api } from '../../lib/api.js';
import { getTypeNames, pokemonRefsToSpecies } from '../../lib/data.js';
import {
	cardList,
	NOT_FOUND_TITLE,
	notFoundContent,
	pokemonCard,
} from '../../lib/views.js';
import {
	EM_DASH,
	englishName,
	englishShortEffect,
} from '../../lib/util.js';

export default defineRoute({
	handler: {
		GET: async (context) => {
			const ability = await api(`ability/${context.params.name}`);
			if (!ability) {
				context.responseInit.status = 404;
				return { notFound: true, title: NOT_FOUND_TITLE };
			}

			const enName = englishName(ability);
			const typeNames = await getTypeNames();
			const effect = englishShortEffect(ability.effect_entries) ?? EM_DASH;

			const holders = await pokemonRefsToSpecies(
				(ability.pokemon ?? []).map((entry) => ({
					...entry.pokemon,
					hidden: entry.is_hidden,
				})),
				(ref) => ({ hidden: ref.hidden }),
			);

			return {
				notFound: false,
				title: `${enName} – Pokédex`,
				enName,
				effect,
				holders,
				typeNames: Object.fromEntries(typeNames),
			};
		},
	},

	document: (context) =>
		document({ ...context, title: context.props.GET.title }),

	template: (context) => {
		const p = context.props.GET;
		if (p.notFound) return notFoundContent;
		const typeNames = new Map(Object.entries(p.typeNames));

		return html`
			<h1>${p.enName}</h1>

			<section class="panel" aria-labelledby="effect-heading">
				<h2 id="effect-heading">Effect</h2>
				<p>${p.effect}</p>
			</section>

			<section class="panel" aria-labelledby="pokemon-heading">
				<h2 id="pokemon-heading">Pokémon</h2>
				<p class="count">${p.holders.length} Pokémon</p>
				${cardList(
					p.holders.map((s) =>
						pokemonCard(s, typeNames, {
							note: s.extra?.hidden ? 'Hidden ability' : null,
						}),
					),
				)}
			</section>
		`;
	},
});
