import { error } from '@sveltejs/kit';
import { englishName, humanize, shortEffect } from '#lib/format';
import { buildCards, getRecord } from '#lib/server/pokeapi';

export async function load({ params }) {
	const ability = await getRecord('ability', params.name);
	if (!ability) error(404, 'Not found');

	const displayName = englishName(ability.names, humanize(ability.name));
	const cards = await buildCards(ability.pokemon);

	return {
		title: `${displayName} – Pokédex`,
		ability: {
			name: ability.name,
			displayName,
			effect: shortEffect(ability.effect_entries) ?? '—'
		},
		cards
	};
}
