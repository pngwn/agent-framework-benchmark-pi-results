import { humanize } from '#lib/format';
import {
	getAllGenerations,
	getAllSpecies,
	getAllTypes,
	getApiBase,
	idFromUrl
} from '#lib/server/pokeapi';

const PER_PAGE = 48;

export async function load({ url }) {
	const [species, types, generations] = await Promise.all([
		getAllSpecies(),
		getAllTypes(),
		getAllGenerations()
	]);

	const speciesIds = new Set(species.map((entry) => entry.id));
	const typesByPokemon = new Map();

	for (const type of types) {
		for (const entry of type.record?.pokemon ?? []) {
			const pokemonId = idFromUrl(entry.pokemon?.url);
			if (!pokemonId || !speciesIds.has(pokemonId)) continue;

			const list = typesByPokemon.get(pokemonId) ?? [];
			list.push({
				slot: entry.slot ?? 0,
				name: type.name,
				englishName: type.englishName
			});
			typesByPokemon.set(pokemonId, list);
		}
	}

	for (const list of typesByPokemon.values()) {
		list.sort((a, b) => a.slot - b.slot);
	}

	const generationBySpecies = new Map();
	for (const generation of generations) {
		for (const entry of generation.record?.pokemon_species ?? []) {
			const id = idFromUrl(entry.url);
			if (id && speciesIds.has(id)) generationBySpecies.set(id, generation.name);
		}
	}

	const q = (url.searchParams.get('q') ?? '').trim();
	const requestedType = url.searchParams.get('type') ?? '';
	const requestedGeneration = url.searchParams.get('generation') ?? '';
	const type = types.some((entry) => entry.name === requestedType) ? requestedType : '';
	const generation = generations.some((entry) => entry.name === requestedGeneration)
		? requestedGeneration
		: '';

	let filtered = species;
	if (q) {
		const needle = q.toLowerCase();
		filtered = filtered.filter((entry) => humanize(entry.name).toLowerCase().includes(needle));
	}
	if (type) {
		filtered = filtered.filter((entry) =>
			typesByPokemon.get(entry.id)?.some((entryType) => entryType.name === type)
		);
	}
	if (generation) {
		filtered = filtered.filter((entry) => generationBySpecies.get(entry.id) === generation);
	}

	const count = filtered.length;
	const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Math.min(totalPages, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1));

	const cards = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((entry) => ({
		id: entry.id,
		speciesName: entry.name,
		sprite: `${getApiBase()}/media/sprites/pokemon/${entry.id}.png`,
		types: (typesByPokemon.get(entry.id) ?? []).map((entryType) => ({
			name: entryType.name,
			englishName: entryType.englishName
		}))
	}));

	return {
		title: 'Pokédex',
		cards,
		count,
		page,
		totalPages,
		filters: { q, type, generation },
		types: types.map((entry) => ({ name: entry.name, englishName: entry.englishName })),
		generations: generations.map((entry) => ({
			name: entry.name,
			englishName: entry.englishName
		}))
	};
}
