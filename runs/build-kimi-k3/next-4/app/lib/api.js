// HTTP client for the local PokeAPI server. Responses are cached in memory for
// the lifetime of the server process; the data is always read over HTTP at
// request time, never at build time.

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const cache = new Map();

// Returns the parsed JSON body, or null when the API answers 404.
export function fetchJson(url) {
  let pending = cache.get(url);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
      return res.json();
    })();
    cache.set(url, pending);
    // Don't cache failures forever.
    pending.catch(() => cache.delete(url));
  }
  return pending;
}

export function apiGet(path) {
  return fetchJson(`${API_BASE}/api/v2/${path}`);
}

// Full (unpaginated) list of a resource.
export function apiList(resource) {
  return apiGet(`${resource}/?limit=100000`);
}
