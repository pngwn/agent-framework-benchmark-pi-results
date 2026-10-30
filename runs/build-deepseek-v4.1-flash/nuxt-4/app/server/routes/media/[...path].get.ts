const mediaCache = new Map<string, { body: Buffer; contentType: string }>()

export default defineEventHandler(async (event) => {
  const requestedPath = getRouterParam(event, 'path') ?? ''
  if (!requestedPath) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const encodedPath = requestedPath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  const base = (process.env.API_BASE_URL || 'http://localhost:9000').replace(
    /\/+$/,
    '',
  )
  const target = `${base}/media/${encodedPath}`

  const cached = mediaCache.get(target)
  if (cached) {
    setResponseHeader(event, 'Content-Type', cached.contentType)
    setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
    return cached.body
  }

  const response = await fetch(target, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) {
    await response.body?.cancel()
    throw createError({ statusCode: response.status, statusMessage: 'Not Found' })
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  const body = Buffer.from(await response.arrayBuffer())
  if (mediaCache.size < 1200) mediaCache.set(target, { body, contentType })

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return body
})
