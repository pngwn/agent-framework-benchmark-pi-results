import { Injectable } from '@angular/core';
import { idFromUrl } from './util';

export class NotFoundError extends Error {}

export interface NamedResource {
  name: string;
  url: string;
}

export interface ListResponse<T = NamedResource> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SpeciesEntry extends NamedResource {
  id: number;
}

export interface TypePokemonEntry {
  slot: number;
  pokemon: NamedResource;
}

export interface TypeRecord {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  damage_relations: Record<string, NamedResource[]>;
  pokemon: TypePokemonEntry[];
  moves: NamedResource[];
}

export interface GenerationRecord {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  pokemon_species: NamedResource[];
}

export interface VersionGroupRecord {
  id: number;
  name: string;
  order: number;
}

export interface PokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedResource }[];
  stats: { base_stat: number; effort: number; stat: NamedResource }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedResource }[];
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default?: string | null; front_shiny?: string | null };
      home?: { front_default?: string | null };
      dream_world?: { front_default?: string | null };
    };
  };
  moves: {
    move: NamedResource;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedResource;
      move_learn_method: NamedResource;
      order: number | null;
    }[];
  }[];
  species: NamedResource;
}

export interface SpeciesRecord {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version?: NamedResource;
  }[];
  generation: NamedResource;
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedResource }[];
  evolves_from_species: NamedResource | null;
}

export interface EvolutionNode {
  species: NamedResource;
  evolves_to: EvolutionNode[];
}

export interface EvolutionChainRecord {
  id: number;
  chain: EvolutionNode;
}

export interface MoveRecord {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  names: { name: string; language: { name: string } }[];
  effect_entries: {
    short_effect: string;
    effect: string;
    language: { name: string };
  }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  damage_class: NamedResource;
  type: NamedResource;
  learned_by_pokemon: NamedResource[];
}

export interface AbilityRecord {
  id: number;
  name: string;
  names: { name: string; language: { name: string } }[];
  effect_entries: { short_effect: string; effect: string; language: { name: string } }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedResource }[];
}

const API_VERSION = 'api/v2';

@Injectable({ providedIn: 'root' })
export class PokeApi {
  readonly baseUrl = resolveApiBaseUrl();
  private readonly cache = new Map<string, Promise<unknown>>();

  get<T>(path: string): Promise<T> {
    const url = this.apiUrl(path);
    const cached = this.cache.get(url);
    if (cached) return cached as Promise<T>;
    const promise = fetch(url).then(async (response) => {
      if (!response.ok) throw new NotFoundError(`${url} responded ${response.status}`);
      return (await response.json()) as T;
    });
    this.cache.set(url, promise);
    promise.catch(() => this.cache.delete(url));
    return promise;
  }

  getUrl<T>(url: string): Promise<T> {
    return this.get<T>(url);
  }

  getList<T extends NamedResource = NamedResource>(resource: string): Promise<T[]> {
    return this.get<ListResponse<T>>(`${resource}/?limit=100000`).then((response) => response.results);
  }

  async getSpeciesIndex(): Promise<SpeciesEntry[]> {
    const results = await this.getList<NamedResource>('pokemon-species');
    return results
      .map((entry) => ({ ...entry, id: idFromUrl(entry.url) ?? 0 }))
      .filter((entry) => entry.id > 0 && !this.isAlternateForm(entry.id))
      .sort((a, b) => a.id - b.id);
  }

  getSpecies(nameOrId: string | number): Promise<SpeciesRecord> {
    return this.get<SpeciesRecord>(`pokemon-species/${encodeURIComponent(String(nameOrId))}`);
  }

  getPokemon(nameOrId: string | number): Promise<PokemonRecord> {
    return this.get<PokemonRecord>(`pokemon/${encodeURIComponent(String(nameOrId))}`);
  }

  getType(nameOrId: string | number): Promise<TypeRecord> {
    return this.get<TypeRecord>(`type/${encodeURIComponent(String(nameOrId))}`);
  }

  getGeneration(nameOrId: string | number): Promise<GenerationRecord> {
    return this.get<GenerationRecord>(`generation/${encodeURIComponent(String(nameOrId))}`);
  }

  getVersionGroup(nameOrId: string | number): Promise<VersionGroupRecord> {
    return this.get<VersionGroupRecord>(`version-group/${encodeURIComponent(String(nameOrId))}`);
  }

  getMove(nameOrId: string | number): Promise<MoveRecord> {
    return this.get<MoveRecord>(`move/${encodeURIComponent(String(nameOrId))}`);
  }

  getAbility(nameOrId: string | number): Promise<AbilityRecord> {
    return this.get<AbilityRecord>(`ability/${encodeURIComponent(String(nameOrId))}`);
  }

  getEvolutionChain(idOrName: string | number): Promise<EvolutionChainRecord> {
    return this.get<EvolutionChainRecord>(`evolution-chain/${encodeURIComponent(String(idOrName))}`);
  }

  isAlternateForm(id: number): boolean {
    return id >= 10000;
  }

  absoluteUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  spriteUrl(id: number): string {
    return `${this.baseUrl}/media/sprites/pokemon/${id}.png`;
  }

  artworkUrl(pokemon: PokemonRecord): string | null {
    return this.absoluteUrl(
      pokemon.sprites.other?.['official-artwork']?.front_default ??
        pokemon.sprites.other?.home?.front_default ??
        pokemon.sprites.other?.dream_world?.front_default ??
        pokemon.sprites.front_default,
    );
  }

  private apiUrl(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    const clean = path.replace(/^\/+/, '').replace(/^api\/v2\//, '');
    return `${this.baseUrl}/${API_VERSION}/${clean}`;
  }
}

function resolveApiBaseUrl(): string {
  const meta =
    typeof document !== 'undefined'
      ? document.querySelector('meta[name="api-base-url"]')?.getAttribute('content')
      : null;
  if (meta && !meta.includes('__API_BASE_URL__')) return meta.replace(/\/$/, '');
  return 'http://localhost:9000';
}
