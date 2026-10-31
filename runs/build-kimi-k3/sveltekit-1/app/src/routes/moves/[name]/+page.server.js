import { error } from '@sveltejs/kit';
import { api, getIndex } from '#lib/server/api.js';
import { collapseWhitespace, englishName, humanize } from '#lib/format.js';

export async function load({ params }) {
	const index = await getIndex();
	const move = await api(`/move/${encodeURIComponent(params.name)}/`);
	if (!move) error(404, 'Not found');

	// English short_effect, falling back to the latest English flavor text, then —.
	let effect = move.effect_entries.find((e) => e.language?.name === 'en')?.short_effect ?? null;
	if (!effect) {
		const english = move.flavor_text_entries.filter((e) => e.language?.name === 'en');
		effect = english.length ? collapseWhitespace(english.at(-1).flavor_text) : '—';
	}

	// Map Pokémon to their species; alternate forms are excluded.
	const seen = new Map();
	for (const ref of move.learned_by_pokemon) {
		const species = index.resolvePokemon(ref);
		if (species && !seen.has(species.id)) seen.set(species.id, species);
	}
	const pokemon = [...seen.values()].sort((a, b) => a.id - b.id);

	return {
		name: englishName(move.names) ?? humanize(move.name),
		type: {
			name: move.type.name,
			en: index.typeEn.get(move.type.name) ?? humanize(move.type.name)
		},
		category: humanize(move.damage_class.name),
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect,
		pokemon
	};
}
