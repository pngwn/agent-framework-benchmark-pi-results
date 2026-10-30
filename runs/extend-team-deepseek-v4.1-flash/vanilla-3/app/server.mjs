#!/usr/bin/env node
// Production server: serves the Vite build in ./dist with an SPA fallback, and injects the
// API origin (API_BASE_URL) into index.html at request time.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

const indexHtml = fs
  .readFileSync(path.join(DIST, 'index.html'), 'utf8')
  .replace('__API_BASE_URL__', JSON.stringify(API_BASE_URL).slice(1, -1).replace(/</g, '\\u003c'));

// Paths the client router knows about; anything else gets a 404 status (same app shell).
const ROUTES = [/^\/$/, /^\/team\/?$/, /^\/types\/?$/, /^\/types\/[^/]+\/?$/, /^\/pokemon\/[^/]+\/?$/, /^\/moves\/[^/]+\/?$/, /^\/abilities\/[^/]+\/?$/];

function sendIndex(res, status) {
  res.writeHead(status, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
  res.end(indexHtml);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    pathname = '/';
  }

  if (pathname !== '/' && pathname !== '/index.html') {
    const file = path.resolve(DIST, '.' + pathname);
    if (file.startsWith(DIST + path.sep)) {
      try {
        const stat = await fsp.stat(file);
        if (stat.isFile()) {
          const immutable = pathname.startsWith('/assets/');
          res.writeHead(200, {
            'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
            'Content-Length': stat.size,
            'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
          });
          if (req.method === 'HEAD') return res.end();
          return fs.createReadStream(file).pipe(res);
        }
      } catch {}
    }
  }

  sendIndex(res, ROUTES.some((r) => r.test(pathname)) || pathname === '/index.html' ? 200 : 404);
});

server.listen(PORT, () => {
  console.log(`Pokédex listening on http://localhost:${PORT} (API ${API_BASE_URL})`);
});
