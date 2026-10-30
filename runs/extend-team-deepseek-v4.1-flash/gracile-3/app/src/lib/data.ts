import { api, apiRequired, idFromUrl } from './api.js';
import { englishName, humanize } from './format.js';

// ── API shapes (only the fields the app uses) ───────────────────────────

export type Ref = { name: string; url: string };
type Named = { name: string; language: Ref };
type List = { count: number; results: Ref[] };

export type ApiType = {
	id: number;
	name: string;
	names: Named[];
	damage_relations: Record<
		| 'double_damage_to'
		| 'half_damage_to'
		| 'no_damage_to'
		| 'double_damage_from'
		| 'half_damage_from'
		| 'no_damage_from',
		Ref[]
	>;
	pokemon: { slot: number; pokemon: Ref }[];
	moves: Ref[];
};

type ApiGeneration = {
	id: number;
	name: string;
	names: Named[];
	pokemon_species: Ref[];
};

export type ApiSpecies = {
	id: number;
	name: string;
	names: Named[];
	genera: { genus: string; language: Ref }[];
	flavor_text_entries: { flavor_text: string; language: Ref }[];
	evolution_chain: { url: string } | null;
	varieties: { is_default: boolean; pokemon: Ref }[];
};

export type ApiPokemon = {
	id: number;
	name: string;
	height: number;
	weight: number;
	abilities: { is_hidden: boolean; slot: number; ability: Ref }[];
	moves: {
		move: Ref;
		version_group_details: {
			level_learned_at: number;
			version_group: Ref;
			move_learn_method: Ref;
		}[];
	}[];
	sprites: {
		front_default: string | null;
		other?: Record<string, { front_default?: string | null } | undefined>;
	};
	stats: { base_stat: number; stat: Ref }[];
	types: { slot: number; type: Ref }[];
};

export type ChainLink = { species: Ref; evolves_to: ChainLink[] };
type ApiEvolutionChain = { id: number; chain: ChainLink };

type ApiVersionGroup = { id: number; name: string; order: number };

export type ApiMove = {
	id: number;
	name: string;
	names: Named[];
	accuracy: number | null;
	power: number | null;
	pp: number | null;
	effect_chance: number | null;
	damage_class: Ref | null;
	type: Ref;
	effect_entries: { short_effect: string; language: Ref }[];
	flavor_text_entries: { flavor_text: string; language: Ref }[];
	learned_by_pokemon: Ref[];
};

export type ApiAbility = {
	id: number;
	name: string;
	names: Named[];
	effect_entries: { short_effect: string; language: Ref }[];
	flavor_text_entries: { flavor_text: string; language: Ref }[];
	pokemon: { is_hidden: boolean; slot: number; pokemon: Ref }[];
};

// ── Shared lookups ──────────────────────────────────────────────────────

/** Pokémon IDs above this are alternate forms, which the app leaves out. */
const MAX_DEFAULT_ID = 10_000;
const HIDDEN_TYPES = new Set(['stellar', 'unknown', 'shadow']);

const ALL = '?limit=100000';

export type TypeInfo = { name: string; label: string; record: ApiType };

export type Species = { id: number; name: string };

/** Every species, ordered by dex number. */
export async function getSpeciesList(): Promise<Species[]> {
	const list = await apiRequired<List>(`pokemon-species/${ALL}`);
	return list.results
		.map((r) => ({ id: idFromUrl(r.url), name: r.name }))
		.filter((s) => Number.isFinite(s.id))
		.sort((a, b) => a.id - b.id);
}

/** Every type the API knows, in API order, with its full record. */
export async function getAllTypes(): Promise<TypeInfo[]> {
	const list = await apiRequired<List>(`type/${ALL}`);
	const records = await Promise.all(
		list.results.map((r) => apiRequired<ApiType>(`type/${r.name}`)),
	);
	return records.map((record) => ({
		name: record.name,
		label: englishName(record),
		record,
	}));
}

/** The 18 types, in API order. */
export async function getTypes(): Promise<TypeInfo[]> {
	return (await getAllTypes()).filter((t) => !HIDDEN_TYPES.has(t.name));
}

export async function getTypeLabels(): Promise<Map<string, string>> {
	return new Map((await getAllTypes()).map((t) => [t.name, t.label]));
}

export type GenerationInfo = {
	name: string;
	label: string;
	speciesIds: Set<number>;
};

export async function getGenerations(): Promise<GenerationInfo[]> {
	const list = await apiRequired<List>(`generation/${ALL}`);
	const records = await Promise.all(
		list.results.map((r) => apiRequired<ApiGeneration>(`generation/${r.name}`)),
	);
	return records
		.sort((a, b) => a.id - b.id)
		.map((g) => ({
			name: g.name,
			label: englishName(g),
			speciesIds: new Set(g.pokemon_species.map((s) => idFromUrl(s.url))),
		}));
}

// ── Pokémon cards ───────────────────────────────────────────────────────

export type TypeBadge = { name: string; label: string };

export type Card = {
	id: number;
	name: string;
	label: string;
	types?: TypeBadge[];
	hidden?: boolean;
};

/**
 * Turns Pokémon references (as found in type, move and ability data) into
 * species cards, leaving out alternate forms, ordered by dex number.
 */
export async function cardsForPokemon<T>(
	items: T[],
	ref: (item: T) => Ref,
	extra?: (item: T) => Partial<Card>,
): Promise<Card[]> {
	const species = await getSpeciesList();
	const byId = new Map(species.map((s) => [s.id, s]));
	const cards = new Map<number, Card>();
	for (const item of items) {
		const id = idFromUrl(ref(item).url);
		if (!(id <= MAX_DEFAULT_ID) || cards.has(id)) continue;
		const s = byId.get(id);
		if (!s) continue;
		cards.set(id, { id, name: s.name, label: humanize(s.name), ...extra?.(item) });
	}
	return [...cards.values()].sort((a, b) => a.id - b.id);
}

// ── Home page index ─────────────────────────────────────────────────────

export type IndexEntry = Card & { types: TypeBadge[]; generation?: string | undefined };

/**
 * Turns the species names stored in a team cookie into cards, in team order.
 * Alternate forms and names the API doesn't know are left out.
 */
export async function getTeamCards(names: readonly string[]): Promise<Card[]> {
	const unique = [...new Set(names)];
	const labels = await getTypeLabels();
	const cards = await Promise.all(
		unique.map(async (name) => {
			const species = await getSpecies(name);
			if (!species || species.name !== name) return null;
			const pokemon = await getDefaultPokemon(species);
			return {
				id: species.id,
				name: species.name,
				label: humanize(species.name),
				types: [...pokemon.types]
					.sort((a, b) => a.slot - b.slot)
					.map((t) => ({
						name: t.type.name,
						label: labels.get(t.type.name) ?? humanize(t.type.name),
					})),
			} satisfies Card;
		}),
	);
	return cards.filter((card): card is Card => card !== null);
}

export type CoverageRow = {
	type: TypeBadge;
	weak: number;
	resistant: number;
};

/**
 * Counts how many team members are weak to or resistant to each attacking type.
 * A member's damage multiplier is the product of the attacking type's multiplier
 * against each of its types, so two cancelling types count as neutral.
 */
export async function getTypeCoverage(cards: Card[]): Promise<CoverageRow[]> {
	const types = await getTypes();
	const multiplier = (attacking: ApiType, defending: string) => {
		const relations = attacking.damage_relations;
		if (relations.no_damage_to.some((t) => t.name === defending)) return 0;
		if (relations.half_damage_to.some((t) => t.name === defending)) return 0.5;
		if (relations.double_damage_to.some((t) => t.name === defending)) return 2;
		return 1;
	};

	return types.map((type) => {
		let weak = 0;
		let resistant = 0;
		for (const card of cards) {
			const damage = (card.types ?? []).reduce(
				(total, defending) => total * multiplier(type.record, defending.name),
				1,
			);
			if (damage > 1) weak++;
			else if (damage < 1) resistant++;
		}
		return { type: { name: type.name, label: type.label }, weak, resistant };
	});
}

export async function getPokemonIndex(): Promise<IndexEntry[]> {
	const [species, types, generations] = await Promise.all([
		getSpeciesList(),
		getAllTypes(),
		getGenerations(),
	]);

	const typesById = new Map<number, { slot: number; badge: TypeBadge }[]>();
	for (const type of types) {
		for (const { slot, pokemon } of type.record.pokemon) {
			const id = idFromUrl(pokemon.url);
			if (!(id <= MAX_DEFAULT_ID)) continue;
			const list = typesById.get(id) ?? [];
			list.push({ slot, badge: { name: type.name, label: type.label } });
			typesById.set(id, list);
		}
	}

	return species.map((s) => ({
		id: s.id,
		name: s.name,
		label: humanize(s.name),
		types: (typesById.get(s.id) ?? [])
			.sort((a, b) => a.slot - b.slot)
			.map((t) => t.badge),
		generation: generations.find((g) => g.speciesIds.has(s.id))?.name,
	}));
}

// ── Pokémon page ────────────────────────────────────────────────────────

export type MoveRow = {
	level: number | null;
	name: string;
	label: string;
	type: TypeBadge;
	category: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
};

export type MoveTable = { method: string; label: string; rows: MoveRow[] };

export type Game = { name: string; label: string; order: number };

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export async function getSpecies(name: string) {
	if (!/^[a-z0-9-]+$/i.test(name)) return null;
	return api<ApiSpecies>(`pokemon-species/${name.toLowerCase()}`);
}

export async function getDefaultPokemon(species: ApiSpecies) {
	const variety = species.varieties.find((v) => v.is_default)?.pokemon;
	const id = variety ? idFromUrl(variety.url) : species.id;
	return apiRequired<ApiPokemon>(`pokemon/${id}`);
}

export async function getEvolutionChain(species: ApiSpecies) {
	if (!species.evolution_chain) return null;
	const id = idFromUrl(species.evolution_chain.url);
	return (await api<ApiEvolutionChain>(`evolution-chain/${id}`))?.chain ?? null;
}

/** Version groups in which the Pokémon learns moves, ordered by `order`. */
export async function getGames(pokemon: ApiPokemon): Promise<Game[]> {
	const names = new Set(
		pokemon.moves.flatMap((m) =>
			m.version_group_details.map((d) => d.version_group.name),
		),
	);
	const groups = await Promise.all(
		[...names].map((n) => apiRequired<ApiVersionGroup>(`version-group/${n}`)),
	);
	return groups
		.map((g) => ({ name: g.name, label: humanize(g.name), order: g.order }))
		.sort((a, b) => a.order - b.order);
}

export async function getMoveTables(
	pokemon: ApiPokemon,
	game: string,
): Promise<MoveTable[]> {
	type Learned = { move: string; method: string; level: number };
	const learned: Learned[] = [];
	for (const { move, version_group_details } of pokemon.moves) {
		const seen = new Set<string>();
		for (const d of version_group_details) {
			if (d.version_group.name !== game) continue;
			const method = d.move_learn_method.name;
			const level = method === 'level-up' ? d.level_learned_at : 0;
			const key = `${method}:${level}`;
			if (seen.has(key)) continue;
			seen.add(key);
			learned.push({ move: move.name, method, level });
		}
	}

	const [moves, typeLabels] = await Promise.all([
		Promise.all(
			[...new Set(learned.map((l) => l.move))].map((n) =>
				apiRequired<ApiMove>(`move/${n}`),
			),
		),
		getTypeLabels(),
	]);
	const moveByName = new Map(moves.map((m) => [m.name, m]));

	const tables = new Map<string, MoveTable>();
	for (const l of learned) {
		const move = moveByName.get(l.move)!;
		const table = tables.get(l.method) ?? {
			method: l.method,
			label: humanize(l.method),
			rows: [],
		};
		table.rows.push({
			level: l.method === 'level-up' ? l.level : null,
			name: move.name,
			label: englishName(move),
			type: {
				name: move.type.name,
				label: typeLabels.get(move.type.name) ?? humanize(move.type.name),
			},
			category: move.damage_class ? humanize(move.damage_class.name) : null,
			power: move.power,
			accuracy: move.accuracy,
			pp: move.pp,
		});
		tables.set(l.method, table);
	}

	const rank = (method: string) => {
		const i = METHOD_ORDER.indexOf(method);
		return i === -1 ? METHOD_ORDER.length : i;
	};
	const byLabel = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

	return [...tables.values()]
		.sort(
			(a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label),
		)
		.map((t) => ({
			...t,
			rows: t.rows.sort(
				t.method === 'level-up'
					? (a, b) => a.level! - b.level! || byLabel(a, b)
					: byLabel,
			),
		}));
}

// ── Other resources ─────────────────────────────────────────────────────

const validName = (name: string) => /^[a-z0-9-]+$/i.test(name);

export const getMove = (name: string) =>
	validName(name) ? api<ApiMove>(`move/${name.toLowerCase()}`) : null;

export const getAbility = (name: string) =>
	validName(name) ? api<ApiAbility>(`ability/${name.toLowerCase()}`) : null;

export const getType = (name: string) =>
	validName(name) ? api<ApiType>(`type/${name.toLowerCase()}`) : null;
