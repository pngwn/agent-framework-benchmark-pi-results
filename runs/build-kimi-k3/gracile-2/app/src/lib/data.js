import { api, apiList, idFromUrl, mapPool } from './api.js';
import { englishName } from './util.js';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types, in API order, as full type resources. */
export async function getTypes() {
	const list = await apiList('type');
	const names = list.map((e) => e.name).filter((n) => !EXCLUDED_TYPES.has(n));
	return mapPool(names, 6, (name) => api(`type/${name}`));
}

/** Map of type API name -> English name. */
export async function getTypeNames() {
	const types = await getTypes();
	return new Map(types.map((t) => [t.name, englishName(t)]));
}

/** Map of Pokémon id -> its types in slot order: [{slot, type}]. */
export async function getPokemonTypesMap() {
	const types = await getTypes();
	const map = new Map();
	for (const type of types) {
		for (const entry of type.pokemon ?? []) {
			const id = idFromUrl(entry.pokemon.url);
			if (!map.has(id)) map.set(id, []);
			map.get(id).push({ slot: entry.slot, type: type.name });
		}
	}
	for (const entries of map.values())
		entries.sort((a, b) => a.slot - b.slot || a.type.localeCompare(b.type));
	return map;
}

/** The 9 generations as full resources, in API order. */
export async function getGenerations() {
	const list = await apiList('generation');
	return mapPool(list, 9, (e) => api(`generation/${e.name}`));
}

/** Every species: [{id, name}], sorted by dex number. */
export async function getSpeciesList() {
	const list = await apiList('pokemon-species');
	return list
		.map((e) => ({ id: idFromUrl(e.url), name: e.name }))
		.sort((a, b) => a.id - b.id);
}

const MAX_MAIN_DEX_ID = 10000;

/**
 * Resolve a list of Pokémon references ({name, url}) to unique species,
 * excluding alternate forms. Keeps the `extra` payload of the first
 * occurrence of each species. Returns entries sorted by dex number:
 * [{speciesId, speciesName, extra}]
 */
export async function pokemonRefsToSpecies(refs, extraOf = () => null) {
	const kept = refs.filter((r) => idFromUrl(r.url) < MAX_MAIN_DEX_ID);
	const resolved = await mapPool(kept, 24, async (ref, index) => {
		const pokemon = await api(`pokemon/${idFromUrl(ref.url)}`);
		if (!pokemon?.species) return null;
		return {
			speciesId: idFromUrl(pokemon.species.url),
			speciesName: pokemon.species.name,
			extra: extraOf(ref, index),
		};
	});
	const bySpecies = new Map();
	for (const entry of resolved) {
		if (!entry) continue;
		if (!bySpecies.has(entry.speciesId)) bySpecies.set(entry.speciesId, entry);
	}
	return [...bySpecies.values()].sort((a, b) => a.speciesId - b.speciesId);
}
