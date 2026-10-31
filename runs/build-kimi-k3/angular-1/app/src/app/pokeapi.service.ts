import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Origin of the PokeAPI server, e.g. http://localhost:9000 */
export const API_BASE = new InjectionToken<string>('API_BASE');

const API_BASE_KEY = makeStateKey<string>('api-base');

/**
 * Resolves the API origin. On the server it comes from the API_BASE_URL
 * environment variable and is handed to the browser through TransferState so
 * both sides talk to the same API.
 */
export function provideApiBase() {
  return {
    provide: API_BASE,
    useFactory: () => {
      const platformId = inject(PLATFORM_ID);
      const transferState = inject(TransferState);
      if (isPlatformServer(platformId)) {
        const base = (process.env['API_BASE_URL'] ?? 'http://localhost:9000').replace(/\/$/, '');
        transferState.set(API_BASE_KEY, base);
        return base;
      }
      return transferState.get(API_BASE_KEY, 'http://localhost:9000');
    },
  };
}

// In-memory response cache, shared by all SSR requests in this process.
// The API is treated as a live service; this only avoids refetching immutable
// responses within the lifetime of the process.
const responseCache = new Map<string, Promise<unknown>>();

@Injectable({ providedIn: 'root' })
export class PokeApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE);

  /** Fetch a resource by API path ("pokemon/25", "type?limit=100") or absolute URL. */
  get<T>(path: string): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.base}/api/v2/${normalize(path)}`;
    let pending = responseCache.get(url) as Promise<T> | undefined;
    if (!pending) {
      pending = firstValueFrom(this.http.get<T>(url));
      // Don't cache failures.
      pending = pending.catch((err) => {
        responseCache.delete(url);
        throw err;
      });
      responseCache.set(url, pending);
    }
    return pending;
  }

  /** Absolute URL of a media file on the API server. */
  media(path: string): string {
    return `${this.base}/media/${path.replace(/^\//, '')}`;
  }
}

function normalize(path: string): string {
  const clean = path.replace(/^\//, '');
  return clean.includes('?') ? clean : clean.replace(/\/?$/, '/');
}
