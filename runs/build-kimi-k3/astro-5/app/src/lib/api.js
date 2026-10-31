// Thin wrapper around the local PokeAPI server with an in-memory cache.
// All data is fetched over HTTP at request time; the cache only lives for
// the lifetime of the server process.

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map();

async function request(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PokeAPI request failed: ${res.status} ${url}`);
  return res.json();
}

/** Fetch a PokeAPI resource. `path` may be "pokemon/pikachu", "type?limit=100" or a full URL. */
export function api(path) {
  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${API_BASE}/api/v2/${String(path).replace(/^\/+/, '')}`;
  let p = cache.get(url);
  if (!p) {
    p = request(url);
    p.catch(() => cache.delete(url)); // don't cache failures
    cache.set(url, p);
  }
  return p;
}

/** Convert an API URL (absolute or root-relative) to a plain resource path. */
export function apiPath(url) {
  const pathname = url.startsWith('http') ? new URL(url).pathname : String(url);
  return pathname.replace(/^\/api\/v2\/?/, '').replace(/\/+$/, '');
}

export const apiByUrl = (url) => api(apiPath(url));

/** Fetch the full (unpaginated) list for a resource. */
export async function apiList(resource) {
  const data = await api(`${resource}?limit=100000`);
  return data?.results ?? [];
}

/** Fetch many resources with bounded concurrency. */
export async function apiMany(urlsOrPaths, concurrency = 24) {
  const results = new Array(urlsOrPaths.length);
  let next = 0;
  async function worker() {
    while (next < urlsOrPaths.length) {
      const i = next++;
      results[i] = await apiByUrl(urlsOrPaths[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, urlsOrPaths.length) }, worker);
  await Promise.all(workers);
  return results;
}

/** URL for a media file served by the API server, e.g. media('sprites/pokemon/25.png'). */
export const media = (p) => `${API_BASE}/media/${String(p).replace(/^\/+/, '')}`;

export { API_BASE };
