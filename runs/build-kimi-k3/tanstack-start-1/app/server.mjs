#!/usr/bin/env node
// Production server: serves the static client build from dist/client and falls
// back to the TanStack Start SSR server build (dist/server/server.js) for
// everything else. Listens on $PORT (default 3000).

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.join(ROOT, 'dist', 'client')
const PORT = Number(process.env.PORT ?? 3000)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

const serverBuild = (await import(path.join(ROOT, 'dist', 'server', 'server.js'))).default

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const file = path.resolve(CLIENT_DIR, `.${pathname}`)
  if (!file.startsWith(CLIENT_DIR + path.sep)) return false
  let stat
  try {
    stat = fs.statSync(file)
  } catch {
    return false
  }
  if (!stat.isFile()) return false
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
  if (req.method === 'HEAD') res.end()
  else fs.createReadStream(file).pipe(res)
  return true
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    if (serveStatic(req, res, decodeURIComponent(url.pathname))) return

    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue
      headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
    })
    const webRes = await serverBuild.fetch(webReq)

    const responseHeaders = {}
    webRes.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    res.writeHead(webRes.status, responseHeaders)
    if (webRes.body) {
      Readable.fromWeb(webRes.body).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
})

// No host: binds to all interfaces (IPv4 and IPv6), like the API server.
server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT}`)
})
