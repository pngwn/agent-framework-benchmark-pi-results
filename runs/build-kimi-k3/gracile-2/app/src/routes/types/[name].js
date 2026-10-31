import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { api } from '../../lib/api.js';
import {
	EXCLUDED_TYPES,
	getTypeNames,
	pokemonRefsToSpecies,
} from '../../lib/data.js';
import {
	cardList,
	NOT_FOUND_TITLE,
	notFoundContent,
	pokemonCard,
} from '../../lib/views.js';
import { englishName, humanize } from '../../lib/util.js';

const RELATIONS = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from'],
];

export default defineRoute({
	handler: {
		GET: async (context) => {
			const name = context.params.name;
			const type = EXCLUDED_TYPES.has(name) ? null : await api(`type/${name}`);
			if (!type) {
				context.responseInit.status = 404;
				return { notFound: true, title: NOT_FOUND_TITLE };
			}

			const enName = englishName(type);
			const typeNames = await getTypeNames();

			const relations = RELATIONS.map(([label, key]) => ({
				label,
				targets: (type.damage_relations?.[key] ?? []).map((t) => ({
					name: t.name,
					label: typeNames.get(t.name) ?? humanize(t.name),
				})),
			}));

			const pokemon = await pokemonRefsToSpecies(
				(type.pokemon ?? []).map((entry) => entry.pokemon),
			);

			const moves = (type.moves ?? [])
				.map((m) => ({ name: m.name, label: humanize(m.name) }))
				.sort((a, b) => a.label.localeCompare(b.label));

			return {
				notFound: false,
				title: `${enName} – Pokédex`,
				enName,
				relations,
				pokemon,
				moves,
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

			<section class="panel" aria-labelledby="relations-heading">
				<h2 id="relations-heading">Damage relations</h2>
				<dl class="relations">
					${p.relations.map(
						(r) => html`<div>
							<dt>${r.label}</dt>
							<dd>
								${r.targets.length > 0
									? r.targets.map(
											(t) =>
												html`<a class="badge type-${t.name}" href="/types/${t.name}"
													>${t.label}</a
												>`,
										)
									: 'None'}
							</dd>
						</div>`,
					)}
				</dl>
			</section>

			<section class="panel" aria-labelledby="pokemon-heading">
				<h2 id="pokemon-heading">Pokémon</h2>
				<p class="count">${p.pokemon.length} Pokémon</p>
				${cardList(p.pokemon.map((s) => pokemonCard(s, typeNames)))}
			</section>

			<section class="panel" aria-labelledby="moves-heading">
				<h2 id="moves-heading">Moves</h2>
				<p class="count">${p.moves.length} moves</p>
				<ul class="move-list">
					${p.moves.map(
						(m) => html`<li><a href="/moves/${m.name}">${m.label}</a></li>`,
					)}
				</ul>
			</section>
		`;
	},
});
