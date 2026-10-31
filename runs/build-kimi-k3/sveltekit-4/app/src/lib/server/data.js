// Shared server-side data assembly built on the API client.

import { api, apiList, apiBase } from './api.js';
import { englishName, humanize, idFromUrl } from '../utils.js';

/** Every species the API lists, ordered by dex number: [{ id, name }] */
export async function getSpeciesList() {
	const results = await apiList('pokemon-species');
	return results
		.map((r) => ({ id: idFromUrl(r.url), name: r.name }))
		.sort((a, b) => a.id - b.id);
}

/** The 18 types in API order: [{ name, label }] (English labels) */
export async function getTypes() {
	const results = await apiList('type');
	const kept = results.filter((r) => !['stellar', 'unknown', 'shadow'].includes(r.name));
	const records = await Promise.all(kept.map((r) => api(`/type/${r.name}`)));
	return records.filter(Boolean).map((t) => ({ name: t.name, label: englishName(t) }));
}

/** All generations in API order: [{ name, label }] (English labels) */
export async function getGenerations() {
	const results = await apiList('generation');
	const records = await Promise.all(results.map((r) => api(`/generation/${r.name}`)));
	return records.filter(Boolean).map((g) => ({ name: g.name, label: englishName(g) }));
}

export function spriteFor(pokemonId, pokemonRecord) {
	return pokemonRecord?.sprites?.front_default ?? `${apiBase}/media/sprites/pokemon/${pokemonId}.png`;
}

/**
 * Resolve a list of Pokémon references (`{ name, url }`, as found in
 * `learned_by_pokemon`, `type.pokemon`, `ability.pokemon`, …) to the species
 * they belong to. Alternate forms (Pokémon ids above 10000) are dropped and
 * the result is deduplicated and ordered by dex number.
 *
 * `augment` receives the raw entry (e.g. an `ability.pokemon` element) and the
 * partial result for the species, and may attach extra data (hidden flags).
 */
export async function speciesFromPokemonRefs(refs, augment) {
	const bySpecies = new Map();
	await Promise.all(
		refs.map(async (ref, index) => {
			const pokemonId = idFromUrl(ref.url);
			if (!(pokemonId > 0) || pokemonId >= 10000) return;
			const pokemon = await api(`/pokemon/${pokemonId}`);
			if (!pokemon) return;
			const speciesId = idFromUrl(pokemon.species.url);
			let entry = bySpecies.get(speciesId);
			if (!entry) {
				entry = {
					id: speciesId,
					name: pokemon.species.name,
					label: humanize(pokemon.species.name),
					sprite: spriteFor(speciesId, pokemon)
				};
				bySpecies.set(speciesId, entry);
			}
			augment?.(ref, index, entry);
		})
	);
	return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}
