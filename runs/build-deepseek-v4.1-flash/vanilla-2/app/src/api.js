// Runtime configuration is injected by the production server. The fallback keeps
// local development and a plain `vite build` useful without any build-time data.
export const API_BASE_URL = String(
  globalThis.__API_BASE_URL__ || 'http://localhost:9000',
).replace(/\/+$/, '');

const responseCache = new Map();

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function resolveApiUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/api/v2/')) return `${API_BASE_URL}${pathOrUrl}`;
  return `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
}

export function api(pathOrUrl) {
  const url = resolveApiUrl(pathOrUrl);
  if (responseCache.has(url)) return responseCache.get(url);

  const request = fetch(url, { headers: { Accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) {
        throw new ApiError(`Request failed (${response.status}): ${url}`, response.status);
      }
      return response.json();
    })
    .catch((error) => {
      // Don't cache failures so a temporary problem can be retried.
      responseCache.delete(url);
      throw error;
    });

  responseCache.set(url, request);
  return request;
}

export function extractId(url) {
  const match = String(url || '').match(/\/(\d+)\/$/);
  return match ? Number(match[1]) : null;
}

export function isAlternateFormId(id) {
  return Number(id) >= 10000;
}

export function humanize(name) {
  return String(name || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishEntry(entries) {
  if (!Array.isArray(entries)) return null;
  return entries.find((entry) => entry?.language?.name === 'en') || null;
}

export function englishName(entries, fallback) {
  const entry = englishEntry(entries);
  return entry?.name || humanize(fallback);
}

export function latestEnglishFlavor(entries) {
  if (!Array.isArray(entries)) return '';
  const english = entries.filter((entry) => entry?.language?.name === 'en');
  if (!english.length) return '';
  return String(english[english.length - 1].flavor_text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDex(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function spriteUrl(id) {
  return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export async function mapLimit(items, limit, mapper) {
  const input = [...items];
  const output = new Array(input.length);
  let cursor = 0;

  async function worker() {
    while (cursor < input.length) {
      const index = cursor++;
      output[index] = await mapper(input[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, input.length) }, () => worker());
  await Promise.all(workers);
  return output;
}
