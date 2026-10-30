import {
  InjectionToken,
  PLATFORM_ID,
  Service,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';

/** Loads the view model for a page data path; resolves to null for unknown resources. */
export type PageDataLoader = (path: string) => Promise<unknown>;

const CLIENT_TTL_MS = 60_000;
const clientCache = new Map<string, { expires: number; value: Promise<unknown> }>();

/** In the browser, page data comes from the app server's `/_data` endpoint. */
const fetchPageData: PageDataLoader = (path) => {
  const now = Date.now();
  const hit = clientCache.get(path);
  if (hit && hit.expires > now) return hit.value;
  const value = fetch(`/_data${path}`).then((res) => {
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  });
  clientCache.set(path, { expires: now + CLIENT_TTL_MS, value });
  value.catch(() => clientCache.delete(path));
  return value;
};

/** Overridden on the server to build view models directly from the API. */
export const PAGE_DATA_LOADER = new InjectionToken<PageDataLoader>('PAGE_DATA_LOADER', {
  providedIn: 'root',
  factory: () => fetchPageData,
});

/** Base URL of the API, for media such as sprites. Read on the server, handed to the browser. */
const API_BASE_KEY = makeStateKey<string>('apiBase');
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => inject(TransferState).get(API_BASE_KEY, 'http://localhost:9000'),
});
export function publishApiBaseUrl(base: string): void {
  inject(TransferState).set(API_BASE_KEY, base);
}

@Service()
export class PageData {
  private readonly loader = inject(PAGE_DATA_LOADER);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  /** Loads page data, reusing what the server rendered with during hydration. */
  async load<T>(path: string): Promise<T | null> {
    const key = makeStateKey<T | null>(`page:${path}`);
    if (!this.isServer && this.transferState.hasKey(key)) {
      const value = this.transferState.get(key, null);
      this.transferState.remove(key);
      return value;
    }
    const value = (await this.loader(path)) as T | null;
    if (this.isServer) this.transferState.set(key, value);
    return value;
  }
}
