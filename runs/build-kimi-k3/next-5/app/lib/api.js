// Server-side access to the local PokeAPI server. All data is fetched over HTTP at
// request time; responses are cached in memory for the lifetime of the process.

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const store = (globalThis.__pokedexStore ??= { cache: new Map() });

/**
 * Fetch a JSON document from the API. `path` is the path portion of an API URL
 * (e.g. `/api/v2/pokemon/25/`). Returns `null` when the API responds 404.
 */
export function apiJson(path) {
  if (store.cache.has(path)) return store.cache.get(path);
  const promise = fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' })
    .then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PokeAPI request failed: ${path} -> ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      store.cache.delete(path);
      throw err;
    });
  store.cache.set(path, promise);
  return promise;
}

/** Path portion of a PokeAPI URL from a response (absolute or relative). */
export function apiPath(url) {
  return new URL(url, API_BASE_URL).pathname;
}

/** Absolute URL for an API path (used for media URLs handed to the browser). */
export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
