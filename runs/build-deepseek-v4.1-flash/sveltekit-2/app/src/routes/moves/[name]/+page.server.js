import { error } from '@sveltejs/kit';
import {
	englishEffect,
	englishName,
	humanize,
	latestEnglishFlavor,
	speciesIdFromUrl
} from '#lib/format.js';
import { fetchJson, getSpeciesMap, makeCards } from '#lib/server/api.js';

export async function load({ params }) {
	let move;
	try {
		move = await fetchJson(`/api/v2/move/${encodeURIComponent(params.name)}/`);
	} catch (err) {
		if (err.status === 404) error(404, 'Not found');
		throw err;
	}

	const speciesById = await getSpeciesMap();
	const learnedSpecies = (move.learned_by_pokemon ?? [])
		.map((entry) => speciesIdFromUrl(entry.url))
		.filter((id) => Number.isFinite(id) && id < 10000)
		.map((id) => speciesById.get(id))
		.filter(Boolean);

	const pokemon = await makeCards(learnedSpecies);

	return {
		name: move.name,
		label: englishName(move, humanize(move.name)),
		type: { name: move.type.name, label: humanize(move.type.name) },
		category: humanize(move.damage_class?.name),
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect:
			englishEffect(move.effect_entries) ??
			latestEnglishFlavor(move.flavor_text_entries) ??
			'—',
		pokemon
	};
}
