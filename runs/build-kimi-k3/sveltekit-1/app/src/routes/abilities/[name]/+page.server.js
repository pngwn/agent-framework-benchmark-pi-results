import { error } from '@sveltejs/kit';
import { api, getIndex } from '#lib/server/api.js';
import { englishName, humanize } from '#lib/format.js';

export async function load({ params }) {
	const index = await getIndex();
	const ability = await api(`/ability/${encodeURIComponent(params.name)}/`);
	if (!ability) error(404, 'Not found');

	// Map Pokémon to their species; alternate forms are excluded.
	const seen = new Map();
	for (const entry of ability.pokemon) {
		const species = index.resolvePokemon(entry.pokemon);
		if (species && !seen.has(species.id)) {
			seen.set(species.id, { ...species, hidden: entry.is_hidden });
		}
	}
	const pokemon = [...seen.values()].sort((a, b) => a.id - b.id);

	return {
		name: englishName(ability.names) ?? humanize(ability.name),
		effect: ability.effect_entries.find((e) => e.language?.name === 'en')?.short_effect ?? '—',
		pokemon
	};
}
