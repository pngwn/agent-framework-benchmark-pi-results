import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, shareReplay, switchMap } from 'rxjs';
import { Generation, NamedRef, TypeRecord, VersionGroup } from './models';
import { PokeApiService } from './poke-api.service';
import { englishName, humanize, idFromUrl } from './utils';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export interface TypeInfo {
  name: string;
  label: string;
}

/** A Pokémon card: a link to a species page with sprite, dex number and name. */
export interface CardData {
  id: number;
  name: string;
  label: string;
  sprite: string;
  types?: TypeInfo[];
  hidden?: boolean;
}

/** One species in the Pokédex index used by the home page. */
export interface SpeciesEntry {
  id: number;
  name: string;
  label: string;
  types: TypeInfo[];
  generation: string;
}

/** Derived, app-wide datasets built from the API at request time. */
@Injectable({ providedIn: 'root' })
export class DexService {
  private readonly api = inject(PokeApiService);

  /** The 18 type records, in API order. */
  readonly typeRecords$: Observable<TypeRecord[]> = this.api.listAll('type').pipe(
    switchMap((list) =>
      forkJoin(
        list.results
          .filter((t) => !EXCLUDED_TYPES.has(t.name))
          .map((t) => this.api.get<TypeRecord>(`type/${t.name}/`)),
      ),
    ),
    shareReplay(1),
  );

  /** Map of type API name -> English name. */
  readonly typeNameMap$: Observable<Map<string, string>> = this.typeRecords$.pipe(
    map((records) => new Map(records.map((r) => [r.name, englishName(r.names, r.name)] as const))),
    shareReplay(1),
  );

  /** The 9 generation records, in API order. */
  readonly generations$: Observable<Generation[]> = this.api.listAll('generation').pipe(
    switchMap((list) =>
      forkJoin(list.results.map((g) => this.api.get<Generation>(`generation/${g.name}/`))),
    ),
    shareReplay(1),
  );

  /** Map of species id -> species API name, covering every species the API lists. */
  readonly speciesMap$: Observable<Map<number, string>> = this.api.listAll('pokemon-species').pipe(
    map((list) => new Map(list.results.map((s) => [idFromUrl(s.url), s.name] as const))),
    shareReplay(1),
  );

  /** All version groups, ordered by their `order`. */
  readonly versionGroups$: Observable<VersionGroup[]> = this.api.listAll('version-group').pipe(
    switchMap((list) =>
      forkJoin(list.results.map((v) => this.api.get<VersionGroup>(`version-group/${v.name}/`))),
    ),
    map((groups) => groups.slice().sort((a, b) => a.order - b.order)),
    shareReplay(1),
  );

  /** Every species with its default Pokémon's types and its generation, for the home page. */
  readonly speciesIndex$: Observable<SpeciesEntry[]> = forkJoin({
    species: this.api.listAll('pokemon-species'),
    types: this.typeRecords$,
    generations: this.generations$,
  }).pipe(
    map(({ species, types, generations }) => {
      const speciesIds = new Set(species.results.map((s) => idFromUrl(s.url)));
      const typeLabel = new Map(types.map((t) => [t.name, englishName(t.names, t.name)] as const));

      const typesOf = new Map<number, { name: string; slot: number }[]>();
      for (const type of types) {
        for (const entry of type.pokemon) {
          const id = idFromUrl(entry.pokemon.url);
          if (!speciesIds.has(id)) continue; // leave out alternate forms
          const list = typesOf.get(id) ?? [];
          list.push({ name: type.name, slot: entry.slot });
          typesOf.set(id, list);
        }
      }

      const generationOf = new Map<string, string>();
      for (const generation of generations) {
        for (const s of generation.pokemon_species) generationOf.set(s.name, generation.name);
      }

      return species.results.map((s) => {
        const id = idFromUrl(s.url);
        const slotOrder = (typesOf.get(id) ?? []).sort((a, b) => a.slot - b.slot);
        return {
          id,
          name: s.name,
          label: humanize(s.name),
          types: slotOrder.map((t) => ({ name: t.name, label: typeLabel.get(t.name) ?? humanize(t.name) })),
          generation: generationOf.get(s.name) ?? '',
        } satisfies SpeciesEntry;
      });
    }),
    shareReplay(1),
  );

  /**
   * Maps Pokémon references (which may include alternate forms) to species cards,
   * deduplicated and ordered by dex number.
   */
  pokemonCards(refs: (NamedRef & { hidden?: boolean })[]): Observable<CardData[]> {
    return this.speciesMap$.pipe(
      map((speciesMap) => {
        const byId = new Map<number, CardData>();
        for (const ref of refs) {
          const id = idFromUrl(ref.url);
          const speciesName = speciesMap.get(id);
          if (!speciesName || byId.has(id)) continue; // alternate forms aren't species ids
          byId.set(id, {
            id,
            name: speciesName,
            label: humanize(speciesName),
            sprite: this.api.spriteUrl(id),
            hidden: ref.hidden,
          });
        }
        return [...byId.values()].sort((a, b) => a.id - b.id);
      }),
    );
  }
}
