import { error } from '@sveltejs/kit';
import { englishEffect, englishName, humanize, speciesIdFromUrl } from '#lib/format.js';
import { fetchJson, getSpeciesMap, makeCards } from '#lib/server/api.js';

export async function load({ params }) {
	let ability;
	try {
		ability = await fetchJson(`/api/v2/ability/${encodeURIComponent(params.name)}/`);
	} catch (err) {
		if (err.status === 404) error(404, 'Not found');
		throw err;
	}

	const speciesById = await getSpeciesMap();
	const hiddenBySpecies = new Map();

	for (const entry of ability.pokemon ?? []) {
		const id = speciesIdFromUrl(entry.pokemon.url);
		if (!Number.isFinite(id) || id >= 10000) continue;
		hiddenBySpecies.set(id, (hiddenBySpecies.get(id) ?? false) || Boolean(entry.is_hidden));
	}

	const species = [...hiddenBySpecies.keys()]
		.map((id) => speciesById.get(id))
		.filter(Boolean);
	const cards = await makeCards(species);
	const pokemon = cards.map((card) => ({
		...card,
		note: hiddenBySpecies.get(card.id) ? 'Hidden ability' : null
	}));

	return {
		name: ability.name,
		label: englishName(ability, humanize(ability.name)),
		effect: englishEffect(ability.effect_entries) ?? '—',
		pokemon
	};
}
