import { englishName, humanize } from '#lib/format';

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

const cache = new Map();

function memo(key, factory) {
	if (!cache.has(key)) {
		const promise = factory();
		cache.set(key, promise);
		promise.catch(() => cache.delete(key));
	}
	return cache.get(key);
}

function endpoint(path) {
	return `${API_BASE}/api/v2/${path}`;
}

export function getApiBase() {
	return API_BASE;
}

export function idFromUrl(url) {
	const match = String(url ?? '').match(/\/(\d+)\/?$/);
	return match ? Number(match[1]) : null;
}

async function fetchJson(url) {
	const response = await fetch(url, { headers: { accept: 'application/json' } });
	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(`PokeAPI request failed (${response.status}) for ${url}`);
	}
	return response.json();
}

export function getRecord(resource, key) {
	return memo(`record:${resource}/${key}`, () =>
		fetchJson(endpoint(`${resource}/${encodeURIComponent(String(key))}/`))
	);
}

export function getByUrl(resource, url) {
	const id = idFromUrl(url);
	if (!id) return Promise.resolve(null);
	return getRecord(resource, id);
}

export function getList(resource) {
	return memo(`list:${resource}`, () =>
		fetchJson(endpoint(`${resource}/?limit=100000`))
	);
}

export function getAllSpecies() {
	return memo('species', async () => {
		const list = await getList('pokemon-species');
		return (list?.results ?? [])
			.map((entry) => ({ name: entry.name, id: idFromUrl(entry.url) }))
			.filter((entry) => entry.id !== null)
			.sort((a, b) => a.id - b.id);
	});
}

export function getSpeciesNameMap() {
	return memo('species-name-map', async () => {
		const species = await getAllSpecies();
		return new Map(species.map((entry) => [entry.id, entry.name]));
	});
}

export function getAllTypes() {
	return memo('all-types', async () => {
		const list = await getList('type');
		const types = (list?.results ?? []).filter((entry) => !EXCLUDED_TYPES.has(entry.name));
		return Promise.all(
			types.map(async (entry) => {
				const record = await getByUrl('type', entry.url);
				return {
					id: record?.id ?? idFromUrl(entry.url),
					name: record?.name ?? entry.name,
					englishName: englishName(record?.names, humanize(entry.name)),
					record
				};
			})
		);
	});
}

export function getAllGenerations() {
	return memo('generations', async () => {
		const list = await getList('generation');
		return Promise.all(
			(list?.results ?? []).map(async (entry) => {
				const record = await getByUrl('generation', entry.url);
				return {
					id: record?.id ?? idFromUrl(entry.url),
					name: record?.name ?? entry.name,
					englishName: englishName(record?.names, humanize(entry.name)),
					record
				};
			})
		);
	});
}

async function mapLimit(items, limit, mapper) {
	const results = new Array(items.length);
	let next = 0;

	async function worker() {
		while (next < items.length) {
			const index = next++;
			results[index] = await mapper(items[index], index);
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

export async function buildCards(refs) {
	const speciesNames = await getSpeciesNameMap();
	const byId = new Map();

	for (const item of refs ?? []) {
		const pokemon = item.pokemon ?? item;
		const id = idFromUrl(pokemon.url);
		if (!id || id > 10000 || !speciesNames.has(id)) continue;

		const hidden = Boolean(item.is_hidden ?? item.hidden);
		const existing = byId.get(id);
		if (hidden) {
			if (existing) existing.hidden = true;
			else byId.set(id, hiddenCard(id, speciesNames.get(id), true));
		} else if (!byId.has(id)) {
			byId.set(id, buildCard(id, speciesNames.get(id)));
		}
	}

	return [...byId.values()].sort((a, b) => a.id - b.id);
}

function spriteUrl(id) {
	return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

function buildCard(id, speciesName) {
	return {
		id,
		speciesName,
		sprite: spriteUrl(id),
		hidden: false
	};
}

function hiddenCard(id, speciesName, hidden) {
	return {
		id,
		speciesName,
		sprite: spriteUrl(id),
		hidden
	};
}

export { mapLimit };
