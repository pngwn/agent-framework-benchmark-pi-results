// Thin HTTP client for the local PokeAPI server. All data is fetched over HTTP
// at request time; responses are cached in memory for the lifetime of the process.

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map<string, Promise<any>>();

export function apiFetch(path: string): Promise<any> {
  const url = `${API_BASE}/api/v2/${path}`;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PokeAPI error ${res.status} for ${url}`);
      return res.json();
    });
    cache.set(url, p);
    // Don't keep rejected promises in the cache.
    p.catch(() => cache.delete(url));
  }
  return p;
}

export const getRecord = (resource: string, id: number | string): Promise<any | null> =>
  apiFetch(`${resource}/${encodeURIComponent(String(id))}/`);

export const getList = (resource: string): Promise<any> => apiFetch(`${resource}/?limit=100000`);

export const idFromUrl = (url: string): number => Number(url.replace(/\/+$/, '').split('/').pop());

export const spriteUrl = (pokemonId: number): string =>
  `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;

// Run async work over a list with bounded concurrency, preserving order.
export async function pool<T, R>(items: readonly T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, worker));
  return results;
}
