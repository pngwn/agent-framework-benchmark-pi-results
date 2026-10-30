import { humanize } from '#lib/format.js';

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

/** @type {Map<string, Promise<any>>} */
const cache = new Map();

function memo(key, fn) {
	let promise = cache.get(key);
	if (!promise) {
		promise = Promise.resolve().then(fn);
		cache.set(key, promise);
		promise.catch(() => cache.delete(key));
	}
	return promise;
}

async function getJson(path) {
	const res = await fetch(`${API_BASE}${path}`, { headers: { accept: 'application/json' } });
	if (res.status === 404) return null;
	if (!res.ok) {
		throw new Error(`PokeAPI request failed: ${res.status} ${res.statusText} for ${path}`);
	}
	return res.json();
}

export function getResource(resource, key) {
	return memo(`resource:${resource}/${key}`, () =>
		getJson(`/api/v2/${resource}/${encodeURIComponent(String(key))}`)
	);
}

export function getList(resource) {
	return memo(`list:${resource}`, async () => {
		const data = await getJson(`/api/v2/${resource}/?limit=100000&offset=0`);
		return data?.results ?? [];
	});
}

export function idFromUrl(url) {
	const match = String(url ?? '').match(/\/(\d+)\/?$/);
	return match ? Number(match[1]) : null;
}

export { humanize };

export function englishName(resource, fallback) {
	const entry = resource?.names?.find((entry) => entry.language?.name === 'en');
	return entry?.name ?? humanize(resource?.name ?? fallback ?? '');
}

export function latestEnglishFlavorText(entries) {
	const english = (entries ?? []).filter((entry) => entry.language?.name === 'en');
	const latest = english.at(-1);
	return latest ? latest.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function spriteUrl(id) {
	return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export function getSpeciesList() {
	return memo('species-list', async () => {
		const results = await getList('pokemon-species');
		return results
			.map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
			.filter((entry) => Number.isInteger(entry.id))
			.sort((a, b) => a.id - b.id);
	});
}

export function getSpeciesIndex() {
	return memo('species-index', async () => {
		const species = await getSpeciesList();
		return new Map(species.map((entry) => [entry.id, entry]));
	});
}

export function getGenerations() {
	return memo('generations', async () => {
		const list = await getList('generation');
		const details = await Promise.all(list.map((entry) => getResource('generation', entry.name)));
		return details
			.filter(Boolean)
			.map((generation) => ({
				id: generation.id,
				name: generation.name,
				englishName: englishName(generation),
				speciesIds: (generation.pokemon_species ?? [])
					.map((entry) => idFromUrl(entry.url))
					.filter((id) => Number.isInteger(id))
			}))
			.sort((a, b) => a.id - b.id);
	});
}

export function getTypeData() {
	return memo('type-data', async () => {
		const list = await getList('type');
		const entries = list.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
		const details = await Promise.all(entries.map((entry) => getResource('type', entry.name)));
		return details.filter(Boolean).map((type) => ({
			id: type.id,
			name: type.name,
			englishName: englishName(type),
			damageRelations: type.damage_relations,
			pokemon: type.pokemon ?? [],
			moves: type.moves ?? []
		}));
	});
}

export function getTypeIndex() {
	return memo('type-index', async () => {
		const types = await getTypeData();
		return new Map(types.map((type) => [type.name, type]));
	});
}

export function getVersionGroups() {
	return memo('version-groups', async () => {
		const list = await getList('version-group');
		const details = await Promise.all(list.map((entry) => getResource('version-group', entry.name)));
		return details
			.filter(Boolean)
			.map((group) => ({
				id: group.id,
				name: group.name,
				order: group.order,
				englishName: humanize(group.name)
			}))
			.sort((a, b) => a.order - b.order);
	});
}

export function getVersionGroupIndex() {
	return memo('version-group-index', async () => {
		const groups = await getVersionGroups();
		return new Map(groups.map((group) => [group.name, group]));
	});
}

export async function getDexData() {
	return memo('dex-data', async () => {
		const [species, generations, types] = await Promise.all([
			getSpeciesList(),
			getGenerations(),
			getTypeData()
		]);

		const generationBySpecies = new Map();
		for (const generation of generations) {
			for (const id of generation.speciesIds) generationBySpecies.set(id, generation.name);
		}

		const typesByPokemon = new Map();
		for (const type of types) {
			for (const entry of type.pokemon) {
				const id = idFromUrl(entry.pokemon?.url);
				if (!Number.isInteger(id) || id >= 10000) continue;
				if (!typesByPokemon.has(id)) typesByPokemon.set(id, []);
				typesByPokemon.get(id).push({
					name: type.name,
					englishName: type.englishName,
					slot: entry.slot ?? 0
				});
			}
		}

		const dex = species.map((entry) => ({
			id: entry.id,
			name: entry.name,
			humanName: humanize(entry.name),
			generation: generationBySpecies.get(entry.id) ?? '',
			types: (typesByPokemon.get(entry.id) ?? [])
				.slice()
				.sort((a, b) => a.slot - b.slot)
				.map(({ name, englishName }) => ({ name, englishName })),
			sprite: spriteUrl(entry.id)
		}));

		return {
			pokemon: dex,
			types: types.map(({ name, englishName }) => ({ name, englishName })),
			generations: generations.map(({ name, englishName }) => ({ name, englishName }))
		};
	});
}

function cardFromSpecies(entry) {
	return {
		id: entry.id,
		name: entry.name,
		humanName: humanize(entry.name),
		sprite: spriteUrl(entry.id)
	};
}

export async function cardsFromPokemonRefs(refs, extra = new Map()) {
	const speciesIndex = await getSpeciesIndex();
	const seen = new Set();
	const cards = [];
	for (const ref of refs ?? []) {
		const pokemon = ref.pokemon ?? ref;
		const id = idFromUrl(pokemon?.url);
		if (!Number.isInteger(id) || id >= 10000 || seen.has(id)) continue;
		const species = speciesIndex.get(id);
		if (!species) continue;
		seen.add(id);
		const card = cardFromSpecies(species);
		const details = extra.get(id);
		if (details) Object.assign(card, details);
		cards.push(card);
	}
	return cards.sort((a, b) => a.id - b.id);
}

export async function getPokemonCard(id) {
	const speciesIndex = await getSpeciesIndex();
	const species = speciesIndex.get(id);
	return species ? cardFromSpecies(species) : null;
}

export { API_BASE };

export const getSpecies = (key) => getResource('pokemon-species', key);
export const getPokemon = (key) => getResource('pokemon', key);
export const getMove = (key) => getResource('move', key);
export const getAbility = (key) => getResource('ability', key);
export const getType = (key) => getResource('type', key);
export const getEvolutionChain = (key) => getResource('evolution-chain', key);
