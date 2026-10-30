import { humanize } from '#lib/format.js';

const API_ORIGIN = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');
const API_ROOT = `${API_ORIGIN}/api/v2`;

const cache = new Map();

export const MEDIA_ORIGIN = `${API_ORIGIN}/media`;

export function idFromUrl(url) {
	const match = String(url ?? '').match(/\/(\d+)\/?$/);
	return match ? Number(match[1]) : null;
}

function normalizeUrl(url) {
	if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
	return url;
}

async function request(url, allow404 = false) {
	const normalized = normalizeUrl(url);
	if (cache.has(normalized)) return cache.get(normalized);

	const promise = (async () => {
		const response = await fetch(normalized);
		if (response.status === 404 && allow404) return null;
		if (!response.ok) {
			throw new Error(`API request failed: ${response.status} ${normalized}`);
		}
		return response.json();
	})();

	cache.set(normalized, promise);
	return promise;
}

export function getResource(resource, key) {
	const path = key === undefined || key === null ? '' : `/${encodeURIComponent(String(key))}`;
	return request(`${API_ROOT}/${resource}${path}/`, true);
}

export async function getList(resource) {
	const data = await request(`${API_ROOT}/${resource}/?limit=100000`, false);
	return data?.results ?? [];
}

export function getByUrl(url) {
	return request(url, true);
}

export function spriteUrl(pokemonId) {
	return `${MEDIA_ORIGIN}/sprites/pokemon/${pokemonId}.png`;
}

export function artworkUrl(path) {
	if (!path) return null;
	return normalizeUrl(path);
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

async function buildTypeIndex() {
	const list = await getList('type');
	const allowed = list.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
	const records = await Promise.all(allowed.map((entry) => getResource('type', entry.name)));

	const types = [];
	const byName = new Map();
	const pokemonTypes = new Map();

	for (let i = 0; i < records.length; i += 1) {
		const record = records[i];
		if (!record) continue;
		const entry = {
			id: record.id,
			name: record.name,
			label: record.names?.find((name) => name.language?.name === 'en')?.name ?? humanize(record.name),
			pokemonIds: [],
			moves: record.moves ?? [],
			damage_relations: record.damage_relations ?? {}
		};
		const seen = new Set();
		for (const item of record.pokemon ?? []) {
			const id = idFromUrl(item.pokemon?.url);
			if (!id || id > 10000 || seen.has(id)) continue;
			seen.add(id);
			entry.pokemonIds.push(id);
			const slots = pokemonTypes.get(id) ?? [];
			slots.push({ slot: item.slot ?? slots.length + 1, name: record.name, label: entry.label });
			pokemonTypes.set(id, slots);
		}
		entry.pokemonIds.sort((a, b) => a - b);
		types.push(entry);
		byName.set(entry.name, entry);
	}

	for (const slots of pokemonTypes.values()) {
		slots.sort((a, b) => a.slot - b.slot);
	}

	return { types, byName, pokemonTypes };
}

let typeIndexPromise;
export function getTypeIndex() {
	typeIndexPromise ??= buildTypeIndex();
	return typeIndexPromise;
}

let speciesIndexPromise;
export function getSpeciesIndex() {
	speciesIndexPromise ??= (async () => {
		const results = await getList('pokemon-species');
		const list = results
			.map((entry) => ({
				id: idFromUrl(entry.url),
				name: entry.name
			}))
			.filter((entry) => entry.id && entry.id <= 10000)
			.sort((a, b) => a.id - b.id);
		const byId = new Map(list.map((entry) => [entry.id, entry]));
		const byName = new Map(list.map((entry) => [entry.name, entry]));
		return { list, byId, byName };
	})();
	return speciesIndexPromise;
}

let generationIndexPromise;
export function getGenerations() {
	generationIndexPromise ??= (async () => {
		const results = await getList('generation');
		const records = await Promise.all(results.map((entry) => getResource('generation', entry.name)));
		return records
			.filter(Boolean)
			.map((record) => ({
				id: record.id,
				name: record.name,
				label: record.names?.find((name) => name.language?.name === 'en')?.name ?? humanize(record.name),
				speciesIds: (record.pokemon_species ?? [])
					.map((entry) => idFromUrl(entry.url))
					.filter((id) => id && id <= 10000)
			}))
			.sort((a, b) => a.id - b.id);
	})();
	return generationIndexPromise;
}

let versionGroupIndexPromise;
export function getVersionGroups() {
	versionGroupIndexPromise ??= (async () => {
		const results = await getList('version-group');
		const records = await Promise.all(results.map((entry) => getResource('version-group', entry.name)));
		return records
			.filter(Boolean)
			.map((record) => ({
				id: record.id,
				name: record.name,
				order: record.order,
				label: humanize(record.name)
			}))
			.sort((a, b) => a.order - b.order);
	})();
	return versionGroupIndexPromise;
}

export async function getSpeciesByName(name) {
	const species = await getResource('pokemon-species', name);
	if (!species) return null;
	const index = await getSpeciesIndex();
	if (index.byId.has(species.id)) return species;
	// The list endpoint and detail endpoints can differ briefly; trust the record.
	return species;
}

export async function getMovesByNames(names) {
	const unique = [...new Set(names)];
	const entries = await Promise.all(
		unique.map(async (name) => [name, await getResource('move', name)])
	);
	return new Map(entries.filter((entry) => entry[1]));
}

export function cardsForPokemonIds(ids, speciesIndex) {
	const unique = [...new Set(ids)].filter((id) => id && id <= 10000).sort((a, b) => a - b);
	return unique.map((id) => {
		const species = speciesIndex.byId.get(id);
		const name = species?.name ?? String(id);
		return {
			id,
			name,
			displayName: humanize(name),
			sprite: spriteUrl(id)
		};
	});
}
