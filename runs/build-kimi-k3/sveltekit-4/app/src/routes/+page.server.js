import { error } from '@sveltejs/kit';
import { api } from '../lib/server/api.js';
import { getGenerations, getSpeciesList, getTypes, spriteFor } from '../lib/server/data.js';
import { humanize, idFromUrl } from '../lib/utils.js';

const PAGE_SIZE = 48;

export async function load({ url }) {
	const q = (url.searchParams.get('q') ?? '').trim();
	const type = url.searchParams.get('type') ?? '';
	const generation = url.searchParams.get('generation') ?? '';
	const pageParam = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

	const [species, types, generations] = await Promise.all([
		getSpeciesList(),
		getTypes(),
		getGenerations()
	]);

	let filtered = species;

	if (q) {
		const needle = q.toLowerCase();
		filtered = filtered.filter((s) => humanize(s.name).toLowerCase().includes(needle));
	}

	if (type) {
		const record = await api(`/type/${encodeURIComponent(type)}`);
		const ids = new Set(
			(record?.pokemon ?? [])
				.map((entry) => idFromUrl(entry.pokemon.url))
				.filter((id) => id > 0 && id < 10000)
		);
		filtered = filtered.filter((s) => ids.has(s.id));
	}

	if (generation) {
		const record = await api(`/generation/${encodeURIComponent(generation)}`);
		const ids = new Set((record?.pokemon_species ?? []).map((entry) => idFromUrl(entry.url)));
		filtered = filtered.filter((s) => ids.has(s.id));
	}

	const count = filtered.length;
	const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
	const page = Math.min(pageParam, totalPages);
	const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const typeLabels = new Map(types.map((t) => [t.name, t.label]));
	const cards = await Promise.all(
		slice.map(async (s) => {
			const pokemon = await api(`/pokemon/${s.id}`);
			if (!pokemon) error(500, `Missing Pokémon data for species ${s.id}`);
			return {
				id: s.id,
				name: s.name,
				label: humanize(s.name),
				sprite: spriteFor(s.id, pokemon),
				types: [...pokemon.types]
					.sort((a, b) => a.slot - b.slot)
					.map((entry) => ({
						name: entry.type.name,
						label: typeLabels.get(entry.type.name) ?? humanize(entry.type.name)
					}))
			};
		})
	);

	return { q, type, generation, page, totalPages, count, cards, types, generations };
}
