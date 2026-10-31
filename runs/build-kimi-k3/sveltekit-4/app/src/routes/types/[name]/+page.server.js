import { error } from '@sveltejs/kit';
import { api } from '../../../lib/server/api.js';
import { speciesFromPokemonRefs } from '../../../lib/server/data.js';
import { englishName, humanize } from '../../../lib/utils.js';

const RELATIONS = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from']
];

export async function load({ params }) {
	const type = await api(`/type/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!type) error(404, `No such type: ${params.name}`);

	const relations = RELATIONS.map(([term, key]) => ({
		term,
		types: (type.damage_relations?.[key] ?? []).map((t) => ({
			name: t.name,
			label: humanize(t.name)
		}))
	}));

	const pokemon = await speciesFromPokemonRefs((type.pokemon ?? []).map((entry) => entry.pokemon));

	const moves = (type.moves ?? [])
		.map((m) => ({ name: m.name, label: humanize(m.name) }))
		.sort((a, b) => a.label.localeCompare(b.label));

	return {
		name: englishName(type),
		relations,
		pokemon,
		moves
	};
}
