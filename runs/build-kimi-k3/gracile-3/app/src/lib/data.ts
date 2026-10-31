/**
 * Page-data assembly: turns raw PokeAPI resources into view models.
 * Server-only; every function reads from the live API at request time
 * (responses are memoized in-memory by ./api.ts).
 */

import { api, idFromUrl } from './api.js';
import { collapseWhitespace, humanize } from './format.js';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const ALT_FORM_ID_THRESHOLD = 10000;

export interface TypeInfo {
	name: string;
	label: string;
}

export interface GenerationInfo {
	name: string;
	label: string;
}

export interface SpeciesEntry {
	id: number;
	name: string;
	types: string[];
	gen: string;
}

/** English name of a named API resource, falling back to the humanized name. */
export function labelOf(resource: any): string {
	return englishName(resource?.names) ?? humanize(resource?.name ?? '');
}

export function englishName(names: any[] | undefined): string | null {
	return names?.find((entry) => entry.language?.name === 'en')?.name ?? null;
}

/** Latest English flavor text with whitespace collapsed. */
export function latestEnglishFlavor(entries: any[] | undefined): string | null {
	const english = entries?.filter((entry) => entry.language?.name === 'en') ?? [];
	const last = english[english.length - 1];
	return last ? collapseWhitespace(String(last.flavor_text)) : null;
}

export function englishShortEffect(entries: any[] | undefined): string | null {
	return entries?.find((entry) => entry.language?.name === 'en')?.short_effect ?? null;
}

// ── Species list ───────────────────────────────────────────────────

export async function getSpeciesList(): Promise<{ id: number; name: string }[]> {
	const list = await api('pokemon-species/?limit=100000');
	return list.results
		.map((entry: any) => ({ id: idFromUrl(entry.url), name: entry.name as string }))
		.sort((a: any, b: any) => a.id - b.id);
}

// ── Types ──────────────────────────────────────────────────────────

let typesPromise: Promise<TypeInfo[]> | undefined;

/** The 18 types, in API order, with English labels. */
export function getTypes(): Promise<TypeInfo[]> {
	typesPromise ??= (async () => {
		const list = await api('type/?limit=100');
		const names = (list.results as any[])
			.map((entry) => entry.name as string)
			.filter((name) => !EXCLUDED_TYPES.has(name));
		const records = await Promise.all(names.map((name) => api(`type/${name}/`)));
		return records.map((record) => ({
			name: record.name as string,
			label: labelOf(record),
		}));
	})();
	return typesPromise;
}

export async function typeLabel(name: string): Promise<string> {
	const types = await getTypes();
	return types.find((type) => type.name === name)?.label ?? humanize(name);
}

// ── Generations ────────────────────────────────────────────────────

let generationsPromise: Promise<(GenerationInfo & { species: Set<string> })[]> | undefined;

function getGenerationRecords() {
	generationsPromise ??= (async () => {
		const list = await api('generation/?limit=100');
		const records = await Promise.all(
			(list.results as any[]).map((entry) => api(`generation/${entry.name}/`)),
		);
		return records.map((record) => ({
			name: record.name as string,
			label: labelOf(record),
			species: new Set<string>(
				(record.pokemon_species as any[]).map((entry) => entry.name as string),
			),
		}));
	})();
	return generationsPromise;
}

export async function getGenerations(): Promise<GenerationInfo[]> {
	return (await getGenerationRecords()).map(({ name, label }) => ({ name, label }));
}

// ── Home page ──────────────────────────────────────────────────────

export async function getHomeSpecies(): Promise<SpeciesEntry[]> {
	const [speciesList, types, generations] = await Promise.all([
		getSpeciesList(),
		getTypes(),
		getGenerationRecords(),
	]);

	// Default Pokémon id ↔ species id; type records give the slot per type.
	const typeMap = new Map<number, { slot: number; type: string }[]>();
	await Promise.all(
		types.map(async (type) => {
			const record = await api(`type/${type.name}/`);
			for (const entry of record.pokemon as any[]) {
				const id = idFromUrl(entry.pokemon.url);
				if (id >= ALT_FORM_ID_THRESHOLD) continue;
				let slots = typeMap.get(id);
				if (!slots) typeMap.set(id, (slots = []));
				slots.push({ slot: entry.slot, type: type.name });
			}
		}),
	);

	const generationOf = (name: string) =>
		generations.find((generation) => generation.species.has(name))?.name ?? '';

	return speciesList.map((species) => ({
		id: species.id,
		name: species.name,
		types: (typeMap.get(species.id) ?? [])
			.sort((a, b) => a.slot - b.slot)
			.map((entry) => entry.type),
		gen: generationOf(species.name),
	}));
}

// ── Cards (move / ability / type pages) ────────────────────────────

export interface CardEntry {
	id: number;
	name: string;
	hidden?: boolean;
}

/**
 * Maps a list of Pokémon references to card entries: alternate forms are
 * excluded and each Pokémon maps to its species (id < 10000 ⇒ default form,
 * whose id equals the species id).
 */
export async function cardsFromPokemonRefs(refs: any[]): Promise<CardEntry[]> {
	const ids = new Set<number>();
	for (const ref of refs) {
		const id = idFromUrl(ref.url ?? ref.pokemon?.url ?? ref);
		if (id < ALT_FORM_ID_THRESHOLD) ids.add(id);
	}
	const speciesList = await getSpeciesList();
	const nameOf = new Map(speciesList.map((species) => [species.id, species.name]));
	return [...ids]
		.sort((a, b) => a - b)
		.map((id) => ({ id, name: nameOf.get(id) }))
		.filter((card): card is CardEntry => Boolean(card.name));
}

// ── Pokémon page ───────────────────────────────────────────────────

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export interface MoveRow {
	level: number | null;
	moveName: string;
	moveLabel: string;
	typeName: string;
	typeLabel: string;
	category: string;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

export interface MoveTable {
	key: string;
	name: string;
	hasLevel: boolean;
	rows: MoveRow[];
}

export async function getPokemonPageData(name: string) {
	const species = await api(`pokemon-species/${name}/`);
	if (!species) return null;

	const defaultVariety =
		(species.varieties as any[]).find((variety) => variety.is_default) ??
		species.varieties[0];
	const pokemonId = idFromUrl(defaultVariety.pokemon.url);

	const [pokemon, types, chain] = await Promise.all([
		api(`pokemon/${pokemonId}/`),
		getTypes(),
		api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}/`),
	]);
	if (!pokemon) return null;

	const labelForType = (typeName: string) =>
		types.find((type) => type.name === typeName)?.label ?? humanize(typeName);

	// ── Moves ──
	const versionGroupNames = [
		...new Set(
			(pokemon.moves as any[]).flatMap((move) =>
				(move.version_group_details as any[]).map(
					(detail) => detail.version_group.name as string,
				),
			),
		),
	];
	const versionGroups = (
		await Promise.all(versionGroupNames.map((groupName) => api(`version-group/${groupName}/`)))
	)
		.filter(Boolean)
		.sort((a, b) => a.order - b.order);

	const groups = versionGroups.map((group) => ({
		name: group.name as string,
		label: humanize(group.name as string),
	}));

	async function moveTablesFor(selectedGame: string | undefined): Promise<{
		selected: string;
		tables: MoveTable[];
	}> {
		const selected =
			selectedGame && groups.some((group) => group.name === selectedGame)
				? selectedGame
				: (groups[groups.length - 1]?.name ?? '');

		const seen = new Set<string>();
		const byMethod = new Map<string, { moveName: string; level: number }[]>();
		for (const move of pokemon.moves as any[]) {
			for (const detail of move.version_group_details as any[]) {
				if (detail.version_group.name !== selected) continue;
				const method = detail.move_learn_method.name as string;
				const dedupeKey = `${method}|${move.move.name}|${detail.level_learned_at}`;
				if (seen.has(dedupeKey)) continue;
				seen.add(dedupeKey);
				let methodRows = byMethod.get(method);
				if (!methodRows) byMethod.set(method, (methodRows = []));
				methodRows.push({
					moveName: move.move.name,
					level: detail.level_learned_at,
				});
			}
		}

		const moveNames = new Set<string>();
		for (const methodRows of byMethod.values())
			for (const row of methodRows) moveNames.add(row.moveName);
		const moveRecords = new Map<string, any>();
		await Promise.all(
			[...moveNames].map(async (moveName) => {
				moveRecords.set(moveName, await api(`move/${moveName}/`));
			}),
		);

		const methodNames = [...byMethod.keys()].sort((a, b) => {
			const aFixed = METHOD_ORDER.indexOf(a);
			const bFixed = METHOD_ORDER.indexOf(b);
			if (aFixed !== -1 || bFixed !== -1) {
				if (aFixed === -1) return 1;
				if (bFixed === -1) return -1;
				return aFixed - bFixed;
			}
			return humanize(a).localeCompare(humanize(b));
		});

		const tables: MoveTable[] = methodNames.map((method) => {
			const hasLevel = method === 'level-up';
			const rows: MoveRow[] = (byMethod.get(method) ?? []).map((row) => {
				const record = moveRecords.get(row.moveName);
				return {
					level: hasLevel ? row.level : null,
					moveName: row.moveName,
					moveLabel: record ? labelOf(record) : humanize(row.moveName),
					typeName: record?.type?.name ?? '',
					typeLabel: record?.type?.name ? labelForType(record.type.name) : '',
					category: record?.damage_class?.name
						? humanize(record.damage_class.name)
						: '',
					power: record?.power ?? null,
					accuracy: record?.accuracy ?? null,
					pp: record?.pp ?? null,
				};
			});
			rows.sort((a, b) => {
				if (hasLevel && a.level !== b.level) return (a.level ?? 0) - (b.level ?? 0);
				return a.moveLabel.localeCompare(b.moveLabel);
			});
			return { key: method, name: humanize(method), hasLevel, rows };
		});

		return { selected, tables };
	}

	return {
		species,
		pokemon,
		labelForType,
		chain,
		groups,
		moveTablesFor,

		displayName: labelOf(species),
		genus:
			(species.genera as any[]).find((entry) => entry.language?.name === 'en')
				?.genus ?? '',
		flavorText: latestEnglishFlavor(species.flavor_text_entries),

		stats: (pokemon.stats as any[]).map((entry) => ({
			label: STAT_LABELS[entry.stat.name as string] ?? humanize(entry.stat.name),
			value: entry.base_stat as number,
		})),

		abilities: (pokemon.abilities as any[])
			.slice()
			.sort((a, b) => a.slot - b.slot)
			.map((entry) => ({
				name: entry.ability.name as string,
				hidden: Boolean(entry.is_hidden),
			})),
	};
}
