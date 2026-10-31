/**
 * Server-side access to the local PokeAPI. All data is fetched over HTTP at
 * request time; responses are cached in memory for the lifetime of the process.
 */

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map<string, Promise<any>>();

// Small concurrency pool so bulk fan-outs don't open hundreds of sockets at once.
const MAX_CONCURRENT = 32;
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

/**
 * Fetch a resource from the API. `path` is relative to /api/v2, e.g.
 * `/pokemon/25/` or `/type/?limit=100`. Resolves to null on 404.
 */
export function apiFetch(path: string): Promise<any> {
  let p = cache.get(path);
  if (!p) {
    p = limited(async () => {
      const res = await fetch(`${API_BASE}/api/v2${path}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PokeAPI responded ${res.status} for ${path}`);
      return res.json();
    });
    cache.set(path, p);
    // Do not keep rejected promises in the cache; allow a later retry.
    p.catch(() => {
      if (cache.get(path) === p) cache.delete(path);
    });
  }
  return p;
}

/** `/api/v2/pokemon/25/` style path from an absolute API URL. */
export function apiPathOf(url: string): string {
  return new URL(url).pathname.replace(/^\/api\/v2\/?/, '/');
}

/** Numeric id from an API resource URL. */
export function idFromUrl(url: string): number {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : NaN;
}

/** Front sprite URL for a (default) Pokémon id. */
export function spriteUrl(pokemonId: number): string {
  return `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;
}
