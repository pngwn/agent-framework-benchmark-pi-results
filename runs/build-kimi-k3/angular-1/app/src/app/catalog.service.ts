import { inject, Injectable } from '@angular/core';
import { PokeApi } from './pokeapi.service';
import { englishName, humanize, idFromUrl, NamedResource } from './util';

export interface TypeRef {
  /** API name, e.g. "fire" */
  name: string;
  /** English name, e.g. "Fire" */
  english: string;
}

export interface SpeciesSummary {
  /** Species (dex) id. */
  id: number;
  /** Species API name, e.g. "mr-mime". */
  name: string;
  /** Humanized species name, e.g. "Mr Mime". */
  humanName: string;
  /** Generation API name, e.g. "generation-i". */
  generation: string;
  /** Types of the species' default Pokémon, in slot order. */
  types: TypeRef[];
}

export interface GenerationRef {
  name: string;
  english: string;
}

export interface Catalog {
  species: SpeciesSummary[];
  /** The 18 types, in API order. */
  types: TypeRef[];
  generations: GenerationRef[];
  /** species id -> species API name */
  speciesNameById: Map<number, string>;
  /** type API name -> English name */
  typeEnglishByName: Map<string, string>;
}

/** Types excluded from the app. */
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

interface ListResponse {
  count: number;
  results: NamedResource[];
}

interface TypeResource {
  name: string;
  names?: { name: string; language: NamedResource }[];
  pokemon: { slot: number; pokemon: NamedResource }[];
}

interface GenerationResource {
  name: string;
  names?: { name: string; language: NamedResource }[];
  pokemon_species: NamedResource[];
}

/**
 * Builds (once) the catalog of species with their types and generations,
 * derived from the type and generation resources so no per-species requests
 * are needed.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(PokeApi);
  private catalogPromise: Promise<Catalog> | null = null;

  catalog(): Promise<Catalog> {
    return (this.catalogPromise ??= this.load());
  }

  private async load(): Promise<Catalog> {
    const [speciesList, typeList, generationList] = await Promise.all([
      this.api.get<ListResponse>('pokemon-species?limit=100000'),
      this.api.get<ListResponse>('type?limit=100'),
      this.api.get<ListResponse>('generation?limit=100'),
    ]);

    const typeNames = typeList.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
    const [types, generations] = await Promise.all([
      Promise.all(typeNames.map((n) => this.api.get<TypeResource>(`type/${n}`))),
      Promise.all(generationList.results.map((r) => this.api.get<GenerationResource>(`generation/${r.name}`))),
    ]);

    const typeEnglishByName = new Map<string, string>();
    for (const t of types) typeEnglishByName.set(t.name, englishName(t));

    // species id -> types in slot order (from the type resources' pokemon lists)
    const typesBySpecies = new Map<number, { slot: number; type: string }[]>();
    for (const t of types) {
      for (const entry of t.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        // Alternate forms (ids >= 10000) are out of scope; for ids below that,
        // the default Pokémon's id equals the species id.
        if (!Number.isFinite(id) || id >= 10000) continue;
        const list = typesBySpecies.get(id) ?? [];
        list.push({ slot: entry.slot, type: t.name });
        typesBySpecies.set(id, list);
      }
    }

    const generationBySpecies = new Map<number, string>();
    for (const g of generations) {
      for (const s of g.pokemon_species) {
        generationBySpecies.set(idFromUrl(s.url), g.name);
      }
    }

    const speciesNameById = new Map<number, string>();
    const species: SpeciesSummary[] = [];
    for (const r of speciesList.results) {
      const id = idFromUrl(r.url);
      speciesNameById.set(id, r.name);
      const typeEntries = (typesBySpecies.get(id) ?? []).sort((a, b) => a.slot - b.slot);
      species.push({
        id,
        name: r.name,
        humanName: humanize(r.name),
        generation: generationBySpecies.get(id) ?? '',
        types: typeEntries.map((t) => ({ name: t.type, english: typeEnglishByName.get(t.type) ?? humanize(t.type) })),
      });
    }
    species.sort((a, b) => a.id - b.id);

    return {
      species,
      types: typeNames.map((n) => ({ name: n, english: typeEnglishByName.get(n) ?? humanize(n) })),
      generations: generations.map((g) => ({ name: g.name, english: englishName(g) })),
      speciesNameById,
      typeEnglishByName,
    };
  }
}

/** Card data for lists of Pokémon. */
export interface PokemonCardData {
  id: number;
  /** species API name (used in the link) */
  name: string;
  humanName: string;
  types: TypeRef[];
  /** Shown on ability pages for hidden abilities. */
  hidden?: boolean;
}

/**
 * Maps a list of Pokémon resource references to species cards: drops
 * alternate forms, maps to the species, dedupes and orders by dex number.
 */
export function pokemonRefsToCards(
  refs: NamedResource[],
  catalog: Catalog,
  extra?: (pokemonName: string) => Partial<PokemonCardData> | undefined,
): PokemonCardData[] {
  const bySpecies = new Map<number, PokemonCardData>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!Number.isFinite(id) || id >= 10000) continue;
    const speciesName = catalog.speciesNameById.get(id);
    if (!speciesName) continue;
    const flags = extra?.(ref.name);
    const existing = bySpecies.get(id);
    if (existing) {
      if (flags?.hidden) existing.hidden = true;
      continue;
    }
    bySpecies.set(id, {
      id,
      name: speciesName,
      humanName: humanize(speciesName),
      types: [],
      ...flags,
    });
  }
  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}
