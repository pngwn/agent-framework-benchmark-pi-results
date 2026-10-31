// Low-level access to the PokeAPI server. Responses are cached in memory for
// the lifetime of the process (server) or tab (client); the data is always
// fetched over HTTP at request time, never at build time.

const store = (globalThis.__pokedexApiCache ??= { promises: new Map() })

export function getApiBase() {
  let base
  if (import.meta.server) {
    base = process.env.API_BASE_URL || 'http://localhost:9000'
  } else {
    base = useRuntimeConfig().public.apiBaseUrl || 'http://localhost:9000'
  }
  return String(base).replace(/\/+$/, '')
}

function cached(key, producer) {
  let promise = store.promises.get(key)
  if (!promise) {
    promise = Promise.resolve().then(producer)
    store.promises.set(key, promise)
    // Don't cache rejections forever: a later request may retry.
    promise.catch(() => {
      if (store.promises.get(key) === promise) store.promises.delete(key)
    })
  }
  return promise
}

// path like "/api/v2/pokemon/25/". Throws (with .status) on non-2xx responses.
export function fetchApi(path) {
  const url = `${getApiBase()}${path}`
  return cached(url, async () => {
    const res = await fetch(url)
    if (!res.ok) {
      const err = new Error(`API request failed: ${res.status} ${url}`)
      err.status = res.status
      throw err
    }
    return res.json()
  })
}

// Memoize a derived value (not tied to a URL).
export function memo(key, producer) {
  return cached(`memo:${key}`, producer)
}
