const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const cache = new Map();
const inFlight = new Map();

function absolute(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function api(path) {
  const url = absolute(path);
  if (cache.has(url)) return cache.get(url);
  if (inFlight.has(url)) return inFlight.get(url);

  const request = fetch(url, { headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) {
        const error = new Error(`API request failed (${response.status}): ${url}`);
        error.status = response.status;
        throw error;
      }
      const json = await response.json();
      cache.set(url, json);
      return json;
    })
    .finally(() => inFlight.delete(url));

  inFlight.set(url, request);
  return request;
}

export async function apiOrNull(path) {
  try {
    return await api(path);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function idFromUrl(url) {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function humanize(value) {
  return String(value ?? '')
    .split('-')
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function englishName(resource, fallback = resource?.name) {
  const entry = resource?.names?.find((item) => item.language?.name === 'en');
  return entry?.name ?? humanize(fallback);
}

export function latestEnglishFlavor(resource) {
  const entries = (resource?.flavor_text_entries ?? []).filter(
    (entry) => entry.language?.name === 'en',
  );
  const latest = entries.at(-1);
  return latest ? String(latest.flavor_text).replace(/\s+/g, ' ').trim() : null;
}

export function pokemonId(ref) {
  return idFromUrl(ref?.url) ?? (Number.isFinite(ref?.id) ? ref.id : null);
}

export function paddedDex(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export { API_BASE };
