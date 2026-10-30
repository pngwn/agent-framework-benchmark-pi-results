import {
  displayName,
  englishName,
  humanize,
} from "./format";

export const API_BASE_URL = (
  process.env.API_BASE_URL ?? "http://localhost:9000"
).replace(/\/+$/, "");

const promiseCache = new Map<string, Promise<any>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let promise = promiseCache.get(key);
  if (!promise) {
    promise = load().catch((error) => {
      promiseCache.delete(key);
      throw error;
    });
    promiseCache.set(key, promise);
  }
  return promise;
}

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function fetchJson(url: string): Promise<any | null> {
  const response = await fetch(absoluteUrl(url), {
    headers: { accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${url}`);
  }
  return response.json();
}

export function refId(ref: any): number | null {
  const url = typeof ref === "string" ? ref : ref?.url;
  const match = String(url ?? "").match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function getList(resource: string): Promise<any[]> {
  return cached(`list:${resource}`, async () => {
    const data = await fetchJson(`/api/v2/${resource}/?limit=100000`);
    return data?.results ?? [];
  });
}

export function getResource(resource: string, nameOrId: string | number): Promise<any | null> {
  const key = `${resource}:${String(nameOrId).toLowerCase()}`;
  return cached(key, () =>
    fetchJson(`/api/v2/${resource}/${encodeURIComponent(String(nameOrId))}`),
  );
}

export function getByUrl(url: string): Promise<any | null> {
  return cached(`url:${url}`, () => fetchJson(url));
}

export interface SpeciesIndexEntry {
  id: number;
  name: string;
  url: string;
}

export function getSpeciesIndex(): Promise<SpeciesIndexEntry[]> {
  return cached("species-index", async () => {
    const list = await getList("pokemon-species");
    return list
      .map((ref: any) => ({ id: refId(ref), name: ref.name, url: ref.url }))
      .filter((entry: any): entry is SpeciesIndexEntry => entry.id !== null)
      .sort((a: SpeciesIndexEntry, b: SpeciesIndexEntry) => a.id - b.id);
  });
}

export interface SpeciesCard {
  id: number;
  name: string;
  displayName: string;
  sprite: string;
  types?: { name: string; displayName: string }[];
  hidden?: boolean;
}

export function getSpeciesCardMap(): Promise<Map<number, SpeciesCard>> {
  return cached("species-card-map", async () => {
    const species = await getSpeciesIndex();
    const map = new Map<number, SpeciesCard>();
    for (const entry of species) {
      map.set(entry.id, {
        id: entry.id,
        name: entry.name,
        displayName: humanize(entry.name),
        sprite: `${API_BASE_URL}/media/sprites/pokemon/${entry.id}.png`,
      });
    }
    return map;
  });
}

export async function cardsFromRefs(refs: any[] | null | undefined): Promise<SpeciesCard[]> {
  const map = await getSpeciesCardMap();
  const cards = new Map<number, SpeciesCard>();
  for (const ref of refs ?? []) {
    const id = refId(ref);
    if (id === null || id > 10000) continue;
    const card = map.get(id);
    if (card && !cards.has(id)) cards.set(id, card);
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export interface TypeEntry {
  id: number;
  name: string;
  displayName: string;
}

export function getTypeEntries(): Promise<TypeEntry[]> {
  return cached("type-entries", async () => {
    const list = (await getList("type")).filter(
      (entry: any) => !EXCLUDED_TYPES.has(entry.name),
    );
    const records = await Promise.all(
      list.map((entry: any) => getResource("type", entry.name)),
    );
    return list.map((entry: any, index: number) => ({
      id: refId(entry) ?? 0,
      name: entry.name,
      displayName: englishName(records[index]) ?? humanize(entry.name),
    }));
  });
}

export interface GenerationEntry {
  id: number;
  name: string;
  displayName: string;
}

export function getGenerationEntries(): Promise<GenerationEntry[]> {
  return cached("generation-entries", async () => {
    const list = await getList("generation");
    const records = await Promise.all(
      list.map((entry: any) => getResource("generation", entry.name)),
    );
    return list.map((entry: any, index: number) => ({
      id: refId(entry) ?? 0,
      name: entry.name,
      displayName: displayName(records[index]) ?? humanize(entry.name),
    }));
  });
}

export function getTypeDisplayMap(entries: TypeEntry[]): Map<string, string> {
  return new Map(entries.map((entry) => [entry.name, entry.displayName]));
}
