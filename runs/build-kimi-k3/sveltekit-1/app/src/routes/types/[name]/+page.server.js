import { error } from '@sveltejs/kit';
import { api, getIndex } from '#lib/server/api.js';
import { englishName, humanize } from '#lib/format.js';

export async function load({ params }) {
	const index = await getIndex();
	const type = await api(`/type/${encodeURIComponent(params.name)}/`);
	if (!type) error(404, 'Not found');

	const dr = type.damage_relations;
	const relations = [
		['Super effective against', dr.double_damage_to],
		['Not very effective against', dr.half_damage_to],
		['No effect against', dr.no_damage_to],
		['Weak to', dr.double_damage_from],
		['Resists', dr.half_damage_from],
		['Immune to', dr.no_damage_from]
	].map(([term, refs]) => ({
		term,
		types: refs.map((r) => ({
			name: r.name,
			en: index.typeEn.get(r.name) ?? humanize(r.name)
		}))
	}));

	// Map Pokémon to their species; alternate forms are excluded.
	const seen = new Map();
	for (const entry of type.pokemon) {
		const species = index.resolvePokemon(entry.pokemon);
		if (species && !seen.has(species.id)) seen.set(species.id, species);
	}
	const pokemon = [...seen.values()].sort((a, b) => a.id - b.id);

	const moves = type.moves
		.map((m) => ({ name: m.name, human: humanize(m.name) }))
		.sort((a, b) => a.human.localeCompare(b.human));

	return {
		name: englishName(type.names) ?? humanize(type.name),
		relations,
		pokemon,
		moves
	};
}
