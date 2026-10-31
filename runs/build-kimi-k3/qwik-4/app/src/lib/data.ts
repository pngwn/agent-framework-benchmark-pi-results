// Shared server-side data access built on the cached API client.

import { api } from './api';
import { englishName, humanize, idFromUrl, isDefaultPokemonId, spriteUrlForId } from './util';

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export interface TypeInfo {
  name: string;
  label: string;
}

export interface CardData {
  id: number;
  /** species API name */
  name: string;
  /** humanized species name */
  label: string;
  sprite: string;
  types?: TypeInfo[];
  hiddenAbility?: boolean;
}

let speciesListP: Promise<{ id: number; name: string }[]> | null = null;
/** Every species (id + API name), ordered by dex number. */
export function getSpeciesList() {
  if (!speciesListP) {
    speciesListP = api('pokemon-species?limit=100000').then((data) =>
      (data?.results ?? [])
        .map((r: any) => ({ id: idFromUrl(r.url), name: r.name as string }))
        .sort((a: { id: number; name: string }, b: { id: number; name: string }) => a.id - b.id),
    );
  }
  return speciesListP;
}

export async function getSpeciesNameById(): Promise<Map<number, string>> {
  const list = await getSpeciesList();
  return new Map(list.map((s) => [s.id, s.name]));
}

let typesP: Promise<TypeInfo[]> | null = null;
/** The 18 types in API order, with English labels. */
export function getTypes(): Promise<TypeInfo[]> {
  if (!typesP) {
    typesP = (async () => {
      const list = await api('type?limit=100');
      const entries: any[] = (list?.results ?? []).filter((r: any) => !EXCLUDED_TYPES.has(r.name));
      const records = await Promise.all(entries.map((r: any) => api(`type/${r.name}`)));
      return entries.map((r, i) => ({
        name: r.name as string,
        label: englishName(records[i]?.names) ?? humanize(r.name),
      }));
    })();
  }
  return typesP;
}

let typeRecordP = new Map<string, Promise<any>>();
/** Full type record (damage relations, pokemon, moves). */
export function getTypeRecord(name: string): Promise<any> {
  let p = typeRecordP.get(name);
  if (!p) {
    p = api(`type/${name}`);
    typeRecordP.set(name, p);
  }
  return p;
}

let speciesTypeMapP: Promise<Map<number, TypeInfo[]>> | null = null;
/** Species id -> its default Pokémon's types in slot order. */
export function getSpeciesTypeMap(): Promise<Map<number, TypeInfo[]>> {
  if (!speciesTypeMapP) {
    speciesTypeMapP = (async () => {
      const types = await getTypes();
      const byId = new Map<number, { name: string; label: string; slot: number }[]>();
      for (const t of types) {
        const record = await getTypeRecord(t.name);
        for (const entry of record?.pokemon ?? []) {
          const id = idFromUrl(entry.pokemon.url);
          if (!isDefaultPokemonId(id)) continue;
          const arr = byId.get(id) ?? [];
          arr.push({ name: t.name, label: t.label, slot: entry.slot });
          byId.set(id, arr);
        }
      }
      const out = new Map<number, TypeInfo[]>();
      for (const [id, arr] of byId) {
        arr.sort((a, b) => a.slot - b.slot);
        out.set(id, arr.map(({ name, label }) => ({ name, label })));
      }
      return out;
    })();
  }
  return speciesTypeMapP;
}

export interface GenerationInfo {
  name: string;
  label: string;
}

let generationsP: Promise<GenerationInfo[]> | null = null;
/** Generations in API order with English labels ("Generation I"). */
export function getGenerations(): Promise<GenerationInfo[]> {
  if (!generationsP) {
    generationsP = (async () => {
      const list = await api('generation?limit=100');
      const entries: any[] = list?.results ?? [];
      const records = await Promise.all(entries.map((r: any) => api(`generation/${r.name}`)));
      return entries.map((r, i) => ({
        name: r.name as string,
        label: englishName(records[i]?.names) ?? humanize(r.name),
      }));
    })();
  }
  return generationsP;
}

let speciesGenMapP: Promise<Map<string, string>> | null = null;
/** Species API name -> generation API name it was introduced in. */
export function getSpeciesGenerationMap(): Promise<Map<string, string>> {
  if (!speciesGenMapP) {
    speciesGenMapP = (async () => {
      const gens = await getGenerations();
      const map = new Map<string, string>();
      for (const g of gens) {
        const record = await api(`generation/${g.name}`);
        for (const s of record?.pokemon_species ?? []) {
          map.set(s.name, g.name);
        }
      }
      return map;
    })();
  }
  return speciesGenMapP;
}

/** Build a Pokémon card for a species. */
export function cardForSpecies(id: number, name: string, types?: TypeInfo[]): CardData {
  return {
    id,
    name,
    label: humanize(name),
    sprite: spriteUrlForId(API_BASE, id),
    types,
  };
}

/** Cards for a list of Pokémon references (data refers to Pokémon, cards to
 *  species): alternate forms excluded, mapped to their species, deduped and
 *  ordered by dex number. */
export async function cardsForPokemonRefs(
  refs: readonly { name: string; url: string }[],
  hiddenById?: Map<number, boolean>,
): Promise<CardData[]> {
  const speciesNames = await getSpeciesNameById();
  const typeMap = await getSpeciesTypeMap();
  const seen = new Map<number, CardData>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!isDefaultPokemonId(id)) continue;
    const speciesName = speciesNames.get(id);
    if (!speciesName || seen.has(id)) continue;
    const card = cardForSpecies(id, speciesName);
    const hidden = hiddenById?.get(id);
    if (hidden) card.hiddenAbility = true;
    seen.set(id, card);
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}
