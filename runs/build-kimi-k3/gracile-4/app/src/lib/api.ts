/**
 * Runtime access to the PokeAPI-compatible HTTP API.
 *
 * Everything is fetched over HTTP at request time. Responses are cached in
 * memory for the lifetime of the server process (allowed by the spec); the
 * cache starts empty on every (re)start, so data changes between runs are
 * always picked up.
 */

export const API_BASE = (
	process.env.API_BASE_URL ?? 'http://localhost:9000'
).replace(/\/+$/, '');

export const API_ORIGIN = API_BASE;

const cache = new Map<string, Promise<unknown>>();

async function fetchJson(url: string): Promise<unknown> {
	let lastError: unknown;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			const response = await fetch(url, {
				headers: { accept: 'application/json' },
			});
			if (response.status === 404) return null;
			if (!response.ok)
				throw new Error(`API ${response.status} for ${url}`);
			return (await response.json()) as unknown;
		} catch (error) {
			lastError = error;
			await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
		}
	}
	throw lastError;
}

/**
 * Fetch a resource by path (`/pokemon/25`) or by absolute/root-relative API URL.
 * Returns `null` when the API answers 404.
 */
export function api<T>(pathOrUrl: string): Promise<T | null> {
	let path = pathOrUrl;
	if (path.startsWith('http')) path = new URL(path).pathname;
	if (!path.startsWith('/api/v2')) {
		path = `/api/v2${path.startsWith('/') ? path : `/${path}`}`;
	}
	const url = `${API_BASE}${path}`;
	let pending = cache.get(url);
	if (!pending) {
		pending = fetchJson(url);
		cache.set(url, pending);
		// Don't cache hard failures.
		pending.catch(() => cache.delete(url));
	}
	return pending as Promise<T | null>;
}

/** Run `fn` over `items` with a bounded amount of parallelism. */
export async function mapLimit<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let cursor = 0;
	const workers = Array.from(
		{ length: Math.min(limit, items.length) },
		async () => {
			for (;;) {
				const index = cursor;
				cursor += 1;
				if (index >= items.length) return;
				results[index] = await fn(items[index]!, index);
			}
		},
	);
	await Promise.all(workers);
	return results;
}

/** Absolute media URL for a Pokémon front sprite. */
export function frontSpriteUrl(pokemonId: number): string {
	return `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;
}
