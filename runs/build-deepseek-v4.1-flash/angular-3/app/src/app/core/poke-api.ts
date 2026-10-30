import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiBaseUrl } from './runtime-config';

@Service()
export class PokeApi {
  private readonly http = inject(HttpClient);
  private readonly base = apiBaseUrl();
  private readonly cache = new Map<string, Promise<unknown>>();

  get<T>(pathOrUrl: string): Promise<T> {
    const url = this.resolveApiUrl(pathOrUrl);
    let request = this.cache.get(url) as Promise<T> | undefined;
    if (!request) {
      request = firstValueFrom(this.http.get<T>(url));
      this.cache.set(url, request);
    }
    return request;
  }

  media(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${this.base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  spriteUrl(pokemonId: number): string {
    return `${this.base}/media/sprites/pokemon/${pokemonId}.png`;
  }

  private resolveApiUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const path = pathOrUrl.startsWith('/api/v2/')
      ? pathOrUrl
      : `/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
    return `${this.base}${path}`;
  }
}
