import { error } from '@sveltejs/kit';
import {
	displayValue,
	englishName,
	humanize,
	latestEnglishFlavorText,
	shortEffect
} from '#lib/format';
import { buildCards, getRecord } from '#lib/server/pokeapi';

export async function load({ params }) {
	const move = await getRecord('move', params.name);
	if (!move) error(404, 'Not found');

	const displayName = englishName(move.names, humanize(move.name));
	const effect =
		shortEffect(move.effect_entries) ??
		latestEnglishFlavorText(move.flavor_text_entries) ??
		'—';
	const cards = await buildCards(move.learned_by_pokemon);

	return {
		title: `${displayName} – Pokédex`,
		move: {
			name: move.name,
			displayName,
			type: { name: move.type?.name ?? '', display: move.type ? humanize(move.type.name) : '—' },
			category: move.damage_class ? humanize(move.damage_class.name) : '—',
			power: displayValue(move.power),
			accuracy: displayValue(move.accuracy),
			pp: displayValue(move.pp),
			effect
		},
		cards
	};
}
