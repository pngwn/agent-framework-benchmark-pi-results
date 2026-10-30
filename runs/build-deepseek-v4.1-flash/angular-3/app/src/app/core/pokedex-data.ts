import { inject, Service } from '@angular/core';
import {
  ApiListResponse,
  LanguageName,
  NamedRef,
  englishName,
  idFromUrl,
} from './helpers';
import { PokeApi } from './poke-api';

export interface PokemonSpecies {
  id: number;
  name: string;
  order: number;
  names: LanguageName[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: { flavor_text: string; language: NamedRef }[];
  generation: NamedRef;
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface PokemonTypeSlot {
  slot: number;
  type: NamedRef;
}

export interface PokemonRecord {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: PokemonTypeSlot[];
  stats: { base_stat: number; effort: number; stat: NamedRef }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  species: NamedRef;
  moves: PokemonMoveRecord[];
  sprites: {
    front_default: string | null;
    other?: Record<string, { front_default: string | null } | undefined>;
  };
}

export interface PokemonMoveVersionDetail {
  level_learned_at: number;
  order: number | null;
  move_learn_method: NamedRef;
  version_group: NamedRef;
}

export interface PokemonMoveRecord {
  move: NamedRef;
  version_group_details: PokemonMoveVersionDetail[];
}

export interface MoveRecord {
  id: number;
  name: string;
  names: LanguageName[];
  type: NamedRef;
  damage_class: NamedRef;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: { effect: string; short_effect: string; language: NamedRef }[];
  flavor_text_entries: { flavor_text: string; language: NamedRef }[];
  learned_by_pokemon: NamedRef[];
}

export interface AbilityRecord {
  id: number;
  name: string;
  names: LanguageName[];
  effect_entries: { effect: string; short_effect: string; language: NamedRef }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface TypeRecord {
  id: number;
  name: string;
  names: LanguageName[];
  damage_relations: Record<string, NamedRef[]>;
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
}

export interface GenerationRecord {
  id: number;
  name: string;
  names: LanguageName[];
  pokemon_species: NamedRef[];
}

export interface VersionGroupRecord {
  id: number;
  name: string;
  order: number;
  version_group: string;
}

export interface EvolutionNode {
  species: NamedRef;
  evolves_to: EvolutionNode[];
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionNode;
}

export interface SpeciesEntry {
  id: number;
  name: string;
  url: string;
}

export interface TypeEntry {
  id: number;
  name: string;
  label: string;
  order: number;
  record: TypeRecord;
  pokemonSpeciesIds: Set<number>;
}

export interface GenerationEntry {
  id: number;
  name: string;
  label: string;
  order: number;
  speciesIds: Set<number>;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

@Service()
export class PokedexData {
  private readonly api = inject(PokeApi);

  private speciesPromise?: Promise<SpeciesEntry[]>;
  private typesPromise?: Promise<TypeEntry[]>;
  private generationsPromise?: Promise<GenerationEntry[]>;
  private versionGroupsPromise?: Promise<VersionGroupRecord[]>;

  getAllSpecies(): Promise<SpeciesEntry[]> {
    this.speciesPromise ??= this.list('pokemon-species', 100_000).then((response) =>
      response.results
        .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name, url: entry.url }))
        .filter((entry) => Number.isFinite(entry.id))
        .sort((a, b) => a.id - b.id),
    );
    return this.speciesPromise;
  }

  getAllTypes(): Promise<TypeEntry[]> {
    this.typesPromise ??= this.list('type', 100).then(async (response) => {
      const entries = response.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
      const records = await Promise.all(entries.map((entry) => this.api.get<TypeRecord>(entry.url)));
      return records.map((record, index) => {
        const pokemonSpeciesIds = new Set<number>();
        for (const slot of record.pokemon) {
          const id = idFromUrl(slot.pokemon.url);
          if (id <= 10_000) pokemonSpeciesIds.add(id);
        }
        return {
          id: record.id,
          name: record.name,
          label: englishName(record.names, record.name),
          order: index,
          record,
          pokemonSpeciesIds,
        };
      });
    });
    return this.typesPromise;
  }

  getAllGenerations(): Promise<GenerationEntry[]> {
    this.generationsPromise ??= this.list('generation', 100).then(async (response) => {
      const records = await Promise.all(
        response.results.map((entry) => this.api.get<GenerationRecord>(entry.url)),
      );
      return records.map((record, index) => ({
        id: record.id,
        name: record.name,
        label: englishName(record.names, record.name),
        order: index,
        speciesIds: new Set(record.pokemon_species.map((species) => idFromUrl(species.url))),
      }));
    });
    return this.generationsPromise;
  }

  getAllVersionGroups(): Promise<VersionGroupRecord[]> {
    this.versionGroupsPromise ??= this.list('version-group', 100).then(async (response) => {
      const records = await Promise.all(
        response.results.map((entry) => this.api.get<VersionGroupRecord>(entry.url)),
      );
      return records
        .map((record) => ({
          id: record.id,
          name: record.name,
          order: record.order,
          version_group: record.name,
        }))
        .sort((a, b) => a.order - b.order);
    });
    return this.versionGroupsPromise;
  }

  getSpecies(name: string): Promise<PokemonSpecies> {
    return this.api.get<PokemonSpecies>(`pokemon-species/${encodeURIComponent(name)}`);
  }

  getPokemon(idOrName: number | string): Promise<PokemonRecord> {
    return this.api.get<PokemonRecord>(`pokemon/${idOrName}`);
  }

  getMove(name: string): Promise<MoveRecord> {
    return this.api.get<MoveRecord>(`move/${encodeURIComponent(name)}`);
  }

  getAbility(name: string): Promise<AbilityRecord> {
    return this.api.get<AbilityRecord>(`ability/${encodeURIComponent(name)}`);
  }

  getType(name: string): Promise<TypeRecord> {
    return this.api.get<TypeRecord>(`type/${encodeURIComponent(name)}`);
  }

  getEvolutionChain(url: string): Promise<EvolutionChain> {
    return this.api.get<EvolutionChain>(url);
  }

  private list(resource: string, limit: number): Promise<ApiListResponse> {
    return this.api.get<ApiListResponse>(`${resource}?limit=${limit}&offset=0`);
  }
}
