const API_ORIGIN = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map<string, Promise<unknown>>();

export function mediaOrigin(): string {
  return API_ORIGIN;
}

export function idFromUrl(url: string | null | undefined): number | null {
  if (!url) return null;
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export async function fetchJson<T>(path: string): Promise<T | null> {
  const key = path.replace(/^\/+/, '');
  const existing = cache.get(key);
  if (existing) return existing as Promise<T | null>;

  const promise = (async () => {
    const response = await fetch(`${API_ORIGIN}/api/v2/${key}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`PokeAPI request failed: ${key} (${response.status})`);
    }
    return (await response.json()) as T;
  })().catch((error) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, promise);
  return promise as Promise<T | null>;
}

export async function fetchList<T>(resource: string): Promise<T[]> {
  const page = await fetchJson<{ results?: T[] }>(`${resource}/?limit=100000`);
  return page?.results ?? [];
}
