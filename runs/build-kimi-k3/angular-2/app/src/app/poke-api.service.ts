import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { NamedList } from './models';

/** Low-level access to the PokeAPI server, with a runtime in-memory cache. */
@Injectable({ providedIn: 'root' })
export class PokeApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly cache = new Map<string, Observable<unknown>>();

  /** GET /api/v2/<path>, cached per URL for the lifetime of this service. */
  get<T>(path: string): Observable<T> {
    const url = `${this.base}/api/v2/${path}`;
    let cached = this.cache.get(url);
    if (!cached) {
      cached = this.http.get<T>(url).pipe(shareReplay(1));
      this.cache.set(url, cached);
    }
    return cached as Observable<T>;
  }

  /** The full (unpaginated) list of a resource. */
  listAll(resource: string): Observable<NamedList> {
    return this.get<NamedList>(`${resource}/?limit=100000`);
  }

  /** URL of a media file on the API server, e.g. mediaPath `sprites/pokemon/25.png`. */
  mediaUrl(mediaPath: string): string {
    return `${this.base}/media/${mediaPath}`;
  }

  /** Front sprite for a Pokémon id. */
  spriteUrl(pokemonId: number): string {
    return this.mediaUrl(`sprites/pokemon/${pokemonId}.png`);
  }
}
