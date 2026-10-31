// Server-side client for the local PokeAPI server.
//
// All data is fetched over HTTP at request time. Responses are cached in
// memory for the lifetime of the process (the spec explicitly allows this).

const BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export const apiBase = BASE;

const cache = new Map();

// Simple concurrency limiter so pages that need hundreds of records don't
// open hundreds of sockets at once.
const MAX_CONCURRENT = 48;
let inflight = 0;
const waiters = [];

async function limitedFetch(url) {
	if (inflight >= MAX_CONCURRENT) {
		await new Promise((resolve) => waiters.push(resolve));
	}
	inflight += 1;
	try {
		return await fetch(url);
	} finally {
		inflight -= 1;
		waiters.shift()?.();
	}
}

function toUrl(pathOrUrl) {
	if (pathOrUrl.startsWith('http')) {
		// Absolute URL from an API response — keep just the API path and
		// resolve it against our configured origin.
		const { pathname, search } = new URL(pathOrUrl);
		return `${BASE}${pathname}${search}`;
	}
	const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
	return `${BASE}/api/v2${path}`;
}

/**
 * Fetch a record or list from the API. Returns `null` when the API
 * responds 404, parsed JSON otherwise.
 */
export async function api(pathOrUrl) {
	const url = toUrl(pathOrUrl);
	if (cache.has(url)) return cache.get(url);
	const res = await limitedFetch(url);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`PokeAPI request failed: ${res.status} ${url}`);
	const data = await res.json();
	cache.set(url, data);
	return data;
}

/** Fetch the full (unpaginated) list for a resource. */
export async function apiList(resource) {
	const data = await api(`/${resource}/?limit=100000`);
	return data?.results ?? [];
}
