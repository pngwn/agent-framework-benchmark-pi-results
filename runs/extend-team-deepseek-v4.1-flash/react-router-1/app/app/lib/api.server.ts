// Server-side access to the PokeAPI server. Responses are cached in memory for a short
// time so pages stay fast without serving stale data for long.
import { data } from "react-router";
import { englishName, humanize, idFromUrl, type NamedResource, type Translated } from "./format";
import type { Card, TypeInfo } from "./types";

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");
const TTL_MS = 60_000;

const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { expires: Date.now() + TTL_MS, value });
  value.catch(() => cache.delete(key));
  return value;
}

/** Fetches an API path such as `pokemon/25`. Resolves to null on 404. */
export function api<T>(path: string): Promise<T | null> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}/api/v2/${path.replace(/^\//, "")}`;
  return cached(url, async () => {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
    return (await res.json()) as T;
  });
}

/** Like `api`, but throws a 404 response for missing resources. */
export async function apiOr404<T>(path: string): Promise<T> {
  const result = await api<T>(path);
  if (!result) throw data("Not found", { status: 404 });
  return result;
}

export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

type ListResponse = { count: number; results: NamedResource[] };

export type TypeRecord = {
  id: number;
  name: string;
  names: Translated[];
  damage_relations: Record<string, NamedResource[]>;
  pokemon: { slot: number; pokemon: NamedResource }[];
  moves: NamedResource[];
};

type GenerationRecord = {
  id: number;
  name: string;
  names: Translated[];
  pokemon_species: NamedResource[];
};

export type DamageRelations = {
  doubleDamageTo: string[];
  halfDamageTo: string[];
  noDamageTo: string[];
};

export type Index = {
  species: { id: number; name: string; label: string }[];
  speciesById: Map<number, { id: number; name: string; label: string }>;
  speciesByName: Map<string, { id: number; name: string; label: string }>;
  types: TypeInfo[];
  typeLabels: Map<string, string>;
  speciesTypes: Map<number, string[]>;
  damageRelations: Map<string, DamageRelations>;
  generations: { name: string; label: string; speciesIds: Set<number> }[];
};

/** Everything needed to list and filter species, assembled from list, type and generation endpoints. */
export function getIndex(): Promise<Index> {
  return cached("index", async () => {
    const [speciesList, typeList, generationList] = await Promise.all([
      apiOr404<ListResponse>("pokemon-species/?limit=100000"),
      apiOr404<ListResponse>("type/?limit=1000"),
      apiOr404<ListResponse>("generation/?limit=1000"),
    ]);
    const [typeRecords, generationRecords] = await Promise.all([
      Promise.all(
        typeList.results.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => apiOr404<TypeRecord>(t.url)),
      ),
      Promise.all(generationList.results.map((g) => apiOr404<GenerationRecord>(g.url))),
    ]);

    const species = speciesList.results
      .map((s) => ({ id: idFromUrl(s.url), name: s.name, label: humanize(s.name) }))
      .sort((a, b) => a.id - b.id);
    const speciesById = new Map(species.map((s) => [s.id, s]));
    const speciesByName = new Map(species.map((s) => [s.name, s]));

    const slots = new Map<number, { slot: number; type: string }[]>();
    for (const type of typeRecords) {
      for (const { slot, pokemon } of type.pokemon) {
        const id = idFromUrl(pokemon.url);
        if (!speciesById.has(id)) continue;
        if (!slots.has(id)) slots.set(id, []);
        slots.get(id)!.push({ slot, type: type.name });
      }
    }
    const speciesTypes = new Map(
      [...slots].map(([id, list]) => [id, list.sort((a, b) => a.slot - b.slot).map((t) => t.type)]),
    );

    const types = typeRecords.map((t) => ({ name: t.name, label: englishName(t.names, t.name) }));
    const damageRelations = new Map(
      typeRecords.map((t) => [
        t.name,
        {
          doubleDamageTo: (t.damage_relations.double_damage_to ?? []).map((r) => r.name),
          halfDamageTo: (t.damage_relations.half_damage_to ?? []).map((r) => r.name),
          noDamageTo: (t.damage_relations.no_damage_to ?? []).map((r) => r.name),
        },
      ]),
    );
    return {
      species,
      speciesById,
      speciesByName,
      types,
      typeLabels: new Map(types.map((t) => [t.name, t.label])),
      speciesTypes,
      damageRelations,
      generations: generationRecords.map((g) => ({
        name: g.name,
        label: englishName(g.names, g.name),
        speciesIds: new Set(g.pokemon_species.map((s) => idFromUrl(s.url))),
      })),
    };
  });
}

export function speciesCard(index: Index, id: number, withTypes = false): Card | null {
  const species = index.speciesById.get(id);
  if (!species) return null;
  const card: Card = { id, name: species.name, label: species.label, sprite: spriteUrl(id) };
  if (withTypes) {
    card.types = (index.speciesTypes.get(id) ?? []).map((name) => ({
      name,
      label: index.typeLabels.get(name) ?? humanize(name),
    }));
  }
  return card;
}

/**
 * Cards for a list of Pokémon references (as used by types, moves and abilities): alternate
 * forms are left out, each Pokémon is mapped to its species, sorted by dex number.
 */
export function pokemonCards<T extends { url: string }>(
  index: Index,
  refs: T[],
  extra?: (ref: T) => Partial<Card>,
): Card[] {
  const seen = new Map<number, Card>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (id >= 10000 || seen.has(id)) continue;
    const card = speciesCard(index, id);
    if (card) seen.set(id, { ...card, ...extra?.(ref) });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

export function typeInfo(index: Index, name: string): TypeInfo {
  return { name, label: index.typeLabels.get(name) ?? humanize(name) };
}
