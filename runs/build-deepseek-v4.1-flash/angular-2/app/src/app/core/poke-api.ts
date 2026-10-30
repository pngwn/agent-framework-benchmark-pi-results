import { Injectable } from '@angular/core';
import {
  Ability,
  EvolutionChain,
  Generation,
  ListResponse,
  Move,
  NamedRef,
  Pokemon,
  PokemonSpecies,
  PokemonType,
  SpeciesListItem,
  VersionGroup,
} from './models';
import { englishName, idFromUrl } from './format';

declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface TypeInfo {
  name: string;
  label: string;
  record: PokemonType;
}

export interface GenerationInfo {
  name: string;
  label: string;
  order: number;
  record: Generation;
}

export interface TypeMembership {
  name: string;
  label: string;
  slot: number;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

@Injectable({ providedIn: 'root' })
export class PokeApi {
  readonly baseUrl = (
    (typeof window !== 'undefined' && window.__API_BASE_URL__) ||
    'http://localhost:9000'
  ).replace(/\/+$/, '');

  private readonly cache = new Map<string, Promise<unknown>>();
  private speciesPromise?: Promise<SpeciesListItem[]>;
  private typeCatalogPromise?: Promise<PokemonType[]>;
  private generationCatalogPromise?: Promise<Generation[]>;
  private versionGroupsPromise?: Promise<VersionGroup[]>;

  mediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (/^https?:\/\//.test(url)) return url;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  spriteUrl(id: number): string {
    return `${this.baseUrl}/media/sprites/pokemon/${id}.png`;
  }

  private pathFor(urlOrPath: string): string {
    if (/^https?:\/\//.test(urlOrPath)) {
      const url = new URL(urlOrPath);
      return `${url.pathname}${url.search}`;
    }
    return urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  }

  private request<T>(urlOrPath: string): Promise<T> {
    const path = this.pathFor(urlOrPath);
    let pending = this.cache.get(path);
    if (!pending) {
      pending = fetch(`${this.baseUrl}${path}`).then(async (response) => {
        if (!response.ok) {
          throw new ApiError(response.status, `${path} returned ${response.status}`);
        }
        return (await response.json()) as T;
      });
      this.cache.set(path, pending);
    }
    return pending as Promise<T>;
  }

  private list<T>(resource: string): Promise<T[]> {
    return this.request<ListResponse<T>>(`/api/v2/${resource}/?limit=100000`).then((page) => page.results);
  }

  allSpecies(): Promise<SpeciesListItem[]> {
    if (!this.speciesPromise) {
      this.speciesPromise = this.list<NamedRef>('pokemon-species').then((results) =>
        results
          .map((entry) => {
            const id = idFromUrl(entry.url);
            return id === null ? null : { id, name: entry.name, url: entry.url };
          })
          .filter((entry): entry is SpeciesListItem => entry !== null && entry.id <= 10000)
          .sort((a, b) => a.id - b.id),
      );
    }
    return this.speciesPromise;
  }

  async speciesById(): Promise<Map<number, SpeciesListItem>> {
    return new Map((await this.allSpecies()).map((entry) => [entry.id, entry]));
  }

  species(name: string): Promise<PokemonSpecies> {
    return this.request<PokemonSpecies>(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
  }

  pokemon(nameOrId: string | number): Promise<Pokemon> {
    return this.request<Pokemon>(`/api/v2/pokemon/${encodeURIComponent(String(nameOrId))}/`);
  }

  move(name: string): Promise<Move> {
    return this.request<Move>(`/api/v2/move/${encodeURIComponent(name)}/`);
  }

  ability(name: string): Promise<Ability> {
    return this.request<Ability>(`/api/v2/ability/${encodeURIComponent(name)}/`);
  }

  type(name: string): Promise<PokemonType> {
    return this.request<PokemonType>(`/api/v2/type/${encodeURIComponent(name)}/`);
  }

  evolutionChain(url: string): Promise<EvolutionChain> {
    return this.request<EvolutionChain>(url);
  }

  typeCatalog(): Promise<PokemonType[]> {
    if (!this.typeCatalogPromise) {
      this.typeCatalogPromise = this.list<NamedRef>('type')
        .then((results) => results.filter((entry) => !EXCLUDED_TYPES.has(entry.name)))
        .then((results) => Promise.all(results.map((entry) => this.type(entry.name))));
    }
    return this.typeCatalogPromise;
  }

  async typeInfo(): Promise<{ name: string; label: string; record: PokemonType }[]> {
    return (await this.typeCatalog()).map((record) => ({
      name: record.name,
      label: englishName(record.names, record.name),
      record,
    }));
  }

  generationCatalog(): Promise<Generation[]> {
    if (!this.generationCatalogPromise) {
      this.generationCatalogPromise = this.list<NamedRef>('generation')
        .then((results) => Promise.all(results.map((entry) => this.request<Generation>(entry.url))));
    }
    return this.generationCatalogPromise;
  }

  async generationInfo(): Promise<GenerationInfo[]> {
    return (await this.generationCatalog()).map((record) => ({
      name: record.name,
      label: englishName(record.names, record.name),
      order: record.id,
      record,
    }));
  }

  versionGroups(): Promise<VersionGroup[]> {
    if (!this.versionGroupsPromise) {
      this.versionGroupsPromise = this.list<NamedRef>('version-group')
        .then((results) => Promise.all(results.map((entry) => this.request<VersionGroup>(entry.url))))
        .then((groups) => groups.sort((a, b) => a.order - b.order));
    }
    return this.versionGroupsPromise;
  }

  /** Maps species id to its types, using the per-type Pokémon lists. */
  async speciesTypes(): Promise<Map<number, TypeMembership[]>> {
    const catalog = await this.typeInfo();
    const map = new Map<number, TypeMembership[]>();
    for (const type of catalog) {
      for (const entry of type.record.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        if (id === null || id > 10000) continue;
        const memberships = map.get(id) ?? [];
        if (!memberships.some((membership) => membership.name === type.name)) {
          memberships.push({ name: type.name, label: type.label, slot: entry.slot });
          memberships.sort((a, b) => a.slot - b.slot);
          map.set(id, memberships);
        }
      }
    }
    return map;
  }

  /** Maps species id to its generation name. */
  async speciesGenerations(): Promise<Map<number, string>> {
    const generations = await this.generationCatalog();
    const map = new Map<number, string>();
    for (const generation of generations) {
      for (const species of generation.pokemon_species) {
        const id = idFromUrl(species.url);
        if (id !== null && id <= 10000) map.set(id, generation.name);
      }
    }
    return map;
  }
}
