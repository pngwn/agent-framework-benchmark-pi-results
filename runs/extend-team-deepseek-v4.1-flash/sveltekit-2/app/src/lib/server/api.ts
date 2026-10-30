// Thin client for the PokeAPI server. Every request goes over HTTP at request time;
// responses are cached in memory for a short while so a page that needs dozens of
// records (or the home page index) doesn't refetch them on every request.

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 5000;

type Entry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

export class ApiError extends Error {
	constructor(
		public status: number,
		url: string
	) {
		super(`API request failed with ${status}: ${url}`);
	}
}

/** The API origin, as reachable from both the server and the browser. */
export const apiBase = API_BASE_URL;

/** Converts an API URL (absolute or root-relative) or a bare path to a path below /api/v2/. */
function toPath(resource: string): string {
	const match = resource.match(/\/api\/v2\/(.*)$/);
	const path = match ? match[1] : resource.replace(/^\/+/, '');
	return path;
}

async function request<T>(path: string): Promise<T | null> {
	const url = `${API_BASE_URL}/api/v2/${path}`;
	const res = await fetch(url);
	if (res.status === 404) {
		await res.body?.cancel();
		return null;
	}
	if (!res.ok) {
		await res.body?.cancel();
		throw new ApiError(res.status, url);
	}
	return (await res.json()) as T;
}

/** Fetches an API resource; resolves to `null` if the API responds with 404. */
export function get<T>(resource: string): Promise<T | null> {
	const path = toPath(resource);
	const now = Date.now();
	const hit = cache.get(path);
	if (hit && hit.expires > now) return hit.value as Promise<T | null>;

	const value = request<T>(path);
	cache.set(path, { expires: now + TTL_MS, value });
	// Failed requests shouldn't stick around.
	value.catch(() => {
		if (cache.get(path)?.value === value) cache.delete(path);
	});
	if (cache.size > MAX_ENTRIES) {
		for (const [key, entry] of cache) {
			if (entry.expires <= now || cache.size > MAX_ENTRIES) cache.delete(key);
			else break;
		}
	}
	return value;
}

/** Like `get`, but throws if the resource is missing. */
export async function getOrThrow<T>(resource: string): Promise<T> {
	const value = await get<T>(resource);
	if (value === null) throw new ApiError(404, resource);
	return value;
}

/** Maps over `items` with at most `limit` promises in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/** The numeric ID at the end of an API URL. */
export function idFromUrl(url: string): number {
	return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}
