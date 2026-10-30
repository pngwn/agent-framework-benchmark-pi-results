const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

const cache = (globalThis.__pokedexApiCache ??= new Map());
const inFlight = (globalThis.__pokedexInflight ??= new Map());

export { API_BASE };

export function apiUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Fetch a PokeAPI resource over HTTP and cache successful responses for the lifetime of
 * the server process. A 404 is cached as null so callers can render not-found pages.
 */
export async function apiGet(pathOrUrl) {
  const url = apiUrl(pathOrUrl);
  if (cache.has(url)) return cache.get(url);
  if (inFlight.has(url)) return inFlight.get(url);

  const request = (async () => {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (response.status === 404) {
        cache.set(url, null);
        return null;
      }
      if (!response.ok) {
        throw new Error(`PokeAPI request failed: ${response.status} ${url}`);
      }
      const data = await response.json();
      cache.set(url, data);
      return data;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, request);
  return request;
}

export async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
