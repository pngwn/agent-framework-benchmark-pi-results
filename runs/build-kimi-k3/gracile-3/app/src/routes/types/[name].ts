import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import {
	notFoundTemplate,
	pokemonCardList,
	typeBadgeLink,
} from '../../features/partials.js';
import { api, idFromUrl } from '../../lib/api.js';
import {
	ALT_FORM_ID_THRESHOLD,
	EXCLUDED_TYPES,
	cardsFromPokemonRefs,
	getTypes,
	labelOf,
} from '../../lib/data.js';
import { humanize } from '../../lib/format.js';

const RELATIONS: [string, string][] = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from'],
];

export default defineRoute({
	handler: {
		GET: async ({ params }) => {
			const name = params.name?.toLowerCase();
			if (!name || EXCLUDED_TYPES.has(name)) return { notFound: true };
			const [type, types] = await Promise.all([api(`type/${name}/`), getTypes()]);
			if (!type) return { notFound: true };
			const labelFor = (typeName: string) =>
				types.find((entry) => entry.name === typeName)?.label ?? humanize(typeName);

			const relations = RELATIONS.map(([term, key]) => ({
				term,
				types: ((type.damage_relations?.[key] ?? []) as any[]).map((entry) => ({
					name: entry.name as string,
					label: labelFor(entry.name),
				})),
			}));

			const cards = await cardsFromPokemonRefs(type.pokemon ?? []);

			const moves = (type.moves as any[])
				.map((entry) => ({ name: entry.name as string, label: humanize(entry.name) }))
				.sort((a, b) => a.label.localeCompare(b.label));

			return {
				notFound: false,
				displayName: labelOf(type),
				relations,
				cards,
				moves,
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

		const { displayName, relations, cards, moves } = props;

		return html`
			<main class="wrap">
				<h1>${displayName}</h1>

				<section class="section" aria-labelledby="damage-relations-heading">
					<h2 id="damage-relations-heading">Damage relations</h2>
					<dl class="damage-relations">
						${relations.map(
							(relation) => html`
								<div>
									<dt>${relation.term}</dt>
									<dd>
										${relation.types.length
											? relation.types.map((type) =>
													typeBadgeLink(type.name, type.label),
												)
											: 'None'}
									</dd>
								</div>
							`,
						)}
					</dl>
				</section>

				<section class="section" aria-labelledby="pokemon-heading">
					<h2 id="pokemon-heading">Pokémon</h2>
					<p class="count">${cards.length} Pokémon</p>
					${pokemonCardList(cards)}
				</section>

				<section class="section" aria-labelledby="moves-heading">
					<h2 id="moves-heading">Moves</h2>
					<p class="count">${moves.length} moves</p>
					<ul class="move-list">
						${moves.map(
							(move) => html`
								<li><a href="/moves/${move.name}">${move.label}</a></li>
							`,
						)}
					</ul>
				</section>
			</main>
		`;
	},
});
