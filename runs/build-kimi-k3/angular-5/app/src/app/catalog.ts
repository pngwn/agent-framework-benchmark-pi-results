import { Injectable, inject } from '@angular/core';
import { ApiService, englishName, idFromUrl } from './api';

export interface SpeciesRef {
  id: number;
  name: string;
}

export interface TypeInfo {
  id: number;
  name: string;
  enName: string;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** Alternate forms (Pokémon IDs above 10000) are out of scope. */
const MAX_POKEMON_ID = 10000;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);
  private speciesPromise?: Promise<SpeciesRef[]>;
  private speciesByIdPromise?: Promise<Map<number, SpeciesRef>>;

  /** Every species, ordered by dex number. */
  species(): Promise<SpeciesRef[]> {
    return (this.speciesPromise ??= this.api
      .list('pokemon-species')
      .then((results) =>
        results
          .map((r) => ({ id: idFromUrl(r.url), name: r.name ?? '' }))
          .sort((a, b) => a.id - b.id),
      ));
  }

  speciesById(): Promise<Map<number, SpeciesRef>> {
    return (this.speciesByIdPromise ??= this.species().then(
      (list) => new Map(list.map((s) => [s.id, s])),
    ));
  }

  /**
   * Map a Pokémon reference (from move/ability/type data) to its species.
   * Returns null for alternate forms, which are out of scope.
   */
  async toSpecies(pokemonUrl: string): Promise<SpeciesRef | null> {
    const id = idFromUrl(pokemonUrl);
    if (!Number.isFinite(id) || id > MAX_POKEMON_ID) return null;
    const byId = await this.speciesById();
    return byId.get(id) ?? null;
  }

  /** Map a list of Pokémon references to distinct species, ordered by dex number. */
  async toSpeciesList(pokemonUrls: string[]): Promise<SpeciesRef[]> {
    const byId = await this.speciesById();
    const found = new Map<number, SpeciesRef>();
    for (const url of pokemonUrls) {
      const id = idFromUrl(url);
      if (!Number.isFinite(id) || id > MAX_POKEMON_ID) continue;
      const species = byId.get(id);
      if (species) found.set(species.id, species);
    }
    return [...found.values()].sort((a, b) => a.id - b.id);
  }
}

@Injectable({ providedIn: 'root' })
export class TypeCatalogService {
  private readonly api = inject(ApiService);
  private allPromise?: Promise<TypeInfo[]>;
  private byNamePromise?: Promise<Map<string, TypeInfo>>;

  /** The 18 types, in API order. */
  all(): Promise<TypeInfo[]> {
    return (this.allPromise ??= this.api.list('type').then(async (results) => {
      const refs = results
        .map((r) => ({ id: idFromUrl(r.url), name: r.name ?? '' }))
        .filter((t) => !EXCLUDED_TYPES.has(t.name));
      const records = await Promise.all(
        refs.map((t) => this.api.get<{ names?: { name: string; language: { name: string } }[] }>(`type/${t.id}`)),
      );
      return refs.map((t, i) => ({ ...t, enName: englishName(records[i].names, t.name) }));
    }));
  }

  byName(): Promise<Map<string, TypeInfo>> {
    return (this.byNamePromise ??= this.all().then((list) => new Map(list.map((t) => [t.name, t]))));
  }
}
