/**
 * Server-side PokeAPI client. Every request goes to the live API; parsed responses are
 * kept in memory for a short time so that one page render (and the renders right after
 * it) don't refetch the same resources.
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 4000;

export class ApiNotFoundError extends Error {}

export function apiBaseUrl(): string {
  return (process.env['API_BASE_URL'] || 'http://localhost:9000').replace(/\/+$/, '');
}

interface Entry {
  expires: number;
  value: Promise<unknown>;
}

const cache = new Map<string, Entry>();

/** Accepts `pokemon/25`, `/api/v2/pokemon/25/` or an absolute URL taken from API data. */
function toUrl(resource: string): string {
  const marker = '/api/v2/';
  const at = resource.indexOf(marker);
  const path = at >= 0 ? resource.slice(at + marker.length) : resource.replace(/^\/+/, '');
  return `${apiBaseUrl()}${marker}${path}`;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (res.status === 404) {
    await res.body?.cancel();
    throw new ApiNotFoundError(url);
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`API request failed: ${res.status} ${url}`);
  }
  return res.json();
}

export function apiGet<T>(resource: string): Promise<T> {
  const url = toUrl(resource);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  const value = fetchJson(url);
  cache.delete(url);
  cache.set(url, { expires: now + TTL_MS, value });
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  if (cache.size > MAX_ENTRIES) {
    for (const [key, entry] of cache) {
      if (cache.size <= MAX_ENTRIES && entry.expires > now) break;
      cache.delete(key);
    }
  }
  return value as Promise<T>;
}

/** Like apiGet, but resolves to null when the API has no such resource. */
export async function apiFind<T>(resource: string): Promise<T | null> {
  try {
    return await apiGet<T>(resource);
  } catch (err) {
    if (err instanceof ApiNotFoundError) return null;
    throw err;
  }
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}
