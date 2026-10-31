// Server-side access to the local PokeAPI server, with an in-memory cache.
// The app never reads the data/ directory or embeds data at build time;
// everything is fetched over HTTP at request time and cached per process.

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export const apiBaseUrl = API_BASE_URL;

const cache = new Map();

/**
 * Fetch a single API resource, e.g. apiFetch('/pokemon/25/').
 * Returns parsed JSON, or null on 404. Results are cached in memory.
 */
export function apiFetch(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = (async () => {
    const res = await fetch(`${API_BASE_URL}/api/v2${path}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`PokeAPI request failed: ${path} -> ${res.status}`);
    return res.json();
  })();
  cache.set(path, promise);
  // Don't cache rejections forever: allow a retry on the next request.
  promise.catch(() => cache.delete(path));
  return promise;
}

/** Fetch many resources with bounded concurrency. */
export async function fetchMany(paths, concurrency = 32) {
  const results = new Array(paths.length);
  let next = 0;
  async function worker() {
    while (next < paths.length) {
      const i = next++;
      results[i] = await apiFetch(paths[i]);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, paths.length)) }, worker);
  await Promise.all(workers);
  return results;
}

/** Memoize an async zero-arg function for the lifetime of the process. */
export function memoize(fn) {
  let promise = null;
  return () => {
    if (!promise) {
      promise = fn();
      promise.catch(() => {
        promise = null;
      });
    }
    return promise;
  };
}
