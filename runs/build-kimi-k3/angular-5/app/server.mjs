#!/usr/bin/env node
// Serves the production build (dist/pokedex/browser) on $PORT.
// Injects the API base URL ($API_BASE_URL) into index.html so the browser
// knows where to reach the PokeAPI server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, 'dist', 'pokedex', 'browser');
const PORT = Number(process.env.PORT ?? 3000);
const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error(`No build found at ${ROOT}. Run \`npm run build\` first.`);
  process.exit(1);
}

const rawIndex = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const indexHtml = rawIndex.replace(
  '<!--api-config-->',
  `<script>window.__API_BASE_URL__=${JSON.stringify(API_BASE_URL)};</script>`,
);

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  const file = path.normalize(path.join(ROOT, pathname));
  if (file.startsWith(ROOT) && !pathname.endsWith('/') && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const body = fs.readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
    return;
  }
  // SPA fallback: every other URL is handled by the client-side router.
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(indexHtml);
});

server.listen(PORT, () => {
  console.log(`Pokédex app listening on http://localhost:${PORT} (API: ${API_BASE_URL})`);
});
