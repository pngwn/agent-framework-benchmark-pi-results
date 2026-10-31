import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { api, frontSpriteUrl, mapLimit } from '../../lib/api.js';
import { resolveSpecies } from '../../lib/data.js';
import {
	EM_DASH,
	FIRST_FORM_ID,
	englishName,
	englishShortEffect,
	humanize,
	idFromUrl,
	type EffectEntry,
	type LocalizedName,
	type NamedReference,
} from '../../lib/util.js';
import {
	cardList,
	notFoundMain,
	section,
	type CardData,
} from '../../lib/views.js';

interface AbilityRecord {
	id: number;
	name: string;
	names: LocalizedName[];
	effect_entries: EffectEntry[];
	pokemon: { is_hidden: boolean; slot: number; pokemon: NamedReference }[];
}

interface AbilityProps {
	kind: 'ok' | 'notfound' | 'build';
	title?: string;
	h1?: string;
	effect?: string;
	count?: number;
	cards?: CardData[];
}

export default defineRoute({
	handler: async (context): Promise<AbilityProps> => {
		if (context.url.hostname === 'gracile-static') return { kind: 'build' };

		const name = (context.params.name ?? '').toLowerCase();
		const ability = await api<AbilityRecord>(`/ability/${name}`);
		if (!ability) {
			context.responseInit.status = 404;
			return { kind: 'notfound' };
		}

		const displayName = englishName(ability.names, ability.name);

		const entries = (ability.pokemon ?? [])
			.map((entry) => ({
				id: idFromUrl(entry.pokemon.url),
				hidden: entry.is_hidden,
			}))
			.filter(
				(entry): entry is { id: number; hidden: boolean } =>
					entry.id !== null && entry.id < FIRST_FORM_ID,
			);

		const cards = (
			await mapLimit(entries, 48, async (entry) => {
				const species = await resolveSpecies(entry.id);
				return species ? { species, hidden: entry.hidden } : null;
			})
		)
			.filter((c): c is NonNullable<typeof c> => c !== null)
			.sort((a, b) => a.species.id - b.species.id)
			.map(({ species, hidden }) => ({
				id: species.id,
				name: species.name,
				human: humanize(species.name),
				sprite: frontSpriteUrl(species.id),
				note: hidden ? 'Hidden ability' : undefined,
			}));

		return {
			kind: 'ok',
			title: displayName,
			h1: displayName,
			effect: englishShortEffect(ability.effect_entries) ?? EM_DASH,
			count: cards.length,
			cards,
		};
	},

	document: (context) => {
		const props = context.props as AbilityProps;
		return document({
			url: context.url,
			title: props.kind === 'ok' ? (props.title ?? null) : 'Not found',
		});
	},

	template: (context) => {
		const props = context.props as AbilityProps;
		if (props.kind !== 'ok') return notFoundMain();

		return html`
			<main class="content">
				<h1>${props.h1}</h1>

				${section('effect', 'Effect', html`<p>${props.effect}</p>`)}
				${section(
					'pokemon',
					'Pokémon',
					html`
						<p class="count">${props.count} Pokémon</p>
						${cardList(props.cards ?? [])}
					`,
				)}
			</main>
		`;
	},
});
