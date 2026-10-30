import { apiBase, get, getOrThrow, idFromUrl, mapLimit } from './api.ts';
import { humanize } from '../format.ts';
import { TEAM_SIZE } from '../team.ts';
import type { Card, EvolutionNode, MoveRow, MoveTable, TypeRef } from '../types.ts';

// --- API shapes (only the fields the app uses) -------------------------------------------

type NamedRef = { name: string; url: string };
type Name = { name: string; language: NamedRef };
type FlavorText = { flavor_text: string; language: NamedRef };
type List = { count: number; results: NamedRef[] };

type ApiType = {
	id: number;
	name: string;
	names: Name[];
	pokemon: { slot: number; pokemon: NamedRef }[];
	moves: NamedRef[];
	damage_relations: Record<string, NamedRef[]>;
};
type ApiGeneration = { id: number; name: string; names: Name[]; pokemon_species: NamedRef[] };
type ApiSpecies = {
	id: number;
	name: string;
	names: Name[];
	genera: { genus: string; language: NamedRef }[];
	flavor_text_entries: FlavorText[];
	evolution_chain: { url: string } | null;
	varieties: { is_default: boolean; pokemon: NamedRef }[];
};
type ApiPokemon = {
	id: number;
	name: string;
	height: number;
	weight: number;
	types: { slot: number; type: NamedRef }[];
	abilities: { slot: number; is_hidden: boolean; ability: NamedRef }[];
	stats: { base_stat: number; stat: NamedRef }[];
	sprites: { front_default: string | null; other?: Record<string, { front_default: string | null }> };
	moves: {
		move: NamedRef;
		version_group_details: { level_learned_at: number; move_learn_method: NamedRef; version_group: NamedRef }[];
	}[];
};
type ApiMove = {
	id: number;
	name: string;
	names: Name[];
	accuracy: number | null;
	power: number | null;
	pp: number | null;
	effect_chance: number | null;
	type: NamedRef;
	damage_class: NamedRef | null;
	effect_entries: { short_effect: string; language: NamedRef }[];
	flavor_text_entries: FlavorText[];
	learned_by_pokemon: NamedRef[];
};
type ApiAbility = {
	id: number;
	name: string;
	names: Name[];
	effect_entries: { short_effect: string; language: NamedRef }[];
	flavor_text_entries: FlavorText[];
	pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
};
type ApiVersionGroup = { name: string; order: number };
type ChainLink = { species: NamedRef; evolves_to: ChainLink[] };
type ApiEvolutionChain = { chain: ChainLink };

export type { Card, EvolutionNode, MoveRow, MoveTable, TypeRef };

// --- Helpers ------------------------------------------------------------------------------

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const MAX_SPECIES_ID = 10000;

const isEnglish = (entry: { language: NamedRef }) => entry.language.name === 'en';

export function englishName(resource: { name: string; names?: Name[] }): string {
	return resource.names?.find(isEnglish)?.name ?? humanize(resource.name);
}

export function latestFlavorText(entries: FlavorText[] | undefined): string | null {
	const english = (entries ?? []).filter(isEnglish);
	const last = english.at(-1);
	return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export const spriteUrl = (id: number) => `${apiBase}/media/sprites/pokemon/${id}.png`;

const list = (resource: string) => getOrThrow<List>(`${resource}/?limit=100000&offset=0`);

// --- Shared indexes -----------------------------------------------------------------------

/** Every species, ordered by dex number. */
export async function getSpecies(): Promise<{ id: number; name: string }[]> {
	const { results } = await list('pokemon-species');
	return results
		.map((r) => ({ id: idFromUrl(r.url), name: r.name }))
		.filter((s) => s.id > 0 && s.id < MAX_SPECIES_ID)
		.sort((a, b) => a.id - b.id);
}

/** The 18 types in API order, with their full records. */
export async function getTypes(): Promise<ApiType[]> {
	const { results } = await list('type');
	const refs = results.filter((r) => !EXCLUDED_TYPES.has(r.name));
	const types = await mapLimit(refs, 18, (r) => getOrThrow<ApiType>(r.url));
	return types;
}

export async function getTypeLabels(): Promise<Map<string, string>> {
	const types = await getTypes();
	return new Map(types.map((t) => [t.name, englishName(t)]));
}

const typeRef = (labels: Map<string, string>, name: string): TypeRef => ({
	name,
	label: labels.get(name) ?? humanize(name)
});

export async function getGenerations(): Promise<ApiGeneration[]> {
	const { results } = await list('generation');
	const generations = await mapLimit(results, 10, (r) => getOrThrow<ApiGeneration>(r.url));
	return generations.sort((a, b) => a.id - b.id);
}

/**
 * Turns references to Pokémon (as found in type, move and ability records) into cards for
 * their species, leaving out alternate forms. `extra` adds fields per Pokémon reference.
 */
async function cardsFor<T extends NamedRef>(refs: T[], extra?: (ref: T) => Partial<Card>): Promise<Card[]> {
	const species = await getSpecies();
	const names = new Map(species.map((s) => [s.id, s.name]));
	const cards = new Map<number, Card>();
	for (const ref of refs) {
		const id = idFromUrl(ref.url);
		if (!(id < MAX_SPECIES_ID) || cards.has(id)) continue;
		const name = names.get(id);
		if (!name) continue;
		cards.set(id, { id, name, sprite: spriteUrl(id), ...extra?.(ref) });
	}
	return [...cards.values()].sort((a, b) => a.id - b.id);
}

// --- Home ---------------------------------------------------------------------------------

export const PAGE_SIZE = 48;

export async function getPokemonList(filters: { q: string; type: string; generation: string; page: number }) {
	const [species, types, generations] = await Promise.all([getSpecies(), getTypes(), getGenerations()]);

	// Default Pokémon ID (= species ID) → types in slot order.
	const typesById = new Map<number, { slot: number; type: TypeRef }[]>();
	for (const type of types) {
		const ref = { name: type.name, label: englishName(type) };
		for (const { slot, pokemon } of type.pokemon) {
			const id = idFromUrl(pokemon.url);
			if (!typesById.has(id)) typesById.set(id, []);
			typesById.get(id)!.push({ slot, type: ref });
		}
	}

	const generation = generations.find((g) => g.name === filters.generation);
	const generationIds = generation && new Set(generation.pokemon_species.map((s) => idFromUrl(s.url)));
	const query = filters.q.trim().toLowerCase();

	const matches = species
		.map((s) => {
			const slots = (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot);
			return { ...s, label: humanize(s.name), types: slots.map((t) => t.type) };
		})
		.filter(
			(s) =>
				(!query || s.label.toLowerCase().includes(query)) &&
				(!filters.type || s.types.some((t) => t.name === filters.type)) &&
				(!generationIds || generationIds.has(s.id))
		);

	const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const page = Math.min(Math.max(1, filters.page), totalPages);
	const cards: Card[] = matches
		.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
		.map((s) => ({ id: s.id, name: s.name, sprite: spriteUrl(s.id), types: s.types }));

	return {
		count: matches.length,
		page,
		totalPages,
		cards,
		typeOptions: types.map((t) => ({ name: t.name, label: englishName(t) })),
		generationOptions: generations.map((g) => ({ name: g.name, label: englishName(g) }))
	};
}

// --- Pokémon page -------------------------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function evolutionTree(link: ChainLink): EvolutionNode {
	return { name: link.species.name, children: link.evolves_to.map(evolutionTree) };
}

export async function getPokemonPage(name: string, game: string | null) {
	const species = await get<ApiSpecies>(`pokemon-species/${encodeURIComponent(name.toLowerCase())}/`);
	if (!species) return null;

	const variety = species.varieties.find((v) => v.is_default)?.pokemon;
	const [pokemon, chain, labels] = await Promise.all([
		getOrThrow<ApiPokemon>(variety ? variety.url : `pokemon/${species.id}/`),
		species.evolution_chain ? get<ApiEvolutionChain>(species.evolution_chain.url) : null,
		getTypeLabels()
	]);

	// Version groups in which the Pokémon learns moves, ordered by the group's `order`.
	const groupNames = [
		...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))
	];
	const groups = (await mapLimit(groupNames, 16, (n) => getOrThrow<ApiVersionGroup>(`version-group/${n}/`))).sort(
		(a, b) => a.order - b.order
	);
	const selected = groups.find((g) => g.name === game) ?? groups.at(-1);

	const learned = new Map<string, { move: NamedRef; level: number }[]>();
	if (selected) {
		const seen = new Set<string>();
		for (const { move, version_group_details } of pokemon.moves) {
			for (const d of version_group_details) {
				if (d.version_group.name !== selected.name) continue;
				const method = d.move_learn_method.name;
				const key = `${method}|${move.name}|${d.level_learned_at}`;
				if (seen.has(key)) continue;
				seen.add(key);
				if (!learned.has(method)) learned.set(method, []);
				learned.get(method)!.push({ move, level: d.level_learned_at });
			}
		}
	}

	const moveRefs = [...new Map([...learned.values()].flat().map((l) => [l.move.name, l.move])).values()];
	const moves = new Map(
		(await mapLimit(moveRefs, 24, (m) => getOrThrow<ApiMove>(m.url))).map((m) => [m.name, m])
	);

	const methodRank = (m: string) => {
		const i = METHOD_ORDER.indexOf(m);
		return i === -1 ? METHOD_ORDER.length : i;
	};
	const moveTables: MoveTable[] = [...learned.entries()]
		.sort(([a], [b]) => methodRank(a) - methodRank(b) || humanize(a).localeCompare(humanize(b)))
		.map(([method, entries]) => {
			const rows = entries.map(({ move: ref, level }): MoveRow => {
				const move = moves.get(ref.name)!;
				return {
					level: method === 'level-up' ? level : null,
					name: move.name,
					label: englishName(move),
					type: typeRef(labels, move.type.name),
					category: move.damage_class ? humanize(move.damage_class.name) : null,
					power: move.power,
					accuracy: move.accuracy,
					pp: move.pp
				};
			});
			rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label));
			return { method, label: humanize(method), rows };
		});

	const stats = pokemon.stats.map((s) => ({
		name: s.stat.name,
		label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
		value: s.base_stat
	}));

	return {
		id: species.id,
		name: species.name,
		label: englishName(species),
		genus: species.genera.find(isEnglish)?.genus ?? null,
		types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(labels, t.type.name)),
		artwork: pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default ?? null,
		height: (pokemon.height / 10).toFixed(1),
		weight: (pokemon.weight / 10).toFixed(1),
		flavorText: latestFlavorText(species.flavor_text_entries),
		stats,
		abilities: [...pokemon.abilities]
			.sort((a, b) => a.slot - b.slot)
			.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
		evolution: chain ? evolutionTree(chain.chain) : { name: species.name, children: [] },
		games: groups.map((g) => ({ name: g.name, label: humanize(g.name) })),
		game: selected?.name ?? null,
		moveTables
	};
}

// --- Move page ----------------------------------------------------------------------------

export async function getMovePage(name: string) {
	const move = await get<ApiMove>(`move/${encodeURIComponent(name.toLowerCase())}/`);
	if (!move) return null;
	const [labels, learnedBy] = await Promise.all([getTypeLabels(), cardsFor(move.learned_by_pokemon)]);

	const short = move.effect_entries.find(isEnglish)?.short_effect;
	const effect = short
		? short.replaceAll('$effect_chance', String(move.effect_chance ?? '')).replace(/\s+/g, ' ').trim()
		: latestFlavorText(move.flavor_text_entries);

	return {
		name: move.name,
		label: englishName(move),
		type: typeRef(labels, move.type.name),
		category: move.damage_class ? humanize(move.damage_class.name) : null,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect,
		learnedBy
	};
}

// --- Ability page -------------------------------------------------------------------------

export async function getAbilityPage(name: string) {
	const ability = await get<ApiAbility>(`ability/${encodeURIComponent(name.toLowerCase())}/`);
	if (!ability) return null;
	const refs = ability.pokemon.map((p) => ({ ...p.pokemon, hidden: p.is_hidden }));
	const pokemon = await cardsFor(refs, (r) => ({ hidden: r.hidden }));
	const short = ability.effect_entries.find(isEnglish)?.short_effect;
	return {
		name: ability.name,
		label: englishName(ability),
		effect: short ? short.replace(/\s+/g, ' ').trim() : latestFlavorText(ability.flavor_text_entries),
		pokemon
	};
}

// --- Team page ----------------------------------------------------------------------------

export async function getTeamPage(names: string[]) {
	if (!names.length) return { members: [], attackTypes: [] };

	const [labels, types, records] = await Promise.all([
		getTypeLabels(),
		getTypes(),
		mapLimit(names, TEAM_SIZE, async (name) => {
			const species = await get<ApiSpecies>(`pokemon-species/${encodeURIComponent(name)}/`);
			if (!species) return null;

			const variety = species.varieties.find((v) => v.is_default)?.pokemon;
			const pokemon = await getOrThrow<ApiPokemon>(variety ? variety.url : `pokemon/${species.id}/`);
			const memberTypes = [...pokemon.types]
				.sort((a, b) => a.slot - b.slot)
				.map((t) => t.type.name);

			return { species, memberTypes };
		})
	]);

	const members = records
		.filter((record) => record !== null)
		.map(({ species, memberTypes }) => ({
			name: species.name,
			card: {
				id: species.id,
				name: species.name,
				sprite: spriteUrl(species.id),
				types: memberTypes.map((name) => typeRef(labels, name))
			} satisfies Card
		}));

	return {
		members,
		attackTypes: types.map((type) => ({
			name: type.name,
			label: englishName(type),
			double: type.damage_relations.double_damage_to.map((t) => t.name),
			half: type.damage_relations.half_damage_to.map((t) => t.name),
			none: type.damage_relations.no_damage_to.map((t) => t.name)
		}))
	};
}

// --- Type pages ---------------------------------------------------------------------------

const RELATIONS = [
	['double_damage_to', 'Super effective against'],
	['half_damage_to', 'Not very effective against'],
	['no_damage_to', 'No effect against'],
	['double_damage_from', 'Weak to'],
	['half_damage_from', 'Resists'],
	['no_damage_from', 'Immune to']
] as const;

export async function getTypeList(): Promise<TypeRef[]> {
	const types = await getTypes();
	return types.map((t) => ({ name: t.name, label: englishName(t) }));
}

export async function getTypePage(name: string) {
	const key = name.toLowerCase();
	if (EXCLUDED_TYPES.has(key)) return null;
	const type = await get<ApiType>(`type/${encodeURIComponent(key)}/`);
	if (!type) return null;
	const [labels, pokemon] = await Promise.all([getTypeLabels(), cardsFor(type.pokemon.map((p) => p.pokemon))]);

	return {
		name: type.name,
		label: englishName(type),
		relations: RELATIONS.map(([key, label]) => ({
			label,
			types: (type.damage_relations[key] ?? []).map((t) => typeRef(labels, t.name))
		})),
		pokemon,
		moves: type.moves
			.map((m) => ({ name: m.name, label: humanize(m.name) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	};
}
