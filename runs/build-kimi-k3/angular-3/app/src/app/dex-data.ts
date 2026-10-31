import { Injectable, inject } from '@angular/core';
import { GenerationRecord, PokeApi, TypeRecord } from './api';
import { englishName, humanize, idFromUrl } from './util';

export interface SpeciesEntry {
  id: number;
  name: string;
}

/** Types that are not part of the regular 18. */
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

@Injectable({ providedIn: 'root' })
export class DexData {
  private readonly api = inject(PokeApi);

  private speciesListPromise?: Promise<SpeciesEntry[]>;
  private typesPromise?: Promise<TypeRecord[]>;
  private generationsPromise?: Promise<GenerationRecord[]>;
  private typeNamesPromise?: Promise<Map<string, string>>;

  /** Every species, ordered by dex number. */
  speciesList(): Promise<SpeciesEntry[]> {
    return (this.speciesListPromise ??= this.api
      .list('pokemon-species')
      .then((refs) =>
        refs
          .map((ref) => ({ id: idFromUrl(ref.url), name: ref.name }))
          .sort((a, b) => a.id - b.id),
      ));
  }

  /** Every type record, including stellar/unknown/shadow, in API order. */
  allTypes(): Promise<TypeRecord[]> {
    return (this.typesPromise ??= this.api
      .list('type')
      .then((refs) => Promise.all(refs.map((ref) => this.api.get<TypeRecord>(`type/${ref.name}`)))));
  }

  /** The 18 regular types, in API order. */
  mainTypes(): Promise<TypeRecord[]> {
    return this.allTypes().then((types) => types.filter((type) => !EXCLUDED_TYPES.has(type.name)));
  }

  /** Map of type API name -> English name. */
  typeNames(): Promise<Map<string, string>> {
    return (this.typeNamesPromise ??= this.allTypes().then(
      (types) =>
        new Map(types.map((type) => [type.name, englishName(type.names) ?? humanize(type.name)])),
    ));
  }

  /** Every generation, ordered by id. */
  generations(): Promise<GenerationRecord[]> {
    return (this.generationsPromise ??= this.api
      .list('generation')
      .then((refs) =>
        Promise.all(refs.map((ref) => this.api.get<GenerationRecord>(`generation/${ref.name}`))),
      )
      .then((generations) => generations.sort((a, b) => a.id - b.id)));
  }
}
