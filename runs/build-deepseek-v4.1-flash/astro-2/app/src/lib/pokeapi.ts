export const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

const cache = new Map<string, Promise<any>>();

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/api/v2/')) return `${API_BASE}${path}`;
  const clean = path.replace(/^\/+/, '');
  return `${API_BASE}/api/v2/${clean}${clean.includes('?') ? '' : clean.endsWith('/') ? '' : '/'}`;
}

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url.replace(/^\/+/, '')}`;
}

export function spriteUrl(id: number | string): string {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

export async function getJson(path: string): Promise<any> {
  const url = apiUrl(path);
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url, { headers: { accept: 'application/json' } }).then(async (res) => {
      if (res.status === 404) throw new NotFoundError(url);
      if (!res.ok) throw new Error(`API request failed (${res.status}): ${url}`);
      return res.json();
    });
    cache.set(url, pending);
    pending.catch(() => {
      if (cache.get(url) === pending) cache.delete(url);
    });
  }
  return pending;
}

export async function getList(resource: string): Promise<any[]> {
  const data = await getJson(`/${resource}/?limit=100000`);
  return Array.isArray(data.results) ? data.results : [];
}

export function idFromUrl(url: string): number {
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

export function humanize(name: string): string {
  if (!name) return '';
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishName(resource: any, fallbackName = ''): string {
  const entry = Array.isArray(resource?.names)
    ? resource.names.find((item: any) => item?.language?.name === 'en')
    : null;
  return entry?.name || humanize(fallbackName || resource?.name || '');
}

export function englishGenus(species: any): string {
  const entry = Array.isArray(species?.genera)
    ? species.genera.find((item: any) => item?.language?.name === 'en')
    : null;
  return entry?.genus || '';
}

export function latestEnglishFlavorText(entries: any[] | undefined): string {
  if (!Array.isArray(entries)) return '';
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.language?.name === 'en' && entry.flavor_text) {
      return String(entry.flavor_text).replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

export function englishShortEffect(entries: any[] | undefined): string {
  if (!Array.isArray(entries)) return '';
  const entry = entries.find((item: any) => item?.language?.name === 'en' && item.short_effect);
  return entry ? String(entry.short_effect).replace(/\s+/g, ' ').trim() : '';
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function formatHeight(decimetres: number | null | undefined): string {
  return decimetres == null ? '—' : `${(decimetres / 10).toFixed(1)} m`;
}

export function formatWeight(hectograms: number | null | undefined): string {
  return hectograms == null ? '—' : `${(hectograms / 10).toFixed(1)} kg`;
}

export function formatMissing(value: any): string {
  return value == null ? '—' : String(value);
}

export function dexNumber(id: number | string): string {
  return `#${String(id).padStart(4, '0')}`;
}
