import { error } from '@sveltejs/kit';
import { api } from '../../../lib/server/api.js';
import { speciesFromPokemonRefs } from '../../../lib/server/data.js';
import { collapse, englishName } from '../../../lib/utils.js';

export async function load({ params }) {
	const ability = await api(`/ability/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!ability) error(404, `No such ability: ${params.name}`);

	const effect =
		collapse(ability.effect_entries?.find((e) => e.language.name === 'en')?.short_effect) ?? '—';

	const entries = ability.pokemon ?? [];
	const pokemon = await speciesFromPokemonRefs(
		entries.map((entry) => entry.pokemon),
		// A species has the ability hidden if any of its entries marks it hidden.
		(ref, index, card) => {
			card.hidden = (card.hidden ?? false) || entries[index].is_hidden;
		}
	);

	return {
		name: englishName(ability),
		effect,
		pokemon
	};
}
