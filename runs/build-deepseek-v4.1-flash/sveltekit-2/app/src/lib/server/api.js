import { humanize, speciesIdFromUrl } from '#lib/format.js';

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export { API_BASE };

export class ApiError extends Error {
	constructor(status, path) {
		super(`PokeAPI request failed (${status}) for ${path}`);
		this.status = status;
	}
}

const cache = new Map();

export function pathFor(url) {
	const parsed = new URL(url, API_BASE);
	return parsed.pathname + parsed.search;
}

export function fetchJson(path) {
	if (cache.has(path)) return cache.get(path);

	const promise = (async () => {
		const response = await fetch(API_BASE + path);
		if (!response.ok) throw new ApiError(response.status, path);
		return response.json();
	})();

	cache.set(path, promise);
	promise.catch(() => cache.delete(path));
	return promise;
}

export const fetchUrl = (url) => fetchJson(pathFor(url));

export async function fetchMany(items, fn, concurrency = 24) {
	const results = new Array(items.length);
	let next = 0;

	async function worker() {
		while (next < items.length) {
			const index = next++;
			results[index] = await fn(items[index], index);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
	);
	return results;
}

let speciesPromise;

export function getSpeciesList() {
	speciesPromise ??= fetchJson('/api/v2/pokemon-species/?limit=100000').then((data) =>
		data.results
			.map((entry) => ({ id: speciesIdFromUrl(entry.url), name: entry.name }))
			.filter((entry) => Number.isFinite(entry.id))
			.sort((a, b) => a.id - b.id)
	);
	return speciesPromise;
}

let speciesMapPromise;

export function getSpeciesMap() {
	speciesMapPromise ??= getSpeciesList().then(
		(list) => new Map(list.map((species) => [species.id, species]))
	);
	return speciesMapPromise;
}

const HIDDEN_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let typePromise;

export function getTypes() {
	typePromise ??= (async () => {
		const list = await fetchJson('/api/v2/type/?limit=100000');
		const entries = list.results.filter((entry) => !HIDDEN_TYPES.has(entry.name));
		return fetchMany(entries, async (entry) => {
			const record = await fetchUrl(entry.url);
			const label =
				record.names?.find((name) => name.language?.name === 'en')?.name ??
				humanize(entry.name);
			return {
				name: entry.name,
				label,
				record,
				pokemon: record.pokemon
					.map((slot) => ({
						id: speciesIdFromUrl(slot.pokemon.url),
						slot: slot.slot
					}))
					.filter((slot) => Number.isFinite(slot.id) && slot.id < 10000)
			};
		});
	})();
	return typePromise;
}

let generationPromise;

export function getGenerations() {
	generationPromise ??= (async () => {
		const list = await fetchJson('/api/v2/generation/?limit=100000');
		return fetchMany(list.results, async (entry, index) => {
			const record = await fetchUrl(entry.url);
			return {
				name: entry.name,
				label:
					record.names?.find((name) => name.language?.name === 'en')?.name ??
					humanize(entry.name),
				order: index,
				species: record.pokemon_species
					.map((species) => speciesIdFromUrl(species.url))
					.filter((id) => Number.isFinite(id))
			};
		});
	})();
	return generationPromise;
}

export async function getTypeRecord(name) {
	const types = await getTypes();
	return types.find((type) => type.name === name) ?? null;
}

/** Front sprite for a card. Most species use the predictable URL; added species use their Pokémon record. */
export async function getSprite(species) {
	if (species.id <= 1025) return `${API_BASE}/media/sprites/pokemon/${species.id}.png`;

	try {
		const pokemon = await fetchJson(`/api/v2/pokemon/${species.id}/`);
		return (
			pokemon.sprites?.front_default ??
			`${API_BASE}/media/sprites/pokemon/${species.id}.png`
		);
	} catch {
		return `${API_BASE}/media/sprites/pokemon/${species.id}.png`;
	}
}

export async function makeCards(speciesList) {
	const unique = [...new Map(speciesList.map((species) => [species.id, species])).values()];
	unique.sort((a, b) => a.id - b.id);
	return fetchMany(unique, async (species) => ({
		id: species.id,
		name: species.name,
		label: humanize(species.name),
		sprite: await getSprite(species)
	}));
}

export async function getVersionGroups(names) {
	const unique = [...new Set(names)];
	const records = await fetchMany(unique, (name) => fetchJson(`/api/v2/version-group/${name}/`));
	return records.sort((a, b) => a.order - b.order);
}
