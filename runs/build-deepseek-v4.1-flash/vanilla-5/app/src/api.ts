/// <reference types="vite/client" />

declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

const FALLBACK_ORIGIN = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:9000';

export interface ApiRef {
  name: string;
  url: string;
}

export type ApiRecord = Record<string, any>;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function apiOrigin(): string {
  const injected = typeof window !== 'undefined' ? window.__API_BASE_URL__ : undefined;
  return (injected || FALLBACK_ORIGIN).replace(/\/+$/, '');
}

const cache = new Map<string, Promise<ApiRecord>>();

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, '').replace(/^api\/v2\//, '');
  return `${apiOrigin()}/api/v2/${normalized}`;
}

export function fetchRecord<T extends ApiRecord = ApiRecord>(path: string): Promise<T> {
  const url = apiUrl(path);
  const existing = cache.get(url);
  if (existing) return existing as Promise<T>;
  const promise = (async () => {
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch (error) {
      throw new ApiError(0, error instanceof Error ? error.message : String(error));
    }
    if (!response.ok) {
      throw new ApiError(response.status, `${response.status} ${response.statusText} for ${url}`);
    }
    return (await response.json()) as T;
  })();
  cache.set(url, promise);
  return promise;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function idFromUrl(url: string | undefined | null): number | null {
  if (!url) return null;
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function isAlternateForm(id: number | null): boolean {
  return id !== null && id > 10000;
}
