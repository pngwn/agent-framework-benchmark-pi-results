import { error } from '@sveltejs/kit';
import { api } from '../../../lib/server/api.js';
import { speciesFromPokemonRefs } from '../../../lib/server/data.js';
import { collapse, englishName, humanize, latestFlavor } from '../../../lib/utils.js';

export async function load({ params }) {
	const move = await api(`/move/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!move) error(404, `No such move: ${params.name}`);

	const shortEffect =
		collapse(move.effect_entries?.find((e) => e.language.name === 'en')?.short_effect) ??
		latestFlavor(move.flavor_text_entries) ??
		'—';

	const learnedBy = await speciesFromPokemonRefs(move.learned_by_pokemon ?? []);

	return {
		name: englishName(move),
		type: move.type ? { name: move.type.name, label: humanize(move.type.name) } : null,
		category: move.damage_class ? humanize(move.damage_class.name) : '—',
		power: move.power ?? null,
		accuracy: move.accuracy ?? null,
		pp: move.pp ?? null,
		shortEffect,
		learnedBy
	};
}
