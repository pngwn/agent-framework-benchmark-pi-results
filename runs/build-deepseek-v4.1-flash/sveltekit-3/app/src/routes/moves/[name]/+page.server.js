import { error } from '@sveltejs/kit';
import {
	cardsForPokemonIds,
	getResource,
	getSpeciesIndex,
	getTypeIndex,
	idFromUrl
} from '#lib/server/api.js';
import {
	collapseWhitespace,
	damageCategory,
	displayValue,
	englishName,
	humanize,
	latestFlavorText
} from '#lib/format.js';

export async function load({ params }) {
	const [move, typeIndex, speciesIndex] = await Promise.all([
		getResource('move', params.name),
		getTypeIndex(),
		getSpeciesIndex()
	]);
	if (!move) throw error(404, 'Not found');

	const type = typeIndex.byName.get(move.type?.name);
	const englishEffect = move.effect_entries?.find(
		(entry) => entry.language?.name === 'en'
	)?.short_effect;
	const effect = englishEffect
		? collapseWhitespace(englishEffect)
		: latestFlavorText(move.flavor_text_entries) ?? '—';

	const pokemonIds = (move.learned_by_pokemon ?? [])
		.map((entry) => idFromUrl(entry.url))
		.filter(Boolean);
	const pokemon = cardsForPokemonIds(pokemonIds, speciesIndex);

	return {
		name: move.name,
		label: englishName(move.names, move.name),
		type: {
			name: type?.name ?? move.type?.name,
			label: type?.label ?? humanize(move.type?.name)
		},
		category: damageCategory(move.damage_class?.name),
		power: displayValue(move.power),
		accuracy: displayValue(move.accuracy),
		pp: displayValue(move.pp),
		effect,
		pokemon
	};
}
