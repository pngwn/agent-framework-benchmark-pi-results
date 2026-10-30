/* Server-side data access for the Pokédex.
 *
 * All data is fetched from the PokeAPI server over HTTP at request time. Responses
 * are cached in memory for the lifetime of the server process, which keeps the
 * large species catalogue cheap after the first request while still reflecting
 * whatever live data the API served when it was read.
 */

type ApiRef = { name: string; url: string };
type LanguageName = { name: string; language: { name: string } };

export type TypeOption = { name: string; label: string; record: any };
export type GenerationOption = { name: string; label: string; order: number; species: string[] };
export type VersionGroup = { name: string; label: string; order: number; id: number };

export type HomeEntry = {
  id: number;
  name: string;
  displayName: string;
  types: string[];
  generation: string | null;
  sprite: string | null;
};

export type HomeCatalog = {
  entries: HomeEntry[];
  types: { name: string; label: string }[];
  generations: { name: string; label: string }[];
};

export type SpeciesCard = { id: number; name: string; hidden: boolean; sprite: string | null };

type SpeciesIndex = {
  all: { id: number; name: string }[];
  byId: Map<number, { id: number; name: string }>;
  byName: Map<string, { id: number; name: string }>;
};

type Store = {
  promises: Map<string, Promise<unknown>>;
  catalog?: Promise<HomeCatalog>;
  speciesIndex?: Promise<SpeciesIndex>;
  types?: Promise<TypeOption[]>;
  generations?: Promise<GenerationOption[]>;
  versionGroups?: Promise<VersionGroup[]>;
};

const globals = globalThis as unknown as { __pokedexStore?: Store };
const store: Store = (globals.__pokedexStore ??= { promises: new Map() });
if (!store.promises) store.promises = new Map();

function apiBase(): string {
  const env = (globalThis as any).process?.env;
  const configured = env?.API_BASE_URL;
  return (typeof configured === "string" && configured.length ? configured : "http://localhost:9000").replace(/\/$/, "");
}

function apiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return apiBase() + pathOrUrl;
  return `${apiBase()}/api/v2/${pathOrUrl.replace(/^\//, "")}`;
}

async function fetchJson<T = any>(pathOrUrl: string): Promise<T | null> {
  const url = apiUrl(pathOrUrl);
  const existing = store.promises.get(url);
  if (existing) return existing as Promise<T | null>;

  const promise = (async () => {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      return null;
    }
  })();
  store.promises.set(url, promise);
  return promise;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  };
  const workers = Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function humanize(name: string): string {
  return name
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export function englishName(record: any): string {
  const name = record?.names?.find((entry: LanguageName) => entry.language?.name === "en")?.name;
  return typeof name === "string" && name.length ? name : humanize(String(record?.name ?? ""));
}

export function latestEnglishFlavor(record: any): string {
  const entries = (record?.flavor_text_entries ?? []).filter(
    (entry: any) => entry.language?.name === "en" && typeof entry.flavor_text === "string",
  );
  const latest = entries[entries.length - 1];
  return latest ? latest.flavor_text.replace(/\s+/g, " ").trim() : "";
}

export function idFromUrl(url: string | undefined | null): number | null {
  if (!url) return null;
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function nameFromUrl(url: string | undefined | null): string {
  if (!url) return "";
  const parts = String(url).split("?")[0].replace(/\/$/, "").split("/");
  return parts[parts.length - 1] ?? "";
}

export function displayDex(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function formatValue(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export async function getSpeciesIndex(): Promise<SpeciesIndex> {
  if (!store.speciesIndex) {
    store.speciesIndex = (async () => {
      const list = await fetchJson<any>("/api/v2/pokemon-species?limit=100000");
      const all = ((list?.results ?? []) as ApiRef[])
        .map((entry) => {
          const id = idFromUrl(entry.url);
          return id ? { id, name: entry.name } : null;
        })
        .filter((entry): entry is { id: number; name: string } => entry !== null)
        .sort((a, b) => a.id - b.id);
      const byId = new Map<number, { id: number; name: string }>();
      const byName = new Map<string, { id: number; name: string }>();
      for (const entry of all) {
        byId.set(entry.id, entry);
        byName.set(entry.name.toLowerCase(), entry);
      }
      return { all, byId, byName };
    })();
  }
  return store.speciesIndex;
}

export async function getGenerations(): Promise<GenerationOption[]> {
  if (!store.generations) {
    store.generations = (async () => {
      const list = await fetchJson<any>("/api/v2/generation?limit=100");
      const results = (list?.results ?? []) as ApiRef[];
      const details = await Promise.all(results.map((entry) => fetchJson<any>(entry.url)));
      return details
        .map((detail, index) => {
          if (!detail) return null;
          return {
            name: String(detail.name),
            label: englishName(detail),
            order: index + 1,
            species: (detail.pokemon_species ?? []).map((entry: ApiRef) => entry.name),
          };
        })
        .filter((entry): entry is GenerationOption => entry !== null);
    })();
  }
  return store.generations;
}

export async function getTypes(): Promise<TypeOption[]> {
  if (!store.types) {
    store.types = (async () => {
      const list = await fetchJson<any>("/api/v2/type?limit=100");
      const excluded = new Set(["stellar", "unknown", "shadow"]);
      const refs = ((list?.results ?? []) as ApiRef[]).filter((entry) => !excluded.has(entry.name));
      const records = await Promise.all(refs.map((entry) => fetchJson<any>(entry.url)));
      return records
        .map((record, index) => {
          if (!record) return null;
          const name = String(record.name ?? refs[index].name);
          return { name, label: englishName(record), record };
        })
        .filter((entry): entry is TypeOption => entry !== null);
    })();
  }
  return store.types;
}

export async function getTypeLabelMap(): Promise<Map<string, string>> {
  const types = await getTypes();
  return new Map(types.map((entry) => [entry.name, entry.label]));
}

export async function getVersionGroups(): Promise<VersionGroup[]> {
  if (!store.versionGroups) {
    store.versionGroups = (async () => {
      const list = await fetchJson<any>("/api/v2/version-group?limit=100");
      const refs = (list?.results ?? []) as ApiRef[];
      const records = await Promise.all(refs.map((entry) => fetchJson<any>(entry.url)));
      return records
        .map((record, index) => {
          if (!record) return null;
          const name = String(record.name ?? refs[index].name);
          return {
            name,
            id: Number(record.id ?? 0),
            label: humanize(name),
            order: Number(record.order ?? record.id ?? 0),
          };
        })
        .filter((entry): entry is VersionGroup => entry !== null)
        .sort((a, b) => a.order - b.order || a.id - b.id);
    })();
  }
  return store.versionGroups;
}

export async function getHomeCatalog(): Promise<HomeCatalog> {
  if (!store.catalog) {
    store.catalog = (async () => {
      const [species, generations, types] = await Promise.all([
        getSpeciesIndex(),
        getGenerations(),
        getTypes(),
      ]);
      const generationBySpecies = new Map<string, string>();
      for (const generation of generations) {
        for (const name of generation.species) generationBySpecies.set(name, generation.name);
      }

      const pokemon = await mapLimit(species.all, 64, (entry) => fetchJson<any>(`/api/v2/pokemon/${entry.id}`));
      const entries: HomeEntry[] = species.all.map((entry, index) => {
        const record = pokemon[index];
        const typeNames = (record?.types ?? [])
          .slice()
          .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
          .map((slot: any) => String(slot.type?.name ?? ""))
          .filter(Boolean);
        return {
          id: entry.id,
          name: entry.name,
          displayName: humanize(entry.name),
          types: typeNames,
          generation: generationBySpecies.get(entry.name) ?? null,
          sprite: record?.sprites?.front_default ?? null,
        };
      });

      return {
        entries,
        types: types.map((entry) => ({ name: entry.name, label: entry.label })),
        generations: generations.map((entry) => ({ name: entry.name, label: entry.label })),
      };
    })();
  }
  return store.catalog;
}

export async function speciesCardsFromRefs(
  refs: ApiRef[] | undefined,
  hiddenBySpecies?: Map<number, boolean>,
): Promise<SpeciesCard[]> {
  const index = await getSpeciesIndex();
  const byId = new Map<number, SpeciesCard>();
  for (const ref of refs ?? []) {
    const id = idFromUrl(ref.url);
    if (!id || id >= 10000) continue;
    const species = index.byId.get(id);
    if (!species) continue;
    const hidden = hiddenBySpecies?.get(id) === true;
    const existing = byId.get(id);
    if (existing) existing.hidden = existing.hidden || hidden;
    else byId.set(id, { id, name: species.name, hidden, sprite: null });
  }
  const cards = [...byId.values()].sort((a, b) => a.id - b.id);
  const records = await mapLimit(cards, 48, (card) => fetchJson<any>(`/api/v2/pokemon/${card.id}`));
  cards.forEach((card, index) => {
    card.sprite = records[index]?.sprites?.front_default ?? null;
  });
  return cards;
}

export async function getSpeciesByName(name: string): Promise<any | null> {
  return fetchJson<any>(`/api/v2/pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
}

export async function getPokemonByUrlOrId(url: string | undefined, id: number): Promise<any | null> {
  if (url) return fetchJson<any>(url);
  return fetchJson<any>(`/api/v2/pokemon/${id}`);
}

export async function getRecord(resource: string, name: string): Promise<any | null> {
  return fetchJson<any>(`/api/v2/${resource}/${encodeURIComponent(name.toLowerCase())}`);
}

export async function getEvolutionChain(url: string | undefined): Promise<any | null> {
  return url ? fetchJson<any>(url) : null;
}

export async function getMoveDetails(names: string[]): Promise<Map<string, any>> {
  const unique = [...new Set(names)];
  const records = await mapLimit(unique, 48, (name) => fetchJson<any>(`/api/v2/move/${encodeURIComponent(name)}`));
  const map = new Map<string, any>();
  unique.forEach((name, index) => {
    if (records[index]) map.set(name, records[index]);
  });
  return map;
}

export function refName(ref: ApiRef | undefined): string {
  return ref?.name || nameFromUrl(ref?.url);
}

export function typeLabelFor(typeNames: Map<string, string>, name: string): string {
  return typeNames.get(name) ?? humanize(name);
}

export function parseHomeQuery(url: URL): { q: string; type: string; generation: string; page: number } {
  const pageNumber = Number(url.searchParams.get("page"));
  return {
    q: url.searchParams.get("q") ?? "",
    type: url.searchParams.get("type") ?? "",
    generation: url.searchParams.get("generation") ?? "",
    page: Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.floor(pageNumber) : 1,
  };
}
