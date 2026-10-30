import { error } from '@sveltejs/kit';
import {
	cardsFromPokemonRefs,
	englishName,
	getMove,
	getTypeIndex,
	humanize
} from '#lib/server/pokeapi.js';

const isMissing = (value) => value === null || value === undefined;

export async function load({ params }) {
	const move = await getMove(params.name);
	if (!move) error(404, 'Not found');

	const typeIndex = await getTypeIndex();
	const typeName = move.type?.name ?? '';
	const type = {
		name: typeName,
		englishName: typeIndex.get(typeName)?.englishName ?? humanize(typeName)
	};

	const effectEntry = (move.effect_entries ?? []).find((entry) => entry.language?.name === 'en');
	const flavorEntry = (move.flavor_text_entries ?? [])
		.filter((entry) => entry.language?.name === 'en')
		.at(-1);
	const effect =
		effectEntry?.short_effect ??
		(flavorEntry ? flavorEntry.flavor_text.replace(/\s+/g, ' ').trim() : '—');

	const cards = await cardsFromPokemonRefs(move.learned_by_pokemon);

	return {
		heading: englishName(move),
		type,
		category: humanize(move.damage_class?.name ?? '') || '—',
		power: isMissing(move.power) ? null : move.power,
		accuracy: isMissing(move.accuracy) ? null : move.accuracy,
		pp: isMissing(move.pp) ? null : move.pp,
		effect,
		cards
	};
}
