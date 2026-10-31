import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { api, frontSpriteUrl, mapLimit } from '../../lib/api.js';
import { resolveSpecies } from '../../lib/data.js';
import {
	EM_DASH,
	englishName,
	englishShortEffect,
	humanize,
	idFromUrl,
	FIRST_FORM_ID,
	latestEnglishFlavorText,
	valueOrDash,
	type EffectEntry,
	type FlavorTextEntry,
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

interface MoveRecord {
	id: number;
	name: string;
	names: LocalizedName[];
	type: NamedReference;
	damage_class: NamedReference | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect_entries: EffectEntry[];
	flavor_text_entries: FlavorTextEntry[];
	learned_by_pokemon: NamedReference[];
}

interface MoveProps {
	kind: 'ok' | 'notfound' | 'build';
	title?: string;
	h1?: string;
	type?: { name: string; en: string };
	category?: string;
	power?: string;
	accuracy?: string;
	pp?: string;
	effect?: string;
	count?: number;
	cards?: CardData[];
}

export default defineRoute({
	handler: async (context): Promise<MoveProps> => {
		if (context.url.hostname === 'gracile-static') return { kind: 'build' };

		const name = (context.params.name ?? '').toLowerCase();
		const move = await api<MoveRecord>(`/move/${name}`);
		if (!move) {
			context.responseInit.status = 404;
			return { kind: 'notfound' };
		}

		const displayName = englishName(move.names, move.name);

		const typeRecord = await api<{ names: LocalizedName[] }>(
			`/type/${move.type.name}`,
		);

		const pokemonRefs = (move.learned_by_pokemon ?? [])
			.map((ref) => idFromUrl(ref.url))
			.filter((id): id is number => id !== null && id < FIRST_FORM_ID);

		const cards = (
			await mapLimit(pokemonRefs, 48, (id) => resolveSpecies(id))
		)
			.filter((s): s is NonNullable<typeof s> => s !== null)
			.sort((a, b) => a.id - b.id)
			.map((species) => ({
				id: species.id,
				name: species.name,
				human: humanize(species.name),
				sprite: frontSpriteUrl(species.id),
			}));

		return {
			kind: 'ok',
			title: displayName,
			h1: displayName,
			type: {
				name: move.type.name,
				en: englishName(typeRecord?.names, move.type.name),
			},
			category: move.damage_class
				? humanize(move.damage_class.name)
				: EM_DASH,
			power: valueOrDash(move.power),
			accuracy: valueOrDash(move.accuracy),
			pp: valueOrDash(move.pp),
			effect:
				englishShortEffect(move.effect_entries) ??
				latestEnglishFlavorText(move.flavor_text_entries) ??
				EM_DASH,
			count: cards.length,
			cards,
		};
	},

	document: (context) => {
		const props = context.props as MoveProps;
		return document({
			url: context.url,
			title: props.kind === 'ok' ? (props.title ?? null) : 'Not found',
		});
	},

	template: (context) => {
		const props = context.props as MoveProps;
		if (props.kind !== 'ok') return notFoundMain();

		return html`
			<main class="content">
				<h1>${props.h1}</h1>

				<div class="surface detail-summary">
					<dl class="fact-list">
						<div>
							<dt>Type</dt>
							<dd>${typeBadge(props.type!, true)}</dd>
						</div>
						<div>
							<dt>Category</dt>
							<dd>${props.category}</dd>
						</div>
						<div>
							<dt>Power</dt>
							<dd>${props.power}</dd>
						</div>
						<div>
							<dt>Accuracy</dt>
							<dd>${props.accuracy}</dd>
						</div>
						<div>
							<dt>PP</dt>
							<dd>${props.pp}</dd>
						</div>
					</dl>
				</div>

				${section('effect', 'Effect', html`<p>${props.effect}</p>`)}
				${section(
					'learned-by',
					'Learned by',
					html`
						<p class="count">${props.count} Pokémon</p>
						${cardList(props.cards ?? [])}
					`,
				)}
			</main>
		`;
	},
});
