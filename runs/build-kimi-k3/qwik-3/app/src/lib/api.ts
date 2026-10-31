/**
 * Server-side PokeAPI client. All data is fetched over HTTP at request time;
 * responses are cached in memory for the lifetime of the process.
 */
import { englishName, humanize, idFromUrl } from "./format";

const cache = new Map<string, Promise<any>>();

export function apiBase(): string {
  const env =
    typeof process !== "undefined" ? process.env?.API_BASE_URL : undefined;
  return (env || "http://localhost:9000").replace(/\/+$/, "");
}

export function spriteBase(): string {
  return `${apiBase()}/media/sprites/pokemon`;
}

/** Fetch a PokeAPI resource, by path (`"pokemon/25"`) or absolute URL. Returns null on 404. */
export function apiFetch(pathOrUrl: string): Promise<any> {
  const url = /^https?:\/\//.test(pathOrUrl)
    ? pathOrUrl
    : `${apiBase()}/api/v2/${pathOrUrl.replace(/^\/+|\/+$/g, "")}/`;
  let promise = cache.get(url);
  if (!promise) {
    promise = fetch(url).then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API request failed: ${url} -> ${res.status}`);
      return res.json();
    });
    cache.set(url, promise);
    // Don't cache transport/5xx failures so a later request can retry.
    promise.catch(() => {
      if (cache.get(url) === promise) cache.delete(url);
    });
  }
  return promise;
}

export interface SpeciesRef {
  id: number;
  name: string;
}

let speciesListPromise: Promise<SpeciesRef[]> | null = null;

/** Every species the API lists, ordered by dex number. */
export function getSpeciesList(): Promise<SpeciesRef[]> {
  return (speciesListPromise ??= apiFetch("pokemon-species/?limit=100000").then(
    (data) =>
      (data?.results ?? [])
        .map((r: any) => ({ id: idFromUrl(r.url), name: String(r.name) }))
        .filter((s: SpeciesRef) => Number.isFinite(s.id) && s.id < 10000)
        .sort((a: SpeciesRef, b: SpeciesRef) => a.id - b.id),
  ));
}

let speciesNameByIdPromise: Promise<Map<number, string>> | null = null;

export function getSpeciesNameById(): Promise<Map<number, string>> {
  return (speciesNameByIdPromise ??= getSpeciesList().then(
    (list) => new Map(list.map((s) => [s.id, s.name])),
  ));
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export interface TypeInfo {
  name: string;
  label: string;
  record: any;
}

let typesPromise: Promise<TypeInfo[]> | null = null;

/** The 18 types, in API order, with their English names and full records. */
export function getTypes(): Promise<TypeInfo[]> {
  return (typesPromise ??= apiFetch("type/?limit=100").then(async (list) => {
    const names = (list?.results ?? [])
      .map((r: any) => String(r.name))
      .filter((n: string) => !EXCLUDED_TYPES.has(n));
    const records = await Promise.all(
      names.map((n: string) => apiFetch(`type/${n}/`)),
    );
    return records.filter(Boolean).map((t: any) => ({
      name: String(t.name),
      label: englishName(t.names) ?? humanize(t.name),
      record: t,
    }));
  }));
}

export function typeLabel(types: TypeInfo[], name: string): string {
  return types.find((t) => t.name === name)?.label ?? humanize(name);
}

export interface GenerationInfo {
  name: string;
  label: string;
  species: string[];
}

let generationsPromise: Promise<GenerationInfo[]> | null = null;

/** All generations, ordered by id, with the species introduced in each. */
export function getGenerations(): Promise<GenerationInfo[]> {
  return (generationsPromise ??= apiFetch("generation/?limit=100").then(
    async (list) => {
      const records = await Promise.all(
        (list?.results ?? []).map((r: any) => apiFetch(`generation/${r.name}/`)),
      );
      return records
        .filter(Boolean)
        .sort((a: any, b: any) => a.id - b.id)
        .map((g: any) => ({
          name: String(g.name),
          label: englishName(g.names) ?? humanize(g.name),
          species: (g.pokemon_species ?? []).map((s: any) => String(s.name)),
        }));
    },
  ));
}

export interface VersionGroupInfo {
  name: string;
  order: number;
}

let versionGroupsPromise: Promise<VersionGroupInfo[]> | null = null;

export function getVersionGroups(): Promise<VersionGroupInfo[]> {
  return (versionGroupsPromise ??= apiFetch("version-group/?limit=100").then(
    async (list) => {
      const records = await Promise.all(
        (list?.results ?? []).map((r: any) =>
          apiFetch(`version-group/${r.name}/`),
        ),
      );
      return records
        .filter(Boolean)
        .map((g: any) => ({ name: String(g.name), order: Number(g.order) }));
    },
  ));
}

/**
 * Map a list of Pokémon references to species cards: alternate forms are
 * excluded, each species appears once, ordered by dex number.
 */
export function toSpeciesCards(
  refs: { name: string; url: string }[],
  speciesNames: Map<number, string>,
): SpeciesRef[] {
  const seen = new Set<number>();
  const out: SpeciesRef[] = [];
  for (const ref of refs ?? []) {
    const id = idFromUrl(ref.url);
    if (!Number.isFinite(id) || id >= 10000 || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: speciesNames.get(id) ?? ref.name });
  }
  return out.sort((a, b) => a.id - b.id);
}
