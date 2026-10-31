#!/usr/bin/env node
// Production server: serves the Vite build's static assets and server-renders every
// page, fetching data from the live PokeAPI at request time.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchRoute } from '../src/shared/router.js';
import { renderPage } from '../src/server/pages.js';
import { layout } from '../src/server/layout.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 3000);

function loadAssets() {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(DIST, '.vite', 'manifest.json'), 'utf8'));
    const entry = manifest['index.html'];
    if (entry) {
      return { js: `/${entry.file}`, css: (entry.css ?? []).map((f) => `/${f}`) };
    }
  } catch {
    // fall through to dev mode
  }
  // Dev mode: serve source files directly (no build).
  return { js: '/src/client/main.js', css: ['/src/client/styles.css'] };
}

const assets = loadAssets();

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serveStatic(res, filePath, { immutable = false } = {}) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ROOT + path.sep)) {
    res.writeHead(404).end('Not Found');
    return;
  }
  fs.stat(resolved, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404).end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    fs.createReadStream(resolved).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname.startsWith('/assets/')) {
    return serveStatic(res, path.join(DIST, url.pathname), { immutable: true });
  }
  if (url.pathname.startsWith('/src/')) {
    return serveStatic(res, path.join(ROOT, url.pathname));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  try {
    const route = matchRoute(url.pathname);
    const page = await renderPage(route, url.searchParams);
    const body = layout({ title: page.title, main: page.main, assets });
    res.writeHead(page.status ?? 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT}`);
});
