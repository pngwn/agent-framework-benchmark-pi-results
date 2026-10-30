export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');
const API_ROOT = `${API_BASE}/api/v2/`;

export class ApiError extends Error {
  constructor(public status: number, url: string) {
    super(`API request failed (${status}): ${url}`);
  }
}

const cache = new Map<string, Promise<unknown>>();

export function resolveApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return API_ROOT + pathOrUrl.replace(/^\/+/, '');
}

export function api<T = any>(pathOrUrl: string): Promise<T> {
  const url = resolveApiUrl(pathOrUrl);
  let request = cache.get(url) as Promise<T> | undefined;
  if (!request) {
    request = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return (await response.json()) as T;
    });
    cache.set(url, request);
  }
  return request;
}

export async function tryApi<T = any>(pathOrUrl: string): Promise<T | null> {
  try {
    return await api<T>(pathOrUrl);
  } catch {
    return null;
  }
}

export function idFromUrl(url: string | undefined): number {
  if (!url) return Number.NaN;
  const match = url.match(/\/(\d+)(?:\/)?(?:\?.*)?$/);
  return match ? Number(match[1]) : Number.NaN;
}

export function isSpeciesId(id: number): boolean {
  return Number.isFinite(id) && id > 0 && id < 10000;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}
