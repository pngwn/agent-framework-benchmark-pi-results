/**
 * Runtime access to the PokeAPI HTTP server.
 *
 * All data is fetched over HTTP at request time; responses are cached in
 * memory for the lifetime of the process (the API is a live service, but
 * caching per-run is explicitly allowed).
 */

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(
	/\/+$/,
	'',
);

export class ApiError extends Error {
	status: number;
	constructor(status: number, url: string) {
		super(`API request failed: ${status} ${url}`);
		this.status = status;
	}
}

/** Small concurrency pool so we never open thousands of sockets at once. */
const MAX_CONCURRENT = 24;
let activeCount = 0;
const waiters: Array<() => void> = [];

async function acquire(): Promise<void> {
	if (activeCount < MAX_CONCURRENT) {
		activeCount += 1;
		return;
	}
	await new Promise<void>((resolve) => {
		waiters.push(resolve);
	});
	activeCount += 1;
}

function release(): void {
	activeCount -= 1;
	const next = waiters.shift();
	if (next) next();
}

async function fetchJson(url: string): Promise<unknown> {
	await acquire();
	try {
		const response = await fetch(url, {
			headers: { accept: 'application/json' },
		});
		if (!response.ok) throw new ApiError(response.status, url);
		return await response.json();
	} finally {
		release();
	}
}

const cache = new Map<string, Promise<unknown>>();

/**
 * Fetch (and cache) an API resource. Accepts either an API-relative path
 * (`/pokemon/25/`) or a full URL as found in API responses.
 */
export function api<T = any>(pathOrUrl: string): Promise<T> {
	let path = pathOrUrl;
	if (path.startsWith('http')) {
		if (!path.startsWith(API_BASE)) throw new Error(`Unexpected URL: ${path}`);
		path = path.slice(API_BASE.length);
	}
	if (!path.startsWith('/api/v2')) path = `/api/v2${path}`;
	const url = `${API_BASE}${path}`;
	let pending = cache.get(url);
	if (!pending) {
		pending = fetchJson(url);
		cache.set(url, pending);
		// Don't let a rejected promise sit in the cache forever.
		pending.catch(() => {
			if (cache.get(url) === pending) cache.delete(url);
		});
	}
	return pending as Promise<T>;
}

/** Extract the numeric id from a resource URL (`.../pokemon/25/` -> 25). */
export function idFromUrl(url: string): number {
	const match = /\/(\d+)\/?$/.exec(url);
	if (!match) throw new Error(`Cannot parse id from ${url}`);
	return Number(match[1]);
}
