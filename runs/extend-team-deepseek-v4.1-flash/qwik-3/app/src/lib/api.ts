// Server-side access to the PokeAPI server. Everything here runs at request time;
// responses are cached in memory for a short while and refreshed in the background.

export const apiBase = () => (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");

export class NotFoundError extends Error {}

const FRESH_MS = 30_000;

interface CacheEntry {
  time: number;
  value: Promise<any>;
  refreshing?: boolean;
}

const cache = new Map<string, CacheEntry>();

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (res.status === 404) {
    await res.body?.cancel();
    throw new NotFoundError(url);
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`API request failed: ${res.status} ${url}`);
  }
  return res.json();
}

/** GET an API resource by path (`pokemon/25`) or absolute URL. */
export function get<T = any>(pathOrUrl: string): Promise<T> {
  const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : `${apiBase()}/api/v2/${pathOrUrl.replace(/^\/+/, "")}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit) {
    if (now - hit.time > FRESH_MS && !hit.refreshing) {
      hit.refreshing = true;
      fetchJson(url).then(
        (data) => cache.set(url, { time: Date.now(), value: Promise.resolve(data) }),
        (err) => {
          if (err instanceof NotFoundError) cache.delete(url);
          else hit.refreshing = false;
        },
      );
    }
    return hit.value;
  }
  const value = fetchJson(url);
  cache.set(url, { time: now, value });
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  return value;
}

/** GET that resolves to null for unknown resources. */
export async function find<T = any>(pathOrUrl: string): Promise<T | null> {
  try {
    return await get<T>(pathOrUrl);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export const isValidName = (name: string) => /^[a-z0-9-]+$/i.test(name);
