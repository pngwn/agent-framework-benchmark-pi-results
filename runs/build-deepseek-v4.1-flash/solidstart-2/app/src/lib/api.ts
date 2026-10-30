const DEFAULT_API_BASE = "http://localhost:9000";

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="api-base"]');
    return (meta?.content || window.__API_BASE_URL__ || DEFAULT_API_BASE).replace(/\/$/, "");
  }
  return (process.env.API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, "");
}

export function apiUrl(pathOrUrl: string): string {
  const base = getApiBase();
  const url = new URL(pathOrUrl, `${base}/`);
  return `${base}${url.pathname}${url.search}`;
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? 0);
}

const responseCache = new Map<string, Promise<unknown>>();

async function request(pathOrUrl: string, optional: boolean): Promise<unknown | null> {
  const url = apiUrl(pathOrUrl);
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (response.status === 404) {
    if (optional) return null;
    throw new Error(`API request failed: 404 ${url}`);
  }
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${url}`);
  }
  return response.json();
}

function cached(pathOrUrl: string, optional: boolean): Promise<unknown | null> {
  const url = new URL(pathOrUrl, `${getApiBase()}/`);
  const key = `${url.pathname}${url.search}`;
  const existing = responseCache.get(key);
  if (existing) return existing;
  const pending = request(key, optional).catch((error) => {
    responseCache.delete(key);
    throw error;
  });
  responseCache.set(key, pending);
  return pending;
}

export async function getJson<T>(pathOrUrl: string): Promise<T> {
  return (await cached(pathOrUrl, false)) as T;
}

export async function getJsonOrNull<T>(pathOrUrl: string): Promise<T | null> {
  return (await cached(pathOrUrl, true)) as T | null;
}
