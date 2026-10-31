// Server-side client for the local PokeAPI. All data is fetched over HTTP at
// request time; responses are cached in memory for the lifetime of the process.

const BASE = (
  (typeof process !== "undefined" && process.env && process.env.API_BASE_URL) ||
  "http://localhost:9000"
).replace(/\/$/, "");
const API = `${BASE}/api/v2`;

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)![1]);

const recordCache = new Map<string, Promise<any>>();

export function apiRecord(path: string): Promise<any | null> {
  let p = recordCache.get(path);
  if (!p) {
    p = fetch(`${API}${path}`).then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API request failed: ${path} -> ${res.status}`);
      return res.json();
    });
    p.catch(() => {});
    recordCache.set(path, p);
  }
  return p;
}

const CONCURRENCY = 64;

export async function apiRecordAll(paths: string[]): Promise<(any | null)[]> {
  const out = new Array(paths.length);
  let next = 0;
  async function worker() {
    while (next < paths.length) {
      const i = next++;
      out[i] = await apiRecord(paths[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, paths.length) }, () => worker()),
  );
  return out;
}

export interface SpeciesEntry {
  id: number;
  name: string;
  generation: string;
  types: string[];
  sprite: string | null;
}

let speciesIndexPromise: Promise<SpeciesEntry[]> | null = null;

export function getSpeciesIndex(): Promise<SpeciesEntry[]> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = buildSpeciesIndex();
    speciesIndexPromise.catch(() => {
      speciesIndexPromise = null;
    });
  }
  return speciesIndexPromise;
}

async function buildSpeciesIndex(): Promise<SpeciesEntry[]> {
  const list = await apiRecord("/pokemon-species/?limit=10000");
  const refs = (list.results as { name: string; url: string }[]).map((r) => ({
    name: r.name,
    id: idFromUrl(r.url),
  }));
  const speciesRecs = await apiRecordAll(refs.map((r) => `/pokemon-species/${r.id}/`));
  const pokemonRecs = await apiRecordAll(refs.map((r) => `/pokemon/${r.id}/`));
  return refs.map((r, i) => {
    const pokemon = pokemonRecs[i];
    return {
      id: r.id,
      name: r.name,
      generation: speciesRecs[i]?.generation?.name ?? "",
      types: [...(pokemon?.types ?? [])]
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((t: any) => t.type.name as string),
      sprite: pokemon?.sprites?.front_default ?? `${BASE}/media/sprites/pokemon/${r.id}.png`,
    };
  });
}

export interface NamedEntry {
  name: string;
  en: string;
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

let typesPromise: Promise<NamedEntry[]> | null = null;

export function getTypes(): Promise<NamedEntry[]> {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await apiRecord("/type/?limit=100");
      const names = (list.results as { name: string }[])
        .map((r) => r.name)
        .filter((n) => !EXCLUDED_TYPES.has(n));
      const recs = await apiRecordAll(names.map((n) => `/type/${n}/`));
      return recs.map((t: any) => ({
        name: t.name as string,
        en: englishName(t.names) ?? t.name,
      }));
    })();
    typesPromise.catch(() => {
      typesPromise = null;
    });
  }
  return typesPromise;
}

let generationsPromise: Promise<NamedEntry[]> | null = null;

export function getGenerations(): Promise<NamedEntry[]> {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await apiRecord("/generation/?limit=100");
      const names = (list.results as { name: string }[]).map((r) => r.name);
      const recs = await apiRecordAll(names.map((n) => `/generation/${n}/`));
      return recs.map((g: any) => ({
        name: g.name as string,
        en: englishName(g.names) ?? g.name,
      }));
    })();
    generationsPromise.catch(() => {
      generationsPromise = null;
    });
  }
  return generationsPromise;
}

let versionGroupsPromise: Promise<Map<string, number>> | null = null;

export function getVersionGroupOrders(): Promise<Map<string, number>> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await apiRecord("/version-group/?limit=100");
      const names = (list.results as { name: string }[]).map((r) => r.name);
      const recs = await apiRecordAll(names.map((n) => `/version-group/${n}/`));
      const map = new Map<string, number>();
      for (const r of recs) if (r) map.set(r.name, r.order);
      return map;
    })();
    versionGroupsPromise.catch(() => {
      versionGroupsPromise = null;
    });
  }
  return versionGroupsPromise;
}

export function englishName(
  names: { name: string; language: { name: string } }[] | undefined | null,
): string | null {
  return names?.find((n) => n.language.name === "en")?.name ?? null;
}
