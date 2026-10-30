import {
	fetchMany,
	getGenerations,
	getSprite,
	getSpeciesList,
	getTypes
} from '#lib/server/api.js';
import { humanize } from '#lib/format.js';

export async function load() {
	const [species, types, generations] = await Promise.all([
		getSpeciesList(),
		getTypes(),
		getGenerations()
	]);

	const typeBySpecies = new Map();
	for (const type of types) {
		for (const entry of type.pokemon) {
			if (!typeBySpecies.has(entry.id)) typeBySpecies.set(entry.id, []);
			typeBySpecies.get(entry.id).push({
				name: type.name,
				label: type.label,
				slot: entry.slot
			});
		}
	}

	const generationBySpecies = new Map();
	for (const generation of generations) {
		for (const id of generation.species) generationBySpecies.set(id, generation.name);
	}

	const sprites = await fetchMany(species, getSprite);

	return {
		species: species.map((entry, index) => ({
			id: entry.id,
			name: entry.name,
			label: humanize(entry.name),
			sprite: sprites[index],
			types: (typeBySpecies.get(entry.id) ?? [])
				.sort((a, b) => a.slot - b.slot)
				.map(({ name, label }) => ({ name, label })),
			generation: generationBySpecies.get(entry.id) ?? null
		})),
		types: types.map(({ name, label }) => ({ name, label })),
		generations: generations.map(({ name, label }) => ({ name, label }))
	};
}
