import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

declare global {
  interface Window {
    __POKEDEX_API_BASE_URL__?: string;
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = (
    (globalThis as typeof globalThis & { __POKEDEX_API_BASE_URL__?: string })
      .__POKEDEX_API_BASE_URL__ ?? 'http://localhost:9000'
  ).replace(/\/$/, '');
  private readonly cache = new Map<string, Observable<unknown>>();

  /** GET an API resource. Responses are cached in memory for the session. */
  get<T>(path: string): Observable<T> {
    const key = path.startsWith('/') ? path : `/${path}`;
    const cached = this.cache.get(key);
    if (cached) return cached as Observable<T>;

    const request = this.http
      .get<T>(`${this.baseUrl}/api/v2${key}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.cache.set(key, request);
    return request;
  }

  /** GET a resource, treating any failure (including 404) as absent. */
  optional<T>(path: string): Observable<T | null> {
    return this.get<T>(path).pipe(catchError(() => of(null)));
  }

  /** Resolve a root-relative media URL against the API origin. */
  mediaUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** The conventional front sprite URL for a Pokémon id. */
  spriteFor(id: number): string {
    return `${this.baseUrl}/media/sprites/pokemon/${id}.png`;
  }

  /** Turn an absolute or root-relative API resource URL into an API path. */
  pathOf(url: string): string {
    try {
      const parsed = new URL(url, this.baseUrl);
      return parsed.pathname.replace(/^\/api\/v2/, '');
    } catch {
      return url;
    }
  }

  /** Collect every result from a paginated list endpoint. */
  getAll<T>(resource: string): Observable<T[]> {
    return this.get<ListResponse<T>>(`/${resource}/?limit=100000`).pipe(
      map((response) => response.results),
    );
  }
}

interface ListResponse<T> {
  count: number;
  results: T[];
}
