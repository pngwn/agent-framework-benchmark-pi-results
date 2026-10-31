// Thin wrapper around the PokeAPI server. Responses are cached in memory for
// the lifetime of the page; all data is fetched live over HTTP at request time.

const BASE = (window.__API_BASE_URL__ || 'http://localhost:9000').replace(/\/$/, '');

const cache = new Map();

export function apiBase() {
  return BASE;
}

export function mediaUrl(path) {
  return `${BASE}/media/${path}`;
}

export async function fetchJson(url) {
  const absolute = url.startsWith('http://') || url.startsWith('https://') ? url : `${BASE}${url}`;
  const cached = cache.get(absolute);
  if (cached) return cached;
  const promise = fetch(absolute).then(async (res) => {
    if (!res.ok) {
      const err = new Error(`Request failed: ${res.status} ${absolute}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  });
  cache.set(absolute, promise);
  try {
    return await promise;
  } catch (err) {
    cache.delete(absolute);
    throw err;
  }
}
