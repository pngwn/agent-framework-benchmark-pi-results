import {
	getGenerations,
	getSpeciesIndex,
	getTypeIndex,
	spriteUrl
} from '#lib/server/api.js';
import { humanize } from '#lib/format.js';

const PAGE_SIZE = 48;

export async function load({ url }) {
	const query = url.searchParams;
	const q = query.get('q') ?? '';
	const typeName = query.get('type') ?? '';
	const generationName = query.get('generation') ?? '';
	const requestedPage = Number.parseInt(query.get('page') ?? '1', 10);

	const [speciesIndex, typeIndex, generations] = await Promise.all([
		getSpeciesIndex(),
		getTypeIndex(),
		getGenerations()
	]);

	const selectedType = typeName ? typeIndex.byName.get(typeName) : null;
	const selectedGeneration = generationName
		? generations.find((generation) => generation.name === generationName)
		: null;

	const generationById = new Map();
	for (const generation of generations) {
		for (const id of generation.speciesIds) generationById.set(id, generation);
	}

	const typePokemon = selectedType ? new Set(selectedType.pokemonIds) : null;
	const generationSpecies = selectedGeneration
		? new Set(selectedGeneration.speciesIds)
		: null;
	const search = q.trim().toLowerCase();

	const all = speciesIndex.list.map((species) => {
		const typeSlots = typeIndex.pokemonTypes.get(species.id) ?? [];
		const generation = generationById.get(species.id) ?? null;
		return {
			id: species.id,
			name: species.name,
			displayName: humanize(species.name),
			sprite: spriteUrl(species.id),
			types: typeSlots.map((slot) => ({
				name: slot.name,
				label: slot.label
			})),
			generationName: generation?.name ?? null
		};
	});

	const matches = all.filter((species) => {
		if (typePokemon && !typePokemon.has(species.id)) return false;
		if (generationSpecies && !generationSpecies.has(species.id)) return false;
		if (search && !species.displayName.toLowerCase().includes(search)) return false;
		return true;
	});

	const total = matches.length;
	const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
	let page = Number.isFinite(requestedPage) ? requestedPage : 1;
	if (page < 1) page = 1;
	if (totalPages > 0 && page > totalPages) page = totalPages;
	if (totalPages === 0) page = 1;

	const start = (page - 1) * PAGE_SIZE;
	const cards = matches.slice(start, start + PAGE_SIZE);

	return {
		q,
		type: selectedType?.name ?? '',
		generation: selectedGeneration?.name ?? '',
		page,
		totalPages,
		total,
		cards,
		types: typeIndex.types.map((type) => ({ name: type.name, label: type.label })),
		generations: generations.map((generation) => ({
			name: generation.name,
			label: generation.label
		}))
	};
}
