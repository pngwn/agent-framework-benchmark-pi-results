// Runtime access to the PokeAPI server. All data is fetched over HTTP at request time and
// kept in a small in-memory cache (stale-while-revalidate) so pages stay fast while still
// picking up changes to the live data.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const FRESH_MS = 60_000;
const MAX_CONCURRENT = 24;

type Entry = { at: number; promise: Promise<any> };
const cache = new Map<string, Entry>();

// Simple concurrency limiter so a cold page doesn't open hundreds of sockets at once.
let active = 0;
const queue: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

async function load(path: string): Promise<any> {
  return limited(async () => {
    const res = await fetch(`${API_BASE_URL}/api/v2/${path}`);
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`API ${path} responded ${res.status}`);
    }
    return res.json();
  });
}

/** Fetches `/api/v2/<path>`. Resolves to `null` when the resource doesn't exist. */
export function api<T = any>(path: string): Promise<T | null> {
  path = path.replace(/^\/+/, '');
  const now = Date.now();
  const hit = cache.get(path);
  if (hit) {
    if (now - hit.at > FRESH_MS) {
      // Serve the stale value, refresh in the background.
      const promise = load(path);
      promise.then(
        () => cache.set(path, { at: Date.now(), promise }),
        () => {},
      );
      hit.at = now;
    }
    return hit.promise;
  }
  const promise = load(path);
  cache.set(path, { at: now, promise });
  promise.catch(() => cache.delete(path));
  return promise;
}

/** Converts an absolute API URL into the path below /api/v2/. */
export function apiPath(url: string): string {
  return url.replace(/^.*\/api\/v2\//, '');
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}
