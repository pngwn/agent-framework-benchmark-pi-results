// Server-side access to the local PokeAPI server, with a simple in-memory
// runtime cache (the API is a live service; caching per process is allowed).

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map();

function normalizeUrl(pathOrUrl) {
  if (/^https?:\/\//.test(pathOrUrl)) {
    const url = new URL(pathOrUrl);
    return `${API_BASE_URL}${url.pathname}${url.search}`;
  }
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (path.startsWith('/api/v2/') || path.startsWith('/media/')) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/api/v2${path}`;
}

/**
 * Fetches and parses a JSON document from the API.
 * Returns `null` when the API answers 404. Results are cached in memory.
 */
export async function apiGet(pathOrUrl) {
  const url = normalizeUrl(pathOrUrl);
  let promise = cache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`API request failed: ${response.status} ${url}`);
        return response.json();
      })
      .catch((error) => {
        cache.delete(url);
        throw error;
      });
    cache.set(url, promise);
  }
  return promise;
}

/** Extracts the numeric id from a resource URL (`…/pokemon/25/` → 25). */
export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : NaN;
}

/** Absolute URL for a media path served by the API (`/media/…`). */
export function mediaUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//.test(pathOrUrl)) return `${API_BASE_URL}${new URL(pathOrUrl).pathname}`;
  return `${API_BASE_URL}${pathOrUrl}`;
}

/** Front sprite URL pattern sanctioned by the spec. */
export function spriteUrl(pokemonId) {
  return `${API_BASE_URL}/media/sprites/pokemon/${pokemonId}.png`;
}
