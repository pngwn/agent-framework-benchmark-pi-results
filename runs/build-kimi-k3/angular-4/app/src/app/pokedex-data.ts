import { Service, inject } from '@angular/core';
import { Api } from './api';
import {
  Generation,
  ListPage,
  NamedResourceRef,
  PokeType,
  Pokemon,
} from './models';
import { englishName, humanize, idFromUrl } from './util';

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const ALT_FORM_ID_THRESHOLD = 10000;

export interface SpeciesRef {
  name: string;
  id: number;
}

/** A Pokémon card: species identity plus everything needed to render it. */
export interface CardEntry {
  id: number; // species (dex) id
  name: string; // species API name
  types: { name: string; english: string }[];
  note?: string;
}

/**
 * Shared, cached datasets derived from the API: species, types, generations
 * and helpers to map Pokémon references onto their species.
 */
@Service()
export class PokedexData {
  private readonly api = inject(Api);

  private speciesPromise?: Promise<SpeciesRef[]>;
  private typesPromise?: Promise<PokeType[]>;
  private generationsPromise?: Promise<Generation[]>;

  /** Every species the API lists, ordered by dex number. */
  speciesList(): Promise<SpeciesRef[]> {
    this.speciesPromise ??= this.api
      .get<ListPage<NamedResourceRef>>('pokemon-species/?limit=10000')
      .then((page) =>
        page.results
          .map((r) => ({ name: r.name, id: idFromUrl(r.url) }))
          .sort((a, b) => a.id - b.id),
      );
    return this.speciesPromise;
  }

  async speciesMap(): Promise<Map<string, number>> {
    const list = await this.speciesList();
    return new Map(list.map((s) => [s.name, s.id]));
  }

  /** The 18 types, in API order. */
  types(): Promise<PokeType[]> {
    this.typesPromise ??= this.api
      .get<ListPage<NamedResourceRef>>('type/?limit=100')
      .then((page) =>
        Promise.all(
          page.results
            .filter((r) => !EXCLUDED_TYPES.has(r.name))
            .map((r) => this.api.get<PokeType>(`type/${r.name}`)),
        ),
      );
    return this.typesPromise;
  }

  /** English name per type API name. */
  async typeNames(): Promise<Map<string, string>> {
    const types = await this.types();
    return new Map(types.map((t) => [t.name, englishName(t.names, humanize(t.name))]));
  }

  /** All generations, in API order. */
  generations(): Promise<Generation[]> {
    this.generationsPromise ??= this.api
      .get<ListPage<NamedResourceRef>>('generation/?limit=100')
      .then((page) =>
        Promise.all(page.results.map((r) => this.api.get<Generation>(`generation/${r.name}`))),
      );
    return this.generationsPromise;
  }

  /** Types of each Pokémon, keyed by Pokémon id, in slot order. */
  async pokemonTypes(): Promise<Map<number, { name: string; english: string }[]>> {
    const types = await this.types();
    const names = await this.typeNames();
    const byPokemon = new Map<number, { slot: number; name: string }[]>();
    for (const type of types) {
      for (const entry of type.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        let list = byPokemon.get(id);
        if (!list) byPokemon.set(id, (list = []));
        list.push({ slot: entry.slot, name: type.name });
      }
    }
    const result = new Map<number, { name: string; english: string }[]>();
    for (const [id, list] of byPokemon) {
      result.set(
        id,
        list
          .sort((a, b) => a.slot - b.slot)
          .map((t) => ({ name: t.name, english: names.get(t.name) ?? humanize(t.name) })),
      );
    }
    return result;
  }

  /** Species introduced in each generation, keyed by generation API name. */
  async generationSpecies(): Promise<Map<string, Set<string>>> {
    const generations = await this.generations();
    return new Map(
      generations.map((g) => [g.name, new Set(g.pokemon_species.map((s) => s.name))]),
    );
  }

  /**
   * Map a list of Pokémon references (e.g. `learned_by_pokemon`) to species
   * cards: alternate forms (id > 10000) are excluded, remaining Pokémon are
   * mapped to their species, deduplicated and ordered by dex number.
   */
  async cardsFor(refs: NamedResourceRef[], notes?: Map<string, string>): Promise<CardEntry[]> {
    const species = await this.speciesMap();
    const byId = new Map<number, CardEntry>();
    await Promise.all(
      refs.map(async (ref) => {
        const pokemonId = idFromUrl(ref.url);
        if (!(pokemonId > 0) || pokemonId > ALT_FORM_ID_THRESHOLD) return;
        let speciesId = species.get(ref.name);
        let speciesName = ref.name;
        if (speciesId == null) {
          // A default form whose name differs from its species (e.g. deoxys-normal).
          const pokemon = await this.api.get<Pokemon>(`pokemon/${pokemonId}`);
          speciesId = idFromUrl(pokemon.species.url);
          speciesName = pokemon.species.name;
        }
        if (!byId.has(speciesId)) {
          byId.set(speciesId, {
            id: speciesId,
            name: speciesName,
            types: [],
            note: notes?.get(ref.name),
          });
        }
      }),
    );
    return [...byId.values()].sort((a, b) => a.id - b.id);
  }
}
