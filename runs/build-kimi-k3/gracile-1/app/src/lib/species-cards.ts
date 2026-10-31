import { api, idFromUrl } from './api.js';
import { isAlternateForm } from './format.js';
import type { CardData } from './components.js';

type PokemonRef = { name: string; url: string };

/** Entries may wrap the Pokémon reference (`type.pokemon`, `ability.pokemon`)
 * or be bare references (`move.learned_by_pokemon`). */
type Entry = { pokemon?: PokemonRef } & Partial<PokemonRef>;

function refOf(entry: Entry): PokemonRef {
	const ref = entry.pokemon ?? (entry as PokemonRef);
	if (!ref?.url) throw new Error('Missing Pokémon reference');
	return ref;
}

/**
 * Turn a list of Pokémon references (as found in `learned_by_pokemon`,
 * `type.pokemon`, `ability.pokemon`, …) into one card per species.
 *
 * Alternate forms (id > 10000) are dropped; the remaining Pokémon are mapped
 * to their species (e.g. `deoxys-normal` -> `deoxys`) and ordered by dex
 * number.
 */
export async function speciesCards<T extends Entry>(
	entries: T[],
): Promise<Array<CardData & { entry: T }>> {
	const bySpecies = new Map<number, CardData & { entry: T }>();
	const kept = entries.filter(
		(entry) => !isAlternateForm(idFromUrl(refOf(entry).url)),
	);
	const records = await Promise.all(
		kept.map((entry) => api(refOf(entry).url).catch(() => null)),
	);
	for (const [index, record] of records.entries()) {
		if (!record) continue;
		const speciesId = idFromUrl(record.species.url);
		if (bySpecies.has(speciesId)) continue;
		bySpecies.set(speciesId, {
			speciesName: record.species.name,
			speciesId,
			sprite: record.sprites?.front_default ?? null,
			entry: kept[index]!,
		});
	}
	return [...bySpecies.values()].sort((a, b) => a.speciesId - b.speciesId);
}
