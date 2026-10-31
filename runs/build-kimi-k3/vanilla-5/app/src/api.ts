declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

export const API_BASE = (window.__API_BASE_URL__ ?? 'http://localhost:9000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, url: string) {
    super(`API request failed: ${status} ${url}`);
    this.status = status;
  }
}

function toUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const [p, q] = pathOrUrl.split('?');
  const clean = p.replace(/^\/+|\/+$/g, '');
  return `${API_BASE}/api/v2/${clean}/${q ? `?${q}` : ''}`;
}

// In-memory runtime cache of API responses. The API is always queried live;
// nothing is embedded at build time.
const cache = new Map<string, Promise<any>>();

export function apiJson(pathOrUrl: string): Promise<any> {
  const url = toUrl(pathOrUrl);
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new ApiError(r.status, url);
      return r.json();
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  return p;
}

export const isNotFound = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

export const spriteUrl = (pokemonId: number): string => `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;
