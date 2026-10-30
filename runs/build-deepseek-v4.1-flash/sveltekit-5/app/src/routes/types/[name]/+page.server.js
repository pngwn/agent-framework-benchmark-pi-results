import { error } from '@sveltejs/kit';
import {
	cardsFromPokemonRefs,
	englishName,
	getType,
	getTypeData,
	getTypeIndex,
	humanize
} from '#lib/server/pokeapi.js';

const RELATIONS = [
	['double_damage_to', 'Super effective against'],
	['half_damage_to', 'Not very effective against'],
	['no_damage_to', 'No effect against'],
	['double_damage_from', 'Weak to'],
	['half_damage_from', 'Resists'],
	['no_damage_from', 'Immune to']
];

export async function load({ params }) {
	const allTypes = await getTypeData();
	if (!allTypes.some((entry) => entry.name === params.name)) error(404, 'Not found');

	const type = await getType(params.name);
	if (!type) error(404, 'Not found');

	const typeIndex = await getTypeIndex();
	const relations = RELATIONS.map(([key, label]) => ({
		label,
		types: (type.damage_relations?.[key] ?? []).map((entry) => ({
			name: entry.name,
			englishName: typeIndex.get(entry.name)?.englishName ?? humanize(entry.name)
		}))
	}));

	const cards = await cardsFromPokemonRefs(type.pokemon);
	const moves = (type.moves ?? [])
		.map((move) => ({ name: move.name, label: humanize(move.name) }))
		.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));

	return {
		heading: englishName(type),
		relations,
		cards,
		moves
	};
}
