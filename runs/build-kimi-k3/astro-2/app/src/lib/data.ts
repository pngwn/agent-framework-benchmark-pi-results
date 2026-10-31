// Shared data accessors built on top of the API client. Each accessor memoizes
// its promise, so the API is queried at most once per resource per process.

import { getList, getRecord, idFromUrl, pool } from './api';
import { englishName, humanize } from './format';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
// Pokémon IDs from 10000 up are alternate forms, which are out of scope.
export const ALT_FORM_MIN_ID = 10000;

export interface TypeInfo {
  id: number;
  name: string;
  english: string;
}

let typesPromise: Promise<TypeInfo[]> | null = null;

/** The 18 types, in API order, with their English names. */
export function getTypes(): Promise<TypeInfo[]> {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await getList('type');
      const refs = list.results.filter((r: any) => !EXCLUDED_TYPES.has(r.name));
      return pool(refs, 8, async (r: any) => {
        const record = await getRecord('type', r.name);
        return {
          id: record.id,
          name: record.name,
          english: englishName(record.names) ?? humanize(record.name),
        };
      });
    })();
  }
  return typesPromise;
}

export async function getTypeByName(): Promise<Map<string, TypeInfo>> {
  return new Map((await getTypes()).map((t) => [t.name, t]));
}

export interface SpeciesRef {
  id: number;
  name: string;
}

let speciesPromise: Promise<SpeciesRef[]> | null = null;

/** Every species the API lists, in dex order. */
export function getSpeciesIndex(): Promise<SpeciesRef[]> {
  if (!speciesPromise) {
    speciesPromise = getList('pokemon-species').then((list) =>
      list.results.map((r: any) => ({ id: idFromUrl(r.url), name: r.name })),
    );
  }
  return speciesPromise;
}

export interface GenerationInfo {
  id: number;
  name: string;
  english: string;
  speciesIds: Set<number>;
}

let generationsPromise: Promise<GenerationInfo[]> | null = null;

/** The generations, in API order, with the species introduced in each. */
export function getGenerations(): Promise<GenerationInfo[]> {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await getList('generation');
      return pool(list.results, 8, async (r: any) => {
        const record = await getRecord('generation', r.name);
        return {
          id: record.id,
          name: record.name,
          english: englishName(record.names) ?? humanize(record.name),
          speciesIds: new Set<number>(record.pokemon_species.map((s: any) => idFromUrl(s.url))),
        };
      });
    })();
  }
  return generationsPromise;
}

export interface SlotType {
  name: string;
  english: string;
}

let pokemonTypesPromise: Promise<Map<number, SlotType[]>> | null = null;

/**
 * Slot-ordered types of every main-line Pokémon, keyed by Pokémon ID
 * (which equals the species ID for default Pokémon). Reconstructed from the
 * per-type membership lists, which carry each Pokémon's slot for that type.
 */
export function getPokemonTypesById(): Promise<Map<number, SlotType[]>> {
  if (!pokemonTypesPromise) {
    pokemonTypesPromise = (async () => {
      const types = await getTypes();
      const byId = new Map<number, { slot: number; type: SlotType }[]>();
      await pool(types, 8, async (t) => {
        const record = await getRecord('type', t.name);
        for (const entry of record.pokemon) {
          const id = idFromUrl(entry.pokemon.url);
          if (id >= ALT_FORM_MIN_ID) continue;
          let slots = byId.get(id);
          if (!slots) byId.set(id, (slots = []));
          slots.push({ slot: entry.slot, type: { name: t.name, english: t.english } });
        }
      });
      return new Map(
        [...byId].map(([id, slots]) => [
          id,
          slots.sort((a, b) => a.slot - b.slot).map((s) => s.type),
        ]),
      );
    })();
  }
  return pokemonTypesPromise;
}

export interface CardData {
  id: number;
  name: string; // species API name
  types?: SlotType[];
  note?: string;
}

/**
 * Map a list of Pokémon references (as used by move, ability and type data)
 * to species cards: alternate forms are dropped, each species appears once,
 * and cards are ordered by dex number. Pokémon IDs match species IDs for
 * default Pokémon.
 */
export async function speciesCardsFromPokemonRefs(refs: { name: string; url: string }[]): Promise<CardData[]> {
  const species = await getSpeciesIndex();
  const byId = new Map(species.map((s) => [s.id, s]));
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (id >= ALT_FORM_MIN_ID || seen.has(id)) continue;
    const match = byId.get(id);
    if (!match) continue;
    seen.add(id);
    cards.push({ id, name: match.name });
  }
  cards.sort((a, b) => a.id - b.id);
  return cards;
}

export interface HomeEntry extends CardData {
  human: string;
  generation: string | null;
}

let homePromise: Promise<HomeEntry[]> | null = null;

/** Every species with the data needed by the home page list and filters. */
export function getHomeData(): Promise<HomeEntry[]> {
  if (!homePromise) {
    homePromise = (async () => {
      const [species, typesById, generations] = await Promise.all([
        getSpeciesIndex(),
        getPokemonTypesById(),
        getGenerations(),
      ]);
      const generationOf = new Map<number, string>();
      for (const g of generations) {
        for (const id of g.speciesIds) generationOf.set(id, g.name);
      }
      return species.map((s) => ({
        id: s.id,
        name: s.name,
        human: humanize(s.name),
        types: typesById.get(s.id) ?? [],
        generation: generationOf.get(s.id) ?? null,
      }));
    })();
  }
  return homePromise;
}
