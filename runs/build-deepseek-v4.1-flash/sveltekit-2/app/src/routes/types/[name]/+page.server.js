import { error } from '@sveltejs/kit';
import { humanize } from '#lib/format.js';
import { getSpeciesMap, getTypeRecord, getTypes, makeCards } from '#lib/server/api.js';

const RELATIONS = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from']
];

export async function load({ params }) {
	const [type, types, speciesById] = await Promise.all([
		getTypeRecord(params.name),
		getTypes(),
		getSpeciesMap()
	]);

	if (!type) error(404, 'Not found');

	const labelByName = new Map(types.map((entry) => [entry.name, entry.label]));
	const relations = RELATIONS.map(([label, key]) => ({
		label,
		types: (type.record.damage_relations?.[key] ?? []).map((entry) => ({
			name: entry.name,
			label: labelByName.get(entry.name) ?? humanize(entry.name)
		}))
	}));

	const species = type.pokemon
		.map((entry) => speciesById.get(entry.id))
		.filter(Boolean);
	const pokemon = await makeCards(species);

	const moves = (type.record.moves ?? [])
		.map((entry) => ({ name: entry.name, label: humanize(entry.name) }))
		.sort((a, b) => a.label.localeCompare(b.label));

	return {
		name: type.name,
		label: type.label,
		relations,
		pokemon,
		moves
	};
}
