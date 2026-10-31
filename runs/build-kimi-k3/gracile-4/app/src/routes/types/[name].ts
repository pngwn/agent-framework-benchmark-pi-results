import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { api, frontSpriteUrl, mapLimit } from '../../lib/api.js';
import { resolveSpecies } from '../../lib/data.js';
import {
	FIRST_FORM_ID,
	englishName,
	humanize,
	idFromUrl,
	type LocalizedName,
	type NamedReference,
} from '../../lib/util.js';
import {
	cardList,
	notFoundMain,
	section,
	typeBadge,
	type CardData,
} from '../../lib/views.js';

interface TypeRecord {
	id: number;
	name: string;
	names: LocalizedName[];
	damage_relations: Record<string, NamedReference[]>;
	pokemon: { slot: number; pokemon: NamedReference }[];
	moves: NamedReference[];
}

const RELATIONS: { term: string; key: string }[] = [
	{ term: 'Super effective against', key: 'double_damage_to' },
	{ term: 'Not very effective against', key: 'half_damage_to' },
	{ term: 'No effect against', key: 'no_damage_to' },
	{ term: 'Weak to', key: 'double_damage_from' },
	{ term: 'Resists', key: 'half_damage_from' },
	{ term: 'Immune to', key: 'no_damage_from' },
];

interface TypeProps {
	kind: 'ok' | 'notfound' | 'build';
	title?: string;
	h1?: string;
	relations?: { term: string; types: { name: string; en: string }[] }[];
	count?: number;
	cards?: CardData[];
	moveCount?: number;
	moves?: { name: string; human: string }[];
}

export default defineRoute({
	handler: async (context): Promise<TypeProps> => {
		if (context.url.hostname === 'gracile-static') return { kind: 'build' };

		const name = (context.params.name ?? '').toLowerCase();
		const type = await api<TypeRecord>(`/type/${name}`);
		if (!type) {
			context.responseInit.status = 404;
			return { kind: 'notfound' };
		}

		const displayName = englishName(type.names, type.name);

		// Damage relations, with English names for every related type.
		const relations = await mapLimit(RELATIONS, 6, async (relation) => {
			const refs = type.damage_relations?.[relation.key] ?? [];
			const related = await mapLimit(refs, 8, async (ref) => {
				const record = await api<{ names: LocalizedName[] }>(ref.url);
				return { name: ref.name, en: englishName(record?.names, ref.name) };
			});
			return { term: relation.term, types: related };
		});

		const pokemonIds = (type.pokemon ?? [])
			.map((entry) => idFromUrl(entry.pokemon.url))
			.filter((id): id is number => id !== null && id < FIRST_FORM_ID);

		const cards = (
			await mapLimit(pokemonIds, 48, (id) => resolveSpecies(id))
		)
			.filter((s): s is NonNullable<typeof s> => s !== null)
			.sort((a, b) => a.id - b.id)
			.map((species) => ({
				id: species.id,
				name: species.name,
				human: humanize(species.name),
				sprite: frontSpriteUrl(species.id),
			}));

		const moves = (type.moves ?? [])
			.map((ref) => ({ name: ref.name, human: humanize(ref.name) }))
			.sort((a, b) => a.human.localeCompare(b.human));

		return {
			kind: 'ok',
			title: displayName,
			h1: displayName,
			relations,
			count: cards.length,
			cards,
			moveCount: moves.length,
			moves,
		};
	},

	document: (context) => {
		const props = context.props as TypeProps;
		return document({
			url: context.url,
			title: props.kind === 'ok' ? (props.title ?? null) : 'Not found',
		});
	},

	template: (context) => {
		const props = context.props as TypeProps;
		if (props.kind !== 'ok') return notFoundMain();

		return html`
			<main class="content">
				<h1>${props.h1}</h1>

				${section(
					'damage-relations',
					'Damage relations',
					html`<dl class="relations-list">
						${(props.relations ?? []).map(
							(relation) => html`<div class="relation">
								<dt>${relation.term}</dt>
								<dd>
									${relation.types.length > 0
										? relation.types.map((type) => typeBadge(type, true))
										: 'None'}
								</dd>
							</div>`,
						)}
					</dl>`,
				)}
				${section(
					'pokemon',
					'Pokémon',
					html`
						<p class="count">${props.count} Pokémon</p>
						${cardList(props.cards ?? [])}
					`,
				)}
				${section(
					'moves',
					'Moves',
					html`
						<p class="count">${props.moveCount} moves</p>
						<ul class="move-list">
							${(props.moves ?? []).map(
								(move) => html`<li>
									<a href="/moves/${move.name}">${move.human}</a>
								</li>`,
							)}
						</ul>
					`,
				)}
			</main>
		`;
	},
});
