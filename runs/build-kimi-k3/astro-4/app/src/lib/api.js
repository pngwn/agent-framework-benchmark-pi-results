// Thin HTTP client for the PokeAPI server, with an in-memory runtime cache.
// All app data comes from the API at request time; nothing is read at build time.

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

export class NotFound extends Error {
  constructor(path) {
    super(`Not found: ${path}`);
    this.name = 'NotFound';
  }
}

const cache = new Map();

export function apiUrl(path) {
  return `${API_BASE_URL}/api/v2/${path}`;
}

export function mediaUrl(path) {
  return `${API_BASE_URL}/media/${path}`;
}

export function spriteUrl(pokemonId) {
  return mediaUrl(`sprites/pokemon/${pokemonId}.png`);
}

export function apiFetch(path) {
  const url = apiUrl(path);
  if (!cache.has(url)) {
    const pending = fetch(url).then(async (res) => {
      if (res.status === 404) throw new NotFound(path);
      if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
      return res.json();
    });
    cache.set(url, pending);
    // Don't cache rejections (other than 404s): transient failures should be retryable.
    pending.catch((err) => {
      if (!(err instanceof NotFound)) cache.delete(url);
    });
  }
  return cache.get(url);
}
