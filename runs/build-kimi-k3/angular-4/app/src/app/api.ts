import { InjectionToken, PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const DEFAULT_API_BASE = 'http://localhost:9000';

/**
 * Origin of the PokeAPI server. On the server it comes from the API_BASE_URL
 * environment variable; in the browser from `window.__API_BASE_URL__`, which is
 * set by the `/config.js` script served by the Express server.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const g = globalThis as Record<string, any>;
    const fromEnv =
      isPlatformServer(inject(PLATFORM_ID)) && g['process']?.env?.['API_BASE_URL'];
    return String(fromEnv || g['__API_BASE_URL__'] || DEFAULT_API_BASE).replace(/\/+$/, '');
  },
});

/** HTTP access to the PokeAPI server, with an in-memory per-session cache. */
@Service()
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly cache = new Map<string, Promise<unknown>>();

  /** Fetch a resource by API path, e.g. `pokemon/25` or `pokemon-species/?limit=2000`. */
  get<T>(path: string): Promise<T> {
    const clean = path.replace(/^\/+/, '');
    const url = `${this.base}/api/v2/${clean.endsWith('/') || clean.includes('?') ? clean : `${clean}/`}`;
    let pending = this.cache.get(url);
    if (!pending) {
      pending = firstValueFrom(this.http.get<T>(url));
      this.cache.set(url, pending);
      // Don't cache failures forever.
      pending.catch(() => this.cache.delete(url));
    }
    return pending as Promise<T>;
  }

  /** Front sprite URL for a Pokémon id (`/media/sprites/pokemon/<id>.png`). */
  spriteUrl(pokemonId: number): string {
    return `${this.base}/media/sprites/pokemon/${pokemonId}.png`;
  }
}
