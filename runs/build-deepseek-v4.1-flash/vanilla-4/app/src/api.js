const API_BASE = String(__API_BASE_URL__ || 'http://localhost:9000').replace(/\/+$/, '');
const cache = new Map();

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

function resolveUrl(path) {
  const value = String(path);
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${API_BASE}${value}`;
  return `${API_BASE}/api/v2/${value.replace(/^\/+/, '')}`;
}

export async function api(path) {
  const url = resolveUrl(path);
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url).then(async (response) => {
      if (response.status === 404) throw new NotFoundError(`Not found: ${url}`);
      if (!response.ok) throw new Error(`API request failed (${response.status}): ${url}`);
      return response.json();
    });
    cache.set(url, pending);
    pending.catch(() => cache.delete(url));
  }
  return pending;
}

export function mediaUrl(path) {
  if (!path) return null;
  const value = String(path);
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE}${value.startsWith('/') ? '' : '/'}${value}`;
}

export function spriteUrl(pokemonId) {
  return mediaUrl(`/media/sprites/pokemon/${pokemonId}.png`);
}

export async function mapLimit(items, limit, mapper) {
  const input = [...items];
  const results = new Array(input.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= input.length) return;
      results[index] = await mapper(input[index], index);
    }
  }

  const workers = Math.min(Math.max(1, limit), Math.max(1, input.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
