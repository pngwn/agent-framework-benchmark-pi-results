import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FlavorEntry, NameEntry, NamedRef } from './util';

/** Origin of the PokeAPI server, e.g. `http://localhost:9000`. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

const API_URL_KEY = makeStateKey<string>('api-base-url');

/**
 * Resolves the API origin. On the server it comes from the `API_BASE_URL`
 * environment variable; the value is handed to the browser via TransferState
 * so both sides talk to the same API.
 */
export function apiBaseUrlFactory(): string {
  const platformId = inject(PLATFORM_ID);
  const state = inject(TransferState);
  if (isPlatformServer(platformId)) {
    const env = typeof process !== 'undefined' ? process.env?.['API_BASE_URL'] : undefined;
    const url = (env || 'http://localhost:9000').replace(/\/+$/, '');
    state.set(API_URL_KEY, url);
    return url;
  }
  return state.get(API_URL_KEY, 'http://localhost:9000');
}

export interface PokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  moves: {
    move: NamedRef;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedRef;
      move_learn_method: NamedRef;
    }[];
  }[];
  sprites: {
    front_default?: string | null;
    other?: { ['official-artwork']?: { front_default?: string | null } };
  } | null;
}

export interface SpeciesRecord {
  id: number;
  name: string;
  names: NameEntry[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: FlavorEntry[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface MoveRecord {
  id: number;
  name: string;
  names: NameEntry[];
  type: NamedRef | null;
  damage_class: NamedRef | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: { effect: string; short_effect: string; language: NamedRef }[];
  flavor_text_entries: FlavorEntry[];
  learned_by_pokemon: NamedRef[];
}

export interface AbilityRecord {
  id: number;
  name: string;
  names: NameEntry[];
  effect_entries: { effect: string; short_effect: string; language: NamedRef }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface TypeRecord {
  id: number;
  name: string;
  names: NameEntry[];
  damage_relations: {
    no_damage_to: NamedRef[];
    half_damage_to: NamedRef[];
    double_damage_to: NamedRef[];
    no_damage_from: NamedRef[];
    half_damage_from: NamedRef[];
    double_damage_from: NamedRef[];
  };
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
}

export interface GenerationRecord {
  id: number;
  name: string;
  names: NameEntry[];
  pokemon_species: NamedRef[];
}

export interface VersionGroupRecord {
  id: number;
  name: string;
  order: number;
}

export interface EvolutionNode {
  species: NamedRef;
  evolves_to: EvolutionNode[];
}

export interface EvolutionChainRecord {
  id: number;
  chain: EvolutionNode;
}

// In-memory cache shared by every SSR request of this server process and, in
// the browser, by every navigation of the session.
const cache = new Map<string, Promise<unknown>>();

@Injectable({ providedIn: 'root' })
export class PokeApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** Fetches `/api/v2/<path>/` (path may have a trailing slash or not). */
  get<T>(path: string): Promise<T> {
    const clean = path.replace(/^\/+|\/+$/g, '');
    return this.getUrl<T>(`${this.base}/api/v2/${clean}/`);
  }

  /** Fetches the full (unpaginated) results list of a resource. */
  async list(resource: string): Promise<NamedRef[]> {
    const page = await this.getUrl<{ results: NamedRef[] }>(
      `${this.base}/api/v2/${resource}/?limit=100000`,
    );
    return page.results;
  }

  /** Fetches a resource by the URL found in API references. */
  getByRefUrl<T>(url: string): Promise<T> {
    const path = new URL(url, this.base).pathname;
    return this.getUrl<T>(`${this.base}${path}`);
  }

  /** Absolute URL of an API media file. */
  mediaUrl(path: string): string {
    return `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Front sprite URL for a Pokémon id. */
  spriteUrl(id: number): string {
    return this.mediaUrl(`/media/sprites/pokemon/${id}.png`);
  }

  /** Makes a root-relative (`/media/...`) or absolute API URL absolute. */
  absolutize(url: string): string {
    return url.startsWith('http') ? url : this.mediaUrl(url);
  }

  private getUrl<T>(url: string): Promise<T> {
    let pending = cache.get(url) as Promise<T> | undefined;
    if (!pending) {
      pending = firstValueFrom(this.http.get<T>(url));
      cache.set(url, pending);
      pending.catch(() => cache.delete(url));
    }
    return pending;
  }
}
