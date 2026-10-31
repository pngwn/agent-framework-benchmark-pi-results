// Thin client for the local PokeAPI server, with in-memory caching.
// All data is fetched over HTTP at request time; nothing is read from disk
// or embedded at build time.

const base = () =>
	(process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export const apiBase = base;

const cache = new Map();

async function fetchJson(url) {
	const res = await fetch(url);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`PokeAPI error ${res.status} for ${url}`);
	return res.json();
}

/** Fetch a single API resource, e.g. api('pokemon/25'). Cached forever. */
export function api(path) {
	if (!cache.has(path)) {
		const promise = fetchJson(`${base()}/api/v2/${path}/`).catch((error) => {
			cache.delete(path);
			throw error;
		});
		cache.set(path, promise);
	}
	return cache.get(path);
}

/** Fetch the full (unpaginated) list of a resource. Cached forever. */
export function apiList(resource) {
	const key = `list:${resource}`;
	if (!cache.has(key)) {
		const promise = fetchJson(
			`${base()}/api/v2/${resource}/?limit=100000`,
		)
			.then((data) => data?.results ?? [])
			.catch((error) => {
				cache.delete(key);
				throw error;
			});
		cache.set(key, promise);
	}
	return cache.get(key);
}

/** Extract the numeric id from a resource URL like ".../pokemon/25/". */
export function idFromUrl(url) {
	const match = /\/(\d+)\/?$/.exec(url);
	if (!match) throw new Error(`Cannot parse id from URL: ${url}`);
	return Number(match[1]);
}

/** Map over items with limited concurrency. */
export async function mapPool(items, size, fn) {
	const out = new Array(items.length);
	let index = 0;
	const workers = Array.from(
		{ length: Math.min(size, items.length) },
		async () => {
			while (index < items.length) {
				const current = index;
				index += 1;
				out[current] = await fn(items[current], current);
			}
		},
	);
	await Promise.all(workers);
	return out;
}
