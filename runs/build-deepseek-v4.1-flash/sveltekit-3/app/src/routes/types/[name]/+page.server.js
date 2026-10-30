import { error } from '@sveltejs/kit';
import {
	cardsForPokemonIds,
	getResource,
	getSpeciesIndex,
	getTypeIndex
} from '#lib/server/api.js';
import { humanize } from '#lib/format.js';

const RELATIONS = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from']
];

export async function load({ params }) {
	const typeIndex = await getTypeIndex();
	const knownType = typeIndex.byName.get(params.name);
	if (!knownType) {
		throw error(404, 'Not found');
	}

	const [type, speciesIndex] = await Promise.all([
		getResource('type', params.name),
		getSpeciesIndex()
	]);
	if (!type) throw error(404, 'Not found');

	const relationGroups = RELATIONS.map(([term, key]) => ({
		term,
		types: (type.damage_relations?.[key] ?? []).map((entry) => ({
			name: entry.name,
			label: typeIndex.byName.get(entry.name)?.label ?? humanize(entry.name)
		}))
	}));

	const pokemonIds = (type.pokemon ?? [])
		.map((entry) => {
			const match = entry.pokemon?.url?.match(/\/(\d+)\/?$/);
			return match ? Number(match[1]) : null;
		})
		.filter(Boolean);
	const pokemon = cardsForPokemonIds(pokemonIds, speciesIndex);

	const moves = [...new Map(
		(type.moves ?? []).map((move) => [
			move.name,
			{ name: move.name, label: humanize(move.name) }
		])
	).values()].sort((a, b) => a.label.localeCompare(b.label));

	const label = typeIndex.byName.get(params.name)?.label ?? humanize(type.name);

	return {
		name: type.name,
		label,
		relations: relationGroups,
		pokemon,
		moves
	};
}
