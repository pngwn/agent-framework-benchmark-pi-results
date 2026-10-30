import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { ListResponse, NamedRef } from './pokeapi.models';

@Injectable({ providedIn: 'root' })
export class PokeApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly cache = new Map<string, Observable<unknown>>();

  readonly baseUrl = this.base;

  /** Fetches a path such as `/api/v2/pokemon/25/`. */
  get<T>(path: string): Observable<T> {
    return this.request<T>(path);
  }

  /** Fetches a resource referenced by an API response (absolute or root-relative URL). */
  getRef<T>(ref: NamedRef | { url: string }): Observable<T> {
    return this.request<T>(ref.url);
  }

  /** Fetches every result of a list endpoint, bypassing its default pagination. */
  getList<T = NamedRef>(resource: string): Observable<ListResponse<T>> {
    return this.request<ListResponse<T>>(`/api/v2/${resource}/?limit=100000`);
  }

  mediaUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${this.base}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private request<T>(pathOrUrl: string): Observable<T> {
    const url = /^https?:\/\//i.test(pathOrUrl)
      ? pathOrUrl
      : `${this.base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    const key = url;
    let stream = this.cache.get(key);
    if (!stream) {
      stream = this.http.get<T>(url).pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.cache.set(key, stream);
    }
    return stream as Observable<T>;
  }
}
