export interface NamedRef {
  name: string;
  url: string;
}

export interface ListResponse<T = NamedRef> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const cache = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
const TTL = 60_000;

export async function apiGet<T = any>(path: string): Promise<T> {
  const key = path.replace(/^\/+/, "");
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    const res = await fetch(`/api-proxy/${key}`);
    if (!res.ok) throw new ApiError(res.status, `API request failed: ${key}`);
    const value = await res.json();
    cache.set(key, { at: Date.now(), value });
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise as Promise<T>;
}

export async function apiGetList<T = NamedRef>(resource: string, limit = 10_000): Promise<ListResponse<T>> {
  const sep = resource.includes("?") ? "&" : "?";
  return apiGet<ListResponse<T>>(`${resource}${sep}limit=${limit}`);
}

export function idFromUrl(url: string | undefined | null): number | null {
  if (!url) return null;
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function apiPathFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "http://placeholder");
    const marker = "/api/v2/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return parsed.pathname.slice(index + marker.length).replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
