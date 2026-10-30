#!/usr/bin/env node
// Serves the Angular production build and injects the runtime API base URL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

function findBrowserDir() {
  const candidates = [
    path.join(ROOT, 'dist/app/browser'),
    path.join(ROOT, 'dist/app'),
    path.join(ROOT, 'dist'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  throw new Error('No production build found. Run `npm run build` first.');
}
const BROWSER_DIR = findBrowserDir();
const INDEX_FILE = path.join(BROWSER_DIR, 'index.html');

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
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function renderIndex() {
  return fs
    .readFileSync(INDEX_FILE, 'utf8')
    .split('__API_BASE_URL__')
    .join(API_BASE_URL);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end('Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  const relative = pathname.replace(/^\/+/, '');
  const file = path.resolve(BROWSER_DIR, relative);
  if (relative && file.startsWith(BROWSER_DIR + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
    return;
  }

  // SPA fallback for application routes such as /pokemon/pikachu.
  const body = renderIndex();
  res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') return res.end();
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT} (API: ${API_BASE_URL})`);
});
