import { error } from '@sveltejs/kit';
import {
	getResource,
	getSpeciesIndex,
	idFromUrl,
	spriteUrl
} from '#lib/server/api.js';
import {
	collapseWhitespace,
	englishName,
	humanize
} from '#lib/format.js';

export async function load({ params }) {
	const [ability, speciesIndex] = await Promise.all([
		getResource('ability', params.name),
		getSpeciesIndex()
	]);
	if (!ability) throw error(404, 'Not found');

	const pokemonById = new Map();
	for (const entry of ability.pokemon ?? []) {
		const id = idFromUrl(entry.pokemon?.url);
		if (!id || id > 10000) continue;
		const existing = pokemonById.get(id);
		pokemonById.set(id, {
			id,
			hidden: Boolean(existing?.hidden || entry.is_hidden)
		});
	}

	const pokemon = [...pokemonById.values()]
		.sort((a, b) => a.id - b.id)
		.map((entry) => {
			const species = speciesIndex.byId.get(entry.id);
			const name = species?.name ?? String(entry.id);
			return {
				id: entry.id,
				name,
				displayName: humanize(name),
				sprite: spriteUrl(entry.id),
				hidden: entry.hidden
			};
		});

	const englishEffect = ability.effect_entries?.find(
		(entry) => entry.language?.name === 'en'
	)?.short_effect;

	return {
		name: ability.name,
		label: englishName(ability.names, ability.name),
		effect: englishEffect ? collapseWhitespace(englishEffect) : '—',
		pokemon
	};
}
