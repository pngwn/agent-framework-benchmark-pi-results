import { error } from '@sveltejs/kit';
import {
	cardsFromPokemonRefs,
	englishName,
	getAbility,
	idFromUrl
} from '#lib/server/pokeapi.js';

export async function load({ params }) {
	const ability = await getAbility(params.name);
	if (!ability) error(404, 'Not found');

	const effectEntry = (ability.effect_entries ?? []).find(
		(entry) => entry.language?.name === 'en'
	);

	const extra = new Map();
	for (const entry of ability.pokemon ?? []) {
		const id = idFromUrl(entry.pokemon?.url);
		if (!Number.isInteger(id) || id >= 10000) continue;
		const current = extra.get(id) ?? { hidden: false };
		current.hidden = current.hidden || Boolean(entry.is_hidden);
		extra.set(id, current);
	}

	const cards = await cardsFromPokemonRefs(ability.pokemon, extra);

	return {
		heading: englishName(ability),
		effect: effectEntry?.short_effect ?? '—',
		cards
	};
}
