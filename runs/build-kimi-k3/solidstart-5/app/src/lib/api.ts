// Thin client for the local PokeAPI server. Responses are cached in memory at
// runtime (per process); the API is always treated as a live service.

const cache = new Map<string, Promise<any>>();

export function apiBase(): string {
  if (typeof process !== "undefined" && process.env && process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && (window as any).__API_BASE__) {
    return (window as any).__API_BASE__;
  }
  return "http://localhost:9000";
}

/** Fetch a resource under /api/v2. Returns null for a 404, throws otherwise. */
export function apiFetch(path: string): Promise<any> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(`${apiBase()}/api/v2${path}`).then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API request failed: ${path} (${res.status})`);
      return res.json();
    });
    cache.set(path, p);
    // Allow a retry after a network-level failure.
    p.catch(() => cache.delete(path));
  }
  return p;
}

/** Front sprite for a Pokémon, per the documented media URL pattern. */
export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

/** Fetch many API paths with limited concurrency. */
export async function fetchMany(paths: string[]): Promise<any[]> {
  const out: any[] = new Array(paths.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(24, paths.length) }, async () => {
    while (i < paths.length) {
      const j = i++;
      out[j] = await apiFetch(paths[j]);
    }
  });
  await Promise.all(workers);
  return out;
}
