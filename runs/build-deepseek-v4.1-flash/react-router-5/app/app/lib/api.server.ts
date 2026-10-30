import {
  EXCLUDED_TYPES,
  englishName,
  humanize,
  idFromUrl,
} from "./format";
import type {
  GenerationInfo,
  NamedRef,
  PokemonCardData,
  SpeciesListItem,
  TypeInfo,
} from "./format";

const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/+$/, "");

export class ApiNotFoundError extends Error {}

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let promise = cache.get(key) as Promise<T> | undefined;
  if (!promise) {
    promise = load().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
  }
  return promise;
}

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE}${url}`;
}

async function fetchJson(path: string): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (response.status === 404) throw new ApiNotFoundError(path);
  if (!response.ok) throw new Error(`API request failed (${response.status}) for ${path}`);
  return response.json();
}

export function getResource(resource: string, nameOrId: string | number): Promise<any> {
  const key = `resource:${resource}/${String(nameOrId).toLowerCase()}`;
  return cached(key, () =>
    fetchJson(`/api/v2/${resource}/${encodeURIComponent(String(nameOrId))}/`),
  );
}

export function getIndex(resource: string): Promise<{ count: number; results: NamedRef[] }> {
  return cached(`index:${resource}`, () => fetchJson(`/api/v2/${resource}/?limit=100000`));
}

export function getAllTypes(): Promise<TypeInfo[]> {
  return cached("all-types", async () => {
    const index = await getIndex("type");
    const references = index.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
    const details = await Promise.all(references.map((entry) => getResource("type", entry.name)));
    return details.map((detail, order) => ({
      name: detail.name,
      label: englishName(detail.names) ?? humanize(detail.name),
      order,
      detail,
    }));
  });
}

export function getAllGenerations(): Promise<GenerationInfo[]> {
  return cached("all-generations", async () => {
    const index = await getIndex("generation");
    const details = await Promise.all(
      index.results.map((entry) => getResource("generation", entry.name)),
    );
    return details
      .map((detail) => ({
        name: detail.name,
        label: englishName(detail.names) ?? humanize(detail.name),
        order: detail.id,
        detail,
      }))
      .sort((a, b) => a.order - b.order);
  });
}

export function getSpeciesList(): Promise<SpeciesListItem[]> {
  return cached("species-list", async () => {
    const index = await getIndex("pokemon-species");
    return index.results
      .map((entry) => {
        const id = idFromUrl(entry.url);
        return {
          id,
          name: entry.name,
          label: humanize(entry.name),
          sprite: mediaUrl(`/media/sprites/pokemon/${id}.png`) ?? "",
        };
      })
      .filter((entry) => entry.id > 0 && entry.id < 10000)
      .sort((a, b) => a.id - b.id);
  });
}

export function getHomeData() {
  return cached("home-data", async () => {
    const [speciesIndex, types, generations] = await Promise.all([
      getIndex("pokemon-species"),
      getAllTypes(),
      getAllGenerations(),
    ]);

    const typesById = new Map<number, { name: string; label: string; slot: number }[]>();
    for (const type of types) {
      for (const entry of type.detail.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon.url);
        if (id <= 0 || id >= 10000) continue;
        const values = typesById.get(id) ?? [];
        values.push({ name: type.name, label: type.label, slot: entry.slot ?? 0 });
        typesById.set(id, values);
      }
    }
    for (const values of typesById.values()) {
      values.sort((a, b) => a.slot - b.slot || a.name.localeCompare(b.name));
    }

    const generationBySpecies = new Map<string, string>();
    for (const generation of generations) {
      for (const entry of generation.detail.pokemon_species ?? []) {
        generationBySpecies.set(entry.name, generation.name);
      }
    }

    const species = speciesIndex.results
      .map((entry) => {
        const id = idFromUrl(entry.url);
        return {
          id,
          name: entry.name,
          label: humanize(entry.name),
          sprite: mediaUrl(`/media/sprites/pokemon/${id}.png`) ?? "",
          types: typesById.get(id) ?? [],
          generation: generationBySpecies.get(entry.name) ?? "",
        };
      })
      .filter((entry) => entry.id > 0 && entry.id < 10000)
      .sort((a, b) => a.id - b.id);

    return {
      species,
      types: types.map((type) => ({ name: type.name, label: type.label })),
      generations: generations.map((generation) => ({
        name: generation.name,
        label: generation.label,
      })),
    };
  });
}

export function speciesFromPokemonRefs(refs: NamedRef[] | undefined | null): Promise<PokemonCardData[]> {
  return getSpeciesList().then((species) => {
    const byId = new Map(species.map((entry) => [entry.id, entry]));
    const seen = new Set<number>();
    const cards: PokemonCardData[] = [];
    for (const ref of refs ?? []) {
      const id = idFromUrl(ref.url);
      if (id <= 0 || id >= 10000 || seen.has(id)) continue;
      const found = byId.get(id);
      if (!found) continue;
      seen.add(id);
      cards.push(found);
    }
    return cards.sort((a, b) => a.id - b.id);
  });
}
