// Server-side PokeAPI client. All data comes from the live API at request time;
// responses are cached in memory for a short while and concurrent requests for
// the same URL share a single fetch.

export const API_BASE_URL = (
	globalThis.process?.env['API_BASE_URL'] || 'http://localhost:9000'
).replace(/\/$/, '');

const TTL_MS = 60_000;
const MAX_CONCURRENT = 24;

type Entry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

let active = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
	if (active >= MAX_CONCURRENT)
		await new Promise<void>((resolve) => queue.push(resolve));
	active++;
	try {
		return await task();
	} finally {
		active--;
		queue.shift()?.();
	}
}

async function request(url: string): Promise<unknown> {
	return withSlot(async () => {
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (res.status === 404) {
			await res.body?.cancel();
			return null;
		}
		if (!res.ok) {
			await res.body?.cancel();
			throw new Error(`API request failed: ${res.status} ${url}`);
		}
		return res.json();
	});
}

/** GET an API path (e.g. `pokemon/25`). Resolves to `null` when the API answers 404. */
export function api<T>(path: string): Promise<T | null> {
	const url = `${API_BASE_URL}/api/v2/${path.replace(/^\/+/, '')}`;
	const now = Date.now();
	const hit = cache.get(url);
	if (hit && hit.expires > now) return hit.value as Promise<T | null>;

	const value = request(url);
	cache.set(url, { expires: now + TTL_MS, value });
	// Don't keep failures around.
	value.catch(() => {
		if (cache.get(url)?.value === value) cache.delete(url);
	});
	return value as Promise<T | null>;
}

/** Like `api`, but throws when the resource is missing. */
export async function apiRequired<T>(path: string): Promise<T> {
	const data = await api<T>(path);
	if (data === null) throw new Error(`Missing API resource: ${path}`);
	return data;
}

/** Numeric ID at the end of an API resource URL. */
export function idFromUrl(url: string): number {
	return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}

export const spriteUrl = (pokemonId: number) =>
	`${API_BASE_URL}/media/sprites/pokemon/${pokemonId}.png`;

/**
 * Gracile renders every route once while building, to collect page assets, with
 * a stub URL. Handlers use this to skip loading API data during the build.
 */
export const isBuildRender = (url: URL) => url.hostname === 'gracile-static';
