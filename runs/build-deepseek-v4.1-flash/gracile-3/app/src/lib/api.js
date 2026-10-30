const requestCache = new Map();
const aggregateCache = new Map();

export class ApiError extends Error {
  constructor(status, url) {
    super(`API request failed (${status}) for ${url}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function normalizeBase(base) {
  return String(base || '').replace(/\/+$/, '');
}

function apiUrl(base, pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const clean = String(pathOrUrl).replace(/^\/+/, '').replace(/^api\/v2\//, '');
  return `${normalizeBase(base)}/api/v2/${clean}`;
}

export function apiGet(base, pathOrUrl) {
  const url = apiUrl(base, pathOrUrl);
  if (requestCache.has(url)) return requestCache.get(url);
  const promise = fetch(url, { headers: { Accept: 'application/json' } }).then(async (response) => {
    if (!response.ok) throw new ApiError(response.status, url);
    return response.json();
  });
  requestCache.set(url, promise);
  promise.catch(() => requestCache.delete(url));
  return promise;
}

export function cachedAggregate(key, factory) {
  if (aggregateCache.has(key)) return aggregateCache.get(key);
  const promise = factory();
  aggregateCache.set(key, promise);
  promise.catch(() => aggregateCache.delete(key));
  return promise;
}
