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
	humanize,
	latestEnglishFlavorText,
	valueOrDash,
} from '../../lib/util.js';

export default defineRoute({
	handler: {
		GET: async (context) => {
			const move = await api(`move/${context.params.name}`);
			if (!move) {
				context.responseInit.status = 404;
				return { notFound: true, title: NOT_FOUND_TITLE };
			}

			const enName = englishName(move);
			const typeNames = await getTypeNames();
			const effect =
				englishShortEffect(move.effect_entries) ??
				latestEnglishFlavorText(move.flavor_text_entries) ??
				EM_DASH;

			const learners = await pokemonRefsToSpecies(
				move.learned_by_pokemon ?? [],
			);

			return {
				notFound: false,
				title: `${enName} – Pokédex`,
				enName,
				type: move.type?.name ?? null,
				typeLabel: move.type?.name
					? (typeNames.get(move.type.name) ?? humanize(move.type.name))
					: EM_DASH,
				category: move.damage_class?.name
					? humanize(move.damage_class.name)
					: EM_DASH,
				power: valueOrDash(move.power),
				accuracy: valueOrDash(move.accuracy),
				pp: valueOrDash(move.pp),
				effect,
				learners,
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

			<dl class="facts">
				<div>
					<dt>Type</dt>
					<dd>
						${p.type
							? html`<a class="badge type-${p.type}" href="/types/${p.type}"
									>${p.typeLabel}</a
								>`
							: EM_DASH}
					</dd>
				</div>
				<div>
					<dt>Category</dt>
					<dd>${p.category}</dd>
				</div>
				<div>
					<dt>Power</dt>
					<dd>${p.power}</dd>
				</div>
				<div>
					<dt>Accuracy</dt>
					<dd>${p.accuracy}</dd>
				</div>
				<div>
					<dt>PP</dt>
					<dd>${p.pp}</dd>
				</div>
			</dl>

			<section class="panel" aria-labelledby="effect-heading">
				<h2 id="effect-heading">Effect</h2>
				<p>${p.effect}</p>
			</section>

			<section class="panel" aria-labelledby="learned-by-heading">
				<h2 id="learned-by-heading">Learned by</h2>
				<p class="count">${p.learners.length} Pokémon</p>
				${cardList(
					p.learners.map((s) => pokemonCard(s, typeNames)),
				)}
			</section>
		`;
	},
});
