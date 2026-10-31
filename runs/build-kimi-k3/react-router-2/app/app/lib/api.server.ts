// Server-only API access layer. Everything goes over HTTP to the live API at
// request time; responses are cached in memory for the lifetime of the process.

const MAX_CONCURRENT = 64;
let active = 0;
const waiters: Array<() => void> = [];

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

function apiBase(): string {
  return (process.env.API_BASE_URL ?? "http://localhost:9000").replace(
    /\/+$/,
    "",
  );
}

const cache = new Map<string, Promise<any>>();

/**
 * Fetch a JSON resource from the API. `path` is relative to /api/v2/,
 * e.g. "pokemon/25" or "pokemon-species/?limit=100000".
 * Resolves to null on 404. Results (and in-flight requests) are cached.
 */
export function apiFetch(path: string): Promise<any> {
  const url = `${apiBase()}/api/v2/${path}`;
  const hit = cache.get(url);
  if (hit) return hit;
  const promise = limited(async () => {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error ${res.status} for ${url}`);
    return res.json();
  });
  cache.set(url, promise);
  // Don't cache failures forever; allow a later request to retry.
  promise.catch(() => {
    if (cache.get(url) === promise) cache.delete(url);
  });
  return promise;
}
