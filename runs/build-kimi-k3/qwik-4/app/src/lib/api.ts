// Server-side access to the PokeAPI HTTP service. All app data comes from this
// API at request time; responses are cached in memory for the lifetime of the
// process (the spec explicitly allows runtime caching).

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map<string, Promise<any>>();

/** Fetch a resource under /api/v2/ (e.g. "pokemon/25" or "type?limit=100").
 *  Returns null when the API responds 404. */
export function api<T = any>(path: string): Promise<T | null> {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const url = `${API_BASE}/api/v2/${clean}`;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`API ${url} -> ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        // Don't cache failures: the API is live and transient errors are possible.
        cache.delete(url);
        throw err;
      });
    cache.set(url, p);
  }
  return p;
}

/** Run an async mapping with limited concurrency. */
export async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}
