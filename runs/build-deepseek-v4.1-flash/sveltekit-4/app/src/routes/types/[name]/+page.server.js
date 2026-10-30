import { error } from '@sveltejs/kit';
import { englishName, humanize } from '#lib/format';
import { buildCards, getRecord } from '#lib/server/pokeapi';

const RELATIONS = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from']
];

export async function load({ params }) {
	const type = await getRecord('type', params.name);
	if (!type) error(404, 'Not found');

	const displayName = englishName(type.names, humanize(type.name));
	const cards = await buildCards(type.pokemon);
	const moves = (type.moves ?? [])
		.map((move) => ({ name: move.name, display: humanize(move.name) }))
		.sort((a, b) => a.display.localeCompare(b.display));

	const relations = RELATIONS.map(([label, key]) => ({
		label,
		types: (type.damage_relations?.[key] ?? []).map((related) => ({
			name: related.name,
			display: humanize(related.name)
		}))
	}));

	return {
		title: `${displayName} – Pokédex`,
		type: {
			name: type.name,
			displayName,
			relations
		},
		cards,
		moves
	};
}
