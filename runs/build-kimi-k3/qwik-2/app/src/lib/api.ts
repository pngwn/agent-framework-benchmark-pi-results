// Server-side access to the PokeAPI-compatible API server. Responses are cached
// in memory for the lifetime of the process.

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const cache = new Map<string, Promise<any>>();

export function api<T = any>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(`${API_BASE}/api/v2${path}`).then((res) => {
      if (!res.ok) throw new ApiError(res.status, `API ${path}: HTTP ${res.status}`);
      return res.json();
    });
    cache.set(path, p);
  }
  return p as Promise<T>;
}

/** Fetch a resource by name/id, returning null when the API doesn't have it. */
export async function apiOrNull<T = any>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Front sprite for a Pokémon id, following the documented media URL pattern. */
export function spriteUrl(pokemonId: number): string {
  return `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;
}
