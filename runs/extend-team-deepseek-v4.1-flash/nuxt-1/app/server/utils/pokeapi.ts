// Thin client for the PokeAPI server, with a short-lived in-memory cache.
// All data is fetched at request time; nothing is read or embedded at build time.

const TTL_MS = 60_000;
const cache = new Map<string, { expires: number; value: Promise<any> }>();

export function apiBase(): string {
  return (useRuntimeConfig().public.apiBase as string).replace(/\/$/, '');
}

export class NotFound extends Error {}

/** GET an API path like `pokemon/25` (or an absolute API URL). Throws NotFound on 404. */
export function api<T = any>(pathOrUrl: string): Promise<T> {
  const base = apiBase();
  const url = /^https?:/.test(pathOrUrl)
    ? pathOrUrl
    : `${base}/api/v2/${pathOrUrl.replace(/^\/+/, '').replace(/\/?$/, '/')}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;
  const value = $fetch<T>(url).catch((err: any) => {
    cache.delete(url);
    if (err?.response?.status === 404 || err?.statusCode === 404) throw new NotFound(url);
    throw err;
  });
  cache.set(url, { expires: now + TTL_MS, value });
  return value;
}

/** Full, unpaginated list for a resource. */
export async function apiList(resource: string): Promise<{ name: string; url: string }[]> {
  const page = await api<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000&offset=0`);
  return page.results;
}

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');

export const englishName = (r: { name: string; names?: { name: string; language: { name: string } }[] }): string =>
  r.names?.find((n) => n.language.name === 'en')?.name ?? humanize(r.name);

export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`;

/** Wrap a handler so NotFound turns into a 404 response. */
export function withNotFound<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    if (err instanceof NotFound) throw createError({ statusCode: 404, statusMessage: 'Not found' });
    throw err;
  });
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export interface TypeInfo {
  name: string;
  label: string;
}

/** The 18 types in API order, with their full records. */
export async function allTypes(): Promise<any[]> {
  const list = (await apiList('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  return Promise.all(list.map((t) => api(t.url)));
}

export async function typeLabels(): Promise<Record<string, string>> {
  const types = await allTypes();
  return Object.fromEntries(types.map((t) => [t.name, englishName(t)]));
}

/** Map of species ID -> species name, for every species. */
export async function speciesNames(): Promise<Map<number, string>> {
  const list = await apiList('pokemon-species');
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

export interface Card {
  id: number;
  name: string;
  sprite: string;
  types?: string[];
  hidden?: boolean;
}

/**
 * Turn Pokémon references into species cards, leaving out alternate forms,
 * de-duplicated and ordered by dex number.
 */
export async function cardsFor(refs: { name: string; url: string; hidden?: boolean }[]): Promise<Card[]> {
  const names = await speciesNames();
  const byId = new Map<number, Card>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    const name = names.get(id);
    if (!name || id >= 10000 || byId.has(id)) continue;
    const card: Card = { id, name, sprite: spriteUrl(id) };
    if (ref.hidden) card.hidden = true;
    byId.set(id, card);
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
