/**
 * Server-side data aggregation over the live API: the species index used by
 * the home page browser, the canonical 18 types, and the generations list.
 */

import { api, frontSpriteUrl, mapLimit } from './api.js';
import {
	englishName,
	humanize,
	idFromUrl,
	type LocalizedName,
	type SpeciesLike,
} from './util.js';

interface ListResponse {
	count: number;
	results: { name: string; url: string }[];
}

interface PokemonTypeSlot {
	slot: number;
	type: { name: string; url: string };
}

interface PokemonRecord {
	id: number;
	name: string;
	types: PokemonTypeSlot[];
	sprites: { front_default: string | null };
}

interface GenerationRecord {
	id: number;
	name: string;
	names: LocalizedName[];
	pokemon_species: { name: string; url: string }[];
}

interface TypeRecord {
	id: number;
	name: string;
	names: LocalizedName[];
}

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// ── Types ────────────────────────────────────────────────────────────

export interface TypeInfo {
	name: string;
	en: string;
}

let typesPromise: Promise<TypeInfo[]> | null = null;

/** The 18 types, in API order, with their English names. */
export function getTypes(): Promise<TypeInfo[]> {
	typesPromise ??= (async () => {
		const list = await api<ListResponse>('/type/?limit=100');
		const entries = (list?.results ?? []).filter(
			(entry) => !EXCLUDED_TYPES.has(entry.name),
		);
		return mapLimit(entries, 8, async (entry) => {
			const record = await api<TypeRecord>(`/type/${entry.name}`);
			return {
				name: entry.name,
				en: englishName(record?.names, entry.name),
			};
		});
	})();
	return typesPromise;
}

// ── Generations ──────────────────────────────────────────────────────

export interface GenerationInfo {
	name: string;
	en: string;
}

let generationsPromise: Promise<GenerationInfo[]> | null = null;

export function getGenerations(): Promise<GenerationInfo[]> {
	generationsPromise ??= (async () => {
		const list = await api<ListResponse>('/generation/?limit=100');
		return mapLimit(list?.results ?? [], 8, async (entry) => {
			const record = await api<GenerationRecord>(
				`/generation/${entry.name}`,
			);
			return {
				name: entry.name,
				en: englishName(record?.names, entry.name),
			};
		});
	})();
	return generationsPromise;
}

// ── Species index ────────────────────────────────────────────────────

export interface SpeciesIndexEntry extends SpeciesLike {}

let speciesIndexPromise: Promise<SpeciesIndexEntry[]> | null = null;

/**
 * One entry per species listed by the API: id, names, generation and the
 * types of its default Pokémon. Built lazily on first use, cached in memory.
 */
export function getSpeciesIndex(): Promise<SpeciesIndexEntry[]> {
	speciesIndexPromise ??= (async () => {
		const list = await api<ListResponse>('/pokemon-species/?limit=100000');
		const speciesRefs = list?.results ?? [];

		// Species name -> generation API name.
		const generationList = await api<ListResponse>('/generation/?limit=100');
		const generationRecords = await mapLimit(
			generationList?.results ?? [],
			8,
			(entry) => api<GenerationRecord>(`/generation/${entry.name}`),
		);
		const generationBySpecies = new Map<string, string>();
		for (const generation of generationRecords) {
			if (!generation) continue;
			for (const member of generation.pokemon_species ?? []) {
				generationBySpecies.set(member.name, generation.name);
			}
		}

		return mapLimit(speciesRefs, 48, async (ref) => {
			const id = idFromUrl(ref.url) ?? 0;
			const pokemon = await api<PokemonRecord>(`/pokemon/${id}`);
			const types = (pokemon?.types ?? [])
				.slice()
				.sort((a, b) => a.slot - b.slot)
				.map((slot) => slot.type.name);
			return {
				id,
				name: ref.name,
				human: humanize(ref.name),
				generation: generationBySpecies.get(ref.name) ?? '',
				types,
				sprite: pokemon?.sprites.front_default ?? frontSpriteUrl(id),
			};
		});
	})();
	return speciesIndexPromise;
}

// ── Species resolution ───────────────────────────────────────────────

export interface SpeciesRef {
	id: number;
	name: string;
}

/**
 * Resolve a Pokémon id (of a default Pokémon, id < 10000) to its species.
 * The default Pokémon has the same id as its species.
 */
export async function resolveSpecies(
	pokemonId: number,
): Promise<SpeciesRef | null> {
	const species = await api<{ id: number; name: string }>(
		`/pokemon-species/${pokemonId}`,
	);
	if (!species) return null;
	return { id: species.id, name: species.name };
}
