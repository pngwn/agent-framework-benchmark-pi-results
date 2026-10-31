import { Injectable } from '@angular/core';

declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

const injected = typeof window !== 'undefined' ? window.__API_BASE_URL__ : undefined;
export const API_BASE = (injected && injected.startsWith('http') ? injected : 'http://localhost:9000').replace(
  /\/+$/,
  '',
);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Humanized name: each `-`-separated word capitalized, joined by spaces. */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** Numeric id from a resource URL like `/api/v2/pokemon/25/`. */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : NaN;
}

/** Dex number: `#` plus four zero-padded digits. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

interface LocalizedName {
  name: string;
  language: { name: string };
}

/** English name of a resource, falling back to the humanized API name. */
export function englishName(names: LocalizedName[] | undefined | null, fallback: string): string {
  return names?.find((n) => n.language?.name === 'en')?.name ?? humanize(fallback);
}

/** Collapse every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

interface FlavorTextEntry {
  flavor_text: string;
  language: { name: string };
}

/** The last English flavor text entry, whitespace-collapsed. */
export function latestEnglishFlavorText(entries: FlavorTextEntry[] | undefined | null): string | null {
  const english = (entries ?? []).filter((e) => e.language?.name === 'en');
  return english.length ? collapseWhitespace(english[english.length - 1].flavor_text) : null;
}

/** Em dash shown for missing values. */
export const MISSING = '—';

/** Rebase a media (or any API) URL onto the configured API origin. */
export function rebaseUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, API_BASE);
    return `${API_BASE}${parsed.pathname}`;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly cache = new Map<string, Promise<unknown>>();

  /** Fetch a resource by path relative to /api/v2/ (e.g. `pokemon/25` or `move/thunderbolt`). */
  get<T = unknown>(path: string): Promise<T> {
    const key = path.replace(/^\/+|\/+$/g, '');
    let promise = this.cache.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = fetch(`${API_BASE}/api/v2/${key}/`).then(async (res) => {
        if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText} for /api/v2/${key}/`);
        return (await res.json()) as T;
      });
      // Do not cache failures forever: allow a retry on the next request.
      promise.catch(() => this.cache.delete(key));
      this.cache.set(key, promise as Promise<unknown>);
    }
    return promise;
  }

  /** Fetch a resource referenced by an absolute or root-relative API URL from the data. */
  getByUrl<T = unknown>(url: string): Promise<T> {
    const parsed = new URL(url, API_BASE);
    const path = parsed.pathname.replace(/^\/api\/v2\//, '');
    return this.get<T>(path + parsed.search);
  }

  /** Fetch the full (unpaginated) result list of a resource. */
  list<T = { name?: string; url: string }>(resource: string): Promise<T[]> {
    return this.get<{ results: T[] }>(`${resource}/?limit=100000`).then((data) => data.results);
  }
}
