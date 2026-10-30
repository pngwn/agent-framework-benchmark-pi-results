// PokeAPI client. All data comes from the API at request time; responses are cached in
// memory for a short time (stale-while-revalidate) so pages stay fast without going stale.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
const API_ROOT = `${API_BASE_URL}/api/v2/`;
const FRESH_MS = 30_000;

type Entry = { value?: unknown; at: number; pending?: Promise<unknown> };
const cache = new Map<string, Entry>();

async function load(path: string): Promise<unknown> {
  const res = await fetch(API_ROOT + path);
  if (res.status === 404) {
    await res.body?.cancel();
    return null;
  }
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

function refresh(path: string, entry: Entry): Promise<unknown> {
  entry.pending ??= load(path)
    .then((value) => {
      entry.value = value;
      entry.at = Date.now();
      return value;
    })
    .finally(() => {
      entry.pending = undefined;
    });
  return entry.pending;
}

/** GETs `/api/v2/<path>`. Resolves to null when the API answers 404. */
export async function api<T = any>(path: string): Promise<T | null> {
  path = path.replace(/^\/+/, '');
  let entry = cache.get(path);
  if (!entry) {
    entry = { at: 0 };
    cache.set(path, entry);
  }
  if (entry.at === 0) return (await refresh(path, entry)) as T | null;
  if (Date.now() - entry.at > FRESH_MS) refresh(path, entry).catch(() => {});
  return entry.value as T | null;
}

/** GETs an absolute API URL as returned inside API responses. */
export function apiUrl<T = any>(url: string): Promise<T | null> {
  const i = url.indexOf('/api/v2/');
  return api<T>(i === -1 ? url : url.slice(i + '/api/v2/'.length));
}

/** Full, unpaginated list of a resource. */
export async function apiList(resource: string): Promise<{ name: string; url: string }[]> {
  const data = await api<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000`);
  return data?.results ?? [];
}

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
