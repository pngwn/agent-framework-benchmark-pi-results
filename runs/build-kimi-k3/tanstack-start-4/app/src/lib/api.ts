// Server-only data layer. All data comes from the PokeAPI HTTP server at
// request time; responses are cached in memory for the lifetime of the process.

const apiBase = () => (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const cache = new Map<string, Promise<any>>()

/** Fetch and cache a resource from the API. Path is relative to /api/v2/. */
export function apiGet(path: string): Promise<any> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`${apiBase()}/api/v2/${path}`).then(async (res) => {
      if (res.status === 404) throw new ApiError(404, `Not found: ${path}`)
      if (!res.ok) throw new ApiError(res.status, `API error ${res.status} for ${path}`)
      return res.json()
    })
    cache.set(path, p)
    // Don't cache failures.
    p.catch(() => cache.delete(path))
  }
  return p
}

/** Absolute URL for a front default sprite by Pokémon id. */
export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`
}
