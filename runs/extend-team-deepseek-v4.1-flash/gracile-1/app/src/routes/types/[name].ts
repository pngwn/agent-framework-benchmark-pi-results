import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import {
	cardList,
	count,
	notFound,
	section,
	typeLink,
} from '../../components/partials.js';
import { document } from '../../document.js';
import { isBuildRender } from '../../lib/api.js';
import { type ApiType, cardsForPokemon, getType, getTypeLabels } from '../../lib/data.js';
import { englishName, humanize } from '../../lib/format.js';

const RELATIONS: [keyof ApiType['damage_relations'], string][] = [
	['double_damage_to', 'Super effective against'],
	['half_damage_to', 'Not very effective against'],
	['no_damage_to', 'No effect against'],
	['double_damage_from', 'Weak to'],
	['half_damage_from', 'Resists'],
	['no_damage_from', 'Immune to'],
];

async function load(name: string) {
	const type = await getType(name);
	if (!type || type.name !== name.toLowerCase()) return null;
	const [labels, pokemon] = await Promise.all([
		getTypeLabels(),
		cardsForPokemon(type.pokemon, (p) => p.pokemon),
	]);
	return {
		title: englishName(type),
		relations: RELATIONS.map(([key, label]) => ({
			label,
			types: type.damage_relations[key].map((t) => ({
				name: t.name,
				label: labels.get(t.name) ?? humanize(t.name),
			})),
		})),
		pokemon,
		moves: type.moves
			.map((m) => ({ name: m.name, label: humanize(m.name) }))
			.sort((a, b) => a.label.localeCompare(b.label)),
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

	template: ({ props: { data: t } }) => {
		if (!t) return notFound();
		return html`
			<h1 class="page-title">${t.title}</h1>
			${section(
				'damage-relations',
				'Damage relations',
				html`<dl class="relations">
					${t.relations.map(
						(r) => html`<div>
							<dt>${r.label}</dt>
							<dd>
								${r.types.length
									? html`<span class="type-list">${r.types.map(typeLink)}</span>`
									: 'None'}
							</dd>
						</div>`,
					)}
				</dl>`,
			)}
			${section(
				'pokemon',
				'Pokémon',
				html`${count(t.pokemon.length)} ${cardList(t.pokemon)}`,
			)}
			${section(
				'moves',
				'Moves',
				html`${count(t.moves.length, 'moves')}
					<ul class="move-columns">
						${t.moves.map(
							(m) => html`<li><a href=${`/moves/${m.name}`}>${m.label}</a></li>`,
						)}
					</ul>`,
			)}
		`;
	},
});
