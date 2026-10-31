// Low-level access to the local PokeAPI server, with an in-memory cache.
// Only ever runs on the server (called from server functions).

export function apiBase(): string {
  return (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '')
}

const cache = new Map<string, Promise<any>>()

/**
 * Fetch a JSON resource from the API. Returns null on 404.
 * Results (including 404s) are cached in memory for the process lifetime.
 */
export function apiFetch(path: string): Promise<any> {
  const url = path.startsWith('http') ? path : `${apiBase()}${path}`
  let cached = cache.get(url)
  if (!cached) {
    cached = fetch(url).then(async (res) => {
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`)
      return res.json()
    })
    cache.set(url, cached)
  }
  return cached
}

/** Fetch a full (unpaginated) list of API resource references. */
export async function apiList(resource: string): Promise<{ name?: string; url: string }[]> {
  const data = await apiFetch(`/api/v2/${resource}/?limit=100000`)
  return data?.results ?? []
}
