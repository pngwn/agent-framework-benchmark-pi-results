import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { englishName, idFromUrl } from './format';
import type {
  Generation,
  ListResponse,
  NamedRef,
  SpeciesRef,
  TypeDetail,
} from './models';

export interface TypeInfo {
  name: string;
  displayName: string;
  order: number;
  pokemon: { id: number; slot: number }[];
}

export interface GenerationInfo {
  name: string;
  displayName: string;
  order: number;
  speciesIds: number[];
}

export interface Catalog {
  species: SpeciesRef[];
  speciesById: Map<number, SpeciesRef>;
  types: TypeInfo[];
  typeByPokemonId: Map<number, { name: string; displayName: string; slot: number }[]>;
  typeByName: Map<string, TypeInfo>;
  generations: Generation[];
  generationsInfo: GenerationInfo[];
  generationBySpeciesId: Map<number, string>;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);

  readonly species$ = this.api.getAll<SpeciesRef>('pokemon-species').pipe(
    map((species) =>
      [...species].sort((a, b) => idFromUrl(a.url) - idFromUrl(b.url)),
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly types$ = this.api.getAll<NamedRef>('type').pipe(
    map((types) => types.filter((type) => !EXCLUDED_TYPES.has(type.name))),
    switchMap((types) =>
      forkJoin(
        types.map((type) => this.api.get<TypeDetail>(`/type/${type.name}/`)),
      ),
    ),
    map((types) =>
      types.map<TypeInfo>((type) => ({
        name: type.name,
        displayName: englishName(type.names, type.name),
        order: type.id,
        pokemon: type.pokemon.map((slot) => ({
          id: idFromUrl(slot.pokemon.url),
          slot: slot.slot,
        })),
      })),
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly generations$ = this.api.getAll<NamedRef>('generation').pipe(
    switchMap((generations) =>
      generations.length
        ? forkJoin(
            generations.map((generation) =>
              this.api.get<Generation>(`/generation/${generation.name}/`),
            ),
          )
        : of([]),
    ),
    map((generations) =>
      [...generations].sort((a, b) => a.id - b.id),
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  readonly catalog$: Observable<Catalog> = combineLatest([
    this.species$,
    this.types$,
    this.generations$,
  ]).pipe(
    map(([species, types, generations]) => {
      const speciesById = new Map<number, SpeciesRef>();
      for (const entry of species) speciesById.set(idFromUrl(entry.url), entry);

      const typeByPokemonId = new Map<number, { name: string; displayName: string; slot: number }[]>();
      for (const type of types) {
        for (const entry of type.pokemon) {
          // Alternate forms have ids above 10000 and are out of scope.
          if (entry.id <= 10000) {
            const list = typeByPokemonId.get(entry.id) ?? [];
            list.push({ name: type.name, displayName: type.displayName, slot: entry.slot });
            typeByPokemonId.set(entry.id, list);
          }
        }
      }
      for (const list of typeByPokemonId.values()) {
        list.sort((a, b) => a.slot - b.slot);
      }

      const generationsInfo: GenerationInfo[] = generations.map((generation) => ({
        name: generation.name,
        displayName: englishName(generation.names, generation.name),
        order: generation.id,
        speciesIds: generation.pokemon_species.map((entry) => idFromUrl(entry.url)),
      }));

      const generationBySpeciesId = new Map<number, string>();
      for (const generation of generationsInfo) {
        for (const id of generation.speciesIds) {
          generationBySpeciesId.set(id, generation.name);
        }
      }

      return {
        species,
        speciesById,
        types,
        typeByPokemonId,
        typeByName: new Map(types.map((type) => [type.name, type])),
        generations,
        generationsInfo,
        generationBySpeciesId,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );
}
