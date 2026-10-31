// Server-only PokeAPI client. All data is fetched over HTTP at request time and
// cached in memory for the lifetime of the process.
import {
  englishName,
  humanize,
  idFromUrl,
  dexNumber,
} from "./utils";

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(
  /\/+$/,
  "",
);

export const apiOrigin = API_BASE_URL;

const cache = new Map<string, Promise<any>>();

/** GET a resource by API path, e.g. `pokemon/pikachu` or `type/?limit=100`. Null on 404. */
export function apiGet(path: string): Promise<any> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(`${API_BASE_URL}/api/v2/${path}`).then(async (res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PokeAPI error ${res.status} for ${path}`);
      return res.json();
    });
    cache.set(path, p);
  }
  return p;
}

/** GET a resource by its absolute (or root-relative) API URL. */
export function apiGetByUrl(url: string): Promise<any> {
  const path = url.replace(/^[a-z]+:\/\/[^/]+/i, "").replace(/^\/api\/v2\//, "");
  return apiGet(path);
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------
// Species index

export type SpeciesEntry = { id: number; name: string };
export type SpeciesIndex = {
  list: SpeciesEntry[];
  byId: Map<number, SpeciesEntry>;
  byName: Map<string, SpeciesEntry>;
};

let speciesIndexPromise: Promise<SpeciesIndex> | null = null;
export function getSpeciesIndex(): Promise<SpeciesIndex> {
  speciesIndexPromise ??= apiGet("pokemon-species/?limit=100000").then((data) => {
    const list: SpeciesEntry[] = (data?.results ?? [])
      .map((r: any) => ({ id: idFromUrl(r.url), name: r.name }))
      .filter((e: SpeciesEntry) => Number.isFinite(e.id) && e.id < 10000)
      .sort((a: SpeciesEntry, b: SpeciesEntry) => a.id - b.id);
    return {
      list,
      byId: new Map(list.map((e) => [e.id, e])),
      byName: new Map(list.map((e) => [e.name, e])),
    };
  });
  return speciesIndexPromise;
}

// ---------------------------------------------------------------------------
// Types / generations / version groups

let typesPromise: Promise<any[]> | null = null;
/** The 18 types, in API order. */
export function getTypes(): Promise<any[]> {
  typesPromise ??= apiGet("type/?limit=100").then(async (data) => {
    const refs = (data?.results ?? []).filter(
      (r: any) => !["stellar", "unknown", "shadow"].includes(r.name),
    );
    return mapLimit(refs, 8, (r: any) => apiGetByUrl(r.url));
  });
  return typesPromise;
}

let typeNameMapPromise: Promise<Map<string, string>> | null = null;
/** Map of type API name -> English name (for the 18 types). */
export function getTypeNameMap(): Promise<Map<string, string>> {
  typeNameMapPromise ??= getTypes().then(
    (types) => new Map(types.map((t) => [t.name, englishName(t)])),
  );
  return typeNameMapPromise;
}

export function typeDisplayName(map: Map<string, string>, name: string): string {
  return map.get(name) ?? humanize(name);
}

let generationsPromise: Promise<any[]> | null = null;
export function getGenerations(): Promise<any[]> {
  generationsPromise ??= apiGet("generation/?limit=100").then(async (data) => {
    const refs = data?.results ?? [];
    return mapLimit(refs, 8, (r: any) => apiGetByUrl(r.url));
  });
  return generationsPromise;
}

let versionGroupsPromise: Promise<any[]> | null = null;
export function getVersionGroups(): Promise<any[]> {
  versionGroupsPromise ??= apiGet("version-group/?limit=100").then(async (data) => {
    const refs = data?.results ?? [];
    return mapLimit(refs, 8, (r: any) => apiGetByUrl(r.url));
  });
  return versionGroupsPromise;
}

// ---------------------------------------------------------------------------
// Cards

import type { CardData, PokedexEntry, PokedexIndex } from "./types";

export function makeCard(species: SpeciesEntry, extra?: Partial<CardData>): CardData {
  return {
    id: species.id,
    name: species.name,
    display: humanize(species.name),
    dex: dexNumber(species.id),
    sprite: `${apiOrigin}/media/sprites/pokemon/${species.id}.png`,
    ...extra,
  };
}

/** Map a list of Pokémon references to species cards (alternate forms excluded). */
export async function cardsFromPokemonRefs(
  refs: { url: string }[],
  extraById?: Map<number, Partial<CardData>>,
): Promise<CardData[]> {
  const index = await getSpeciesIndex();
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!Number.isFinite(id) || id >= 10000 || seen.has(id)) continue;
    const species = index.byId.get(id);
    if (!species) continue;
    seen.add(id);
    cards.push(makeCard(species, extraById?.get(id)));
  }
  return cards.sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Home page index: every species with its types and generation

let pokedexPromise: Promise<PokedexIndex> | null = null;
export function getPokedex(): Promise<PokedexIndex> {
  pokedexPromise ??= (async () => {
    const [speciesIndex, types, generations] = await Promise.all([
      getSpeciesIndex(),
      getTypes(),
      getGenerations(),
    ]);

    const typesByPokemonId = new Map<number, string[]>();
    for (const type of types) {
      for (const entry of type.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon.url);
        if (!Number.isFinite(id) || id >= 10000) continue;
        const arr = typesByPokemonId.get(id) ?? [];
        arr[Math.max(0, (entry.slot ?? 1) - 1)] = type.name;
        typesByPokemonId.set(id, arr);
      }
    }

    const generationBySpecies = new Map<string, string>();
    for (const gen of generations) {
      for (const s of gen.pokemon_species ?? []) {
        generationBySpecies.set(s.name, gen.name);
      }
    }

    return {
      pokemon: speciesIndex.list.map((s) => ({
        id: s.id,
        name: s.name,
        display: humanize(s.name),
        types: (typesByPokemonId.get(s.id) ?? []).filter(Boolean),
        generation: generationBySpecies.get(s.name) ?? "",
        sprite: `${apiOrigin}/media/sprites/pokemon/${s.id}.png`,
      })),
      types: types.map((t) => ({ name: t.name, display: englishName(t) })),
      generations: generations.map((g) => ({
        name: g.name,
        display: englishName(g),
      })),
    };
  })();
  return pokedexPromise;
}
