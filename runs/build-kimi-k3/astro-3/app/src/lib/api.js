// Runtime access to the PokeAPI server. Everything is fetched over HTTP at
// request time; responses are cached in memory for the life of the process.

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

export const apiBase = API_BASE_URL;

const cache = new Map();

export function fetchJson(pathOrUrl) {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${API_BASE_URL}/api/v2${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  const hit = cache.get(url);
  if (hit) return hit;
  const promise = fetch(url).then(async (res) => {
    if (res.status === 404) {
      const err = new Error(`Not found: ${url}`);
      err.status = 404;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`API error ${res.status} for ${url}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  });
  // Don't cache failures forever, so a transient error can be retried.
  promise.catch(() => cache.delete(url));
  cache.set(url, promise);
  return promise;
}

// Run fn over items with bounded concurrency, preserving order.
export async function mapAll(items, fn, concurrency = 32) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export const spriteFor = (id) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
