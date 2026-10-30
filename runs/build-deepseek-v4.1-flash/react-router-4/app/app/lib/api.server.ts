import { englishName, humanize, idFromUrl } from "./format";

type ApiError = Error & { status?: number };

const globalForCache = globalThis as typeof globalThis & {
  __pokedexApiCache?: Map<string, Promise<unknown>>;
};

const cache = (globalForCache.__pokedexApiCache ??= new Map<string, Promise<unknown>>());

export function apiBaseUrl(): string {
  return (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/$/, "");
}

export async function fetchApi(pathOrUrl: string): Promise<any> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${apiBaseUrl()}${pathOrUrl}`;
  const key = url.startsWith(apiBaseUrl()) ? url.slice(apiBaseUrl().length) : url;
  let request = cache.get(key) as Promise<any> | undefined;
  if (!request) {
    request = fetch(url, { headers: { Accept: "application/json" } }).then(async (response) => {
      if (!response.ok) {
        const error: ApiError = new Error(`API request failed: ${response.status} ${url}`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    });
    cache.set(key, request);
    request.catch(() => cache.delete(key));
  }
  return request;
}

export function spriteUrl(id: number): string {
  return `${apiBaseUrl()}/media/sprites/pokemon/${id}.png`;
}

export type SpeciesEntry = {
  id: number;
  name: string;
  humanized: string;
  spriteUrl: string;
};

let speciesListPromise: Promise<{ byId: Map<number, SpeciesEntry>; list: SpeciesEntry[] }> | undefined;

export function getSpeciesList() {
  if (!speciesListPromise) {
    speciesListPromise = (async () => {
      const response = await fetchApi("/api/v2/pokemon-species?limit=100000");
      const list: SpeciesEntry[] = (response.results ?? [])
        .map((entry: { name: string; url: string }) => {
          const id = idFromUrl(entry.url);
          return {
            id,
            name: entry.name,
            humanized: humanize(entry.name),
            spriteUrl: spriteUrl(id),
          };
        })
        .filter((entry: SpeciesEntry) => entry.id > 0)
        .sort((a: SpeciesEntry, b: SpeciesEntry) => a.id - b.id);
      const byId = new Map<number, SpeciesEntry>(list.map((entry) => [entry.id, entry]));
      return { byId, list };
    })();
  }
  return speciesListPromise;
}

export async function getSpeciesMap(): Promise<Map<number, SpeciesEntry>> {
  return (await getSpeciesList()).byId;
}

export type TypeEntry = { id: number; name: string; label: string };

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

let typesListPromise: Promise<TypeEntry[]> | undefined;

export function getTypesList() {
  if (!typesListPromise) {
    typesListPromise = (async () => {
      const response = await fetchApi("/api/v2/type?limit=100000");
      return (response.results ?? [])
        .filter((entry: { name: string }) => !EXCLUDED_TYPES.has(entry.name))
        .map((entry: { name: string; url: string }): TypeEntry => {
          const id = idFromUrl(entry.url);
          return { id, name: entry.name, label: humanize(entry.name) };
        });
    })();
  }
  return typesListPromise;
}

export type PokedexIndex = {
  species: Array<
    SpeciesEntry & {
      types: string[];
      generation: string | null;
    }
  >;
  types: TypeEntry[];
  generations: Array<{ id: number; name: string; label: string }>;
};

let indexPromise: Promise<PokedexIndex> | undefined;

export function getPokedexIndex() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const [{ list: species }, types] = await Promise.all([getSpeciesList(), getTypesList()]);
      const [typeDetails, generationList] = await Promise.all([
        Promise.all(types.map((type) => fetchApi(`/api/v2/type/${type.name}`))),
        fetchApi("/api/v2/generation?limit=100000"),
      ]);
      const generationDetails = await Promise.all(
        (generationList.results ?? []).map((entry: { url: string }) => fetchApi(entry.url)),
      );
      generationDetails.sort((a: any, b: any) => a.id - b.id);

      const speciesIds = new Set(species.map((entry) => entry.id));
      const generationBySpecies = new Map<number, string>();
      for (const generation of generationDetails) {
        for (const ref of generation.pokemon_species ?? []) {
          generationBySpecies.set(idFromUrl(ref.url), generation.name);
        }
      }

      const typesBySpecies = new Map<number, Array<{ name: string; slot: number }>>();
      for (const typeDetail of typeDetails) {
        for (const entry of typeDetail.pokemon ?? []) {
          const id = idFromUrl(entry.pokemon.url);
          if (id >= 10000 || !speciesIds.has(id)) continue;
          const current = typesBySpecies.get(id) ?? [];
          current.push({ name: typeDetail.name, slot: entry.slot });
          typesBySpecies.set(id, current);
        }
      }

      return {
        species: species.map((entry) => ({
          ...entry,
          types: (typesBySpecies.get(entry.id) ?? [])
            .sort((a, b) => a.slot - b.slot)
            .map((type) => type.name),
          generation: generationBySpecies.get(entry.id) ?? null,
        })),
        types,
        generations: generationDetails.map((generation: any) => ({
          id: generation.id,
          name: generation.name,
          label: englishName(generation.names) ?? humanize(generation.name),
        })),
      } satisfies PokedexIndex;
    })();
  }
  return indexPromise;
}
